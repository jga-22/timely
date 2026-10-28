import { defineStore } from 'pinia'
import type { Activity, Ambition, Category, Habit, HabitPeriod, PlannerState } from '~/types/planner'
import {
  DESIGN_COLORS,
  applyActivityCells,
  cleanAlsoCategoryIds,
  createEmptySlots,
  createHaradaSeed,
  createOnboardingState,
  getActiveTemplate,
  getTemplateById,
  nextTemplateColor,
  rangeConflicts,
  validateActivityFields,
  type ActivityFieldErrors,
  type HourConflict,
  type PaintMode
} from '~/utils/planner'
import { shortCodeFor } from '~/utils/onboarding'
import {
  PRESET_ROLES,
  ROLE_LABELS,
  buildPresetSlots,
  getPreset,
  presetTemplateFields,
  type PresetRole,
  type RoleMap
} from '~/utils/presets'

/** Sorts by order and renumbers from 1, so reorders and removals leave no gaps */
const numberCategories = (categories: Category[]): Category[] =>
  [...categories].sort((a, b) => a.order - b.order).map((category, index) => ({ ...category, order: index + 1 }))

/** The life area a preset's activity goes to: Physical for sleep and exercise, Professional for work, else the first area (FR-TPL-8) */
const presetCategoryId = (categories: Category[], role: PresetRole): string | undefined => {
  const byId = role === 'work' ? 'professionnelle' : 'physique'
  const byName = role === 'work' ? /professional/i : /physical/i
  const match = categories.find(category => category.id === byId) ?? categories.find(category => byName.test(category.name))

  return (match ?? [...categories].sort((a, b) => a.order - b.order)[0])?.id
}

export const usePlannerStore = defineStore('planner', {
  /** The empty onboarding state, so server and first client render match for a new user (FR-ONB-2) */
  state: (): PlannerState => createOnboardingState(),
  getters: {
    activeTemplate: state => getActiveTemplate(state),
  },
  actions: {
    hydrate(state: PlannerState | null) {
      if (state) {
        this.replaceState(state)
        this.ensureActiveTemplate()
      }
    },
    /** Replaces the whole state in one step, so nothing of the previous state (a journal, a stale onboarding flag) carries over */
    replaceState(next: PlannerState) {
      this.$patch(current => {
        Object.assign(current, next)
        if (next.onboarding === undefined) delete current.onboarding
      })
    },
    /** Ends the first-run onboarding without creating data (FR-ONB-3, Start empty) */
    finishOnboarding() {
      this.onboarding = 'done'
    },
    ensureActiveTemplate() {
      const template = this.activeTemplate
      this.settings.activeTemplateId = template?.id ?? null
    },
    selectTemplate(templateId: string) {
      const template = getTemplateById(this.$state, templateId)

      if (!template) {
        return
      }

      this.settings.activeTemplateId = template.id
    },
    createTemplate() {
      const source = this.activeTemplate
      const templateId = `template-${Date.now()}`
      const granularity = source?.granularityMinutes ?? 60

      this.templates.unshift({
        id: templateId,
        name: `New week type ${this.templates.length + 1}`,
        description: 'Empty week type — paint your ideal week.',
        granularityMinutes: granularity,
        color: source?.color,
        slots: createEmptySlots(granularity)
      })
      this.settings.activeTemplateId = templateId
    },
    /** Copies a week type's hours into a new one with the next unused colour, and makes it active (FR-TPL-6). Returns its id, or null when the source is unknown */
    duplicateTemplate(sourceId: string, name: string): string | null {
      const source = getTemplateById(this.$state, sourceId)

      if (!source) {
        return null
      }

      const templateId = `template-${Date.now()}`

      this.templates.unshift({
        id: templateId,
        name: name.trim() || `Copy of ${source.name}`,
        granularityMinutes: source.granularityMinutes,
        color: nextTemplateColor(this.templates) ?? source.color,
        slots: [...source.slots]
      })
      this.settings.activeTemplateId = templateId

      return templateId
    },
    /**
     * Creates a week type from a preset (FR-TPL-8) and makes it active. A role set to 'create' gets a new activity, unless one
     * already has its name (then that one is used) or its short code is taken (then the role is left empty). Returns the id, or null for an unknown preset
     */
    createTemplateFromPreset(name: string, presetId: string, roleMap: Partial<Record<PresetRole, string | 'create' | null>>, keepHabits: boolean): string | null {
      const preset = getPreset(presetId)

      if (!preset) {
        return null
      }

      const resolved: RoleMap = {}

      PRESET_ROLES.forEach((role, index) => {
        const choice = roleMap[role]
        resolved[role] = choice === 'create' ? this.createRoleActivity(role, index) : (choice ?? null)
      })

      // Built before the new week type exists, so the habit hours come from the week type Goals reads now
      const slots = buildPresetSlots(this.$state, preset, resolved, keepHabits)
      const templateId = `template-${Date.now()}`

      this.templates.unshift({
        id: templateId,
        name: name.trim() || preset.name,
        color: nextTemplateColor(this.templates) ?? DESIGN_COLORS[0]!.bg,
        slots,
        ...presetTemplateFields(preset)
      })
      this.settings.activeTemplateId = templateId

      return templateId
    },
    /** An activity for a preset role: the existing one with the same name, else a new one. Null when it cannot be created */
    createRoleActivity(role: PresetRole, index: number): string | null {
      const label = ROLE_LABELS[role]
      const existing = this.activities.find(activity => activity.name.trim().toLowerCase() === label.toLowerCase())

      if (existing) {
        return existing.id
      }

      const categoryId = presetCategoryId(this.categories, role)
      const shortCode = shortCodeFor(label)

      if (!categoryId || Object.keys(validateActivityFields(this.$state, { name: label, shortCode, categoryId })).length) {
        return null
      }

      const usedColors = new Set(this.activities.map(activity => activity.color.toLowerCase()))
      const id = `activity-${Date.now()}-${index}`

      this.activities.push({
        id,
        name: label,
        shortCode,
        categoryId,
        color: DESIGN_COLORS.find(color => !usedColors.has(color.bg.toLowerCase()))?.bg ?? DESIGN_COLORS[0]!.bg
      })

      return id
    },
    /** Sets or clears a week type's time-off mark (FR-TPL-8). Goals does not compare against time off */
    setTemplateKind(templateId: string, kind: 'break' | undefined) {
      const template = getTemplateById(this.$state, templateId)

      if (!template) return

      if (kind) template.kind = kind
      else delete template.kind
    },
    deleteTemplate(templateId: string) {
      const templateIndex = this.templates.findIndex(template => template.id === templateId)

      if (templateIndex === -1) {
        return false
      }

      if (this.templates.length <= 1) {
        return false
      }

      const nextTemplates = this.templates.filter(template => template.id !== templateId)
      const nextAppliedWeeks = this.appliedWeeks.filter(week => week.templateId !== templateId)
      const fallbackTemplateId = nextTemplates[0]?.id ?? null

      this.$patch({
        templates: nextTemplates,
        appliedWeeks: nextAppliedWeeks,
        settings: {
          ...this.settings,
          activeTemplateId: this.settings.activeTemplateId === templateId
            ? fallbackTemplateId
            : this.settings.activeTemplateId
        }
      })

      return true
    },
    /** Renames a template; a blank name keeps the old one */
    renameTemplate(templateId: string, name: string) {
      const template = getTemplateById(this.$state, templateId)
      const trimmed = name.trim()

      if (template && trimmed) template.name = trimmed
    },
    /** Removes a secondary category from an activity: its hours stop counting there. The primary category is not touched */
    removeAlsoCategory(activityId: string, categoryId: string): boolean {
      const activity = this.activities.find(item => item.id === activityId)

      if (!activity?.alsoCategoryIds?.includes(categoryId)) {
        return false
      }

      activity.alsoCategoryIds = activity.alsoCategoryIds.filter(id => id !== categoryId)
      return true
    },
    setTemplateColor(templateId: string, color: string) {
      const template = getTemplateById(this.$state, templateId)
      if (template) template.color = color
    },
    renameActiveTemplate(name: string) {
      const template = this.activeTemplate

      if (!template) {
        return
      }

      template.name = name.trim() || template.name
    },
    /**
     * Paints one activity's hours in one hourly template (FR-PLAN-17, 18). `add` takes hours held by other
     * activities only when `reassign` is true; otherwise nothing changes and the conflicts are returned for confirmation.
     * Returns [] when the change was applied.
     */
    setActivitySlots(templateId: string, activityId: string, cells: number[], mode: PaintMode, reassign = false): HourConflict[] {
      const template = getTemplateById(this.$state, templateId)

      if (!template || template.granularityMinutes !== 60 || !this.activities.some(activity => activity.id === activityId)) {
        return []
      }

      const conflicts = mode === 'add' ? rangeConflicts(template.slots, cells, activityId) : []

      if (conflicts.length && !reassign) {
        return conflicts
      }

      template.slots = applyActivityCells(template.slots, cells, activityId, mode)
      return []
    },
    /**
     * Paints cells with one activity, replacing whatever other activities hold them (FR-PLAN-17). With a null activity the cells
     * are erased. Returns the hours taken from each holder, for the undo notice. Nothing is checked or confirmed first.
     */
    paintCells(templateId: string, cells: number[], activityId: string | null): HourConflict[] {
      const template = getTemplateById(this.$state, templateId)

      if (!template || template.granularityMinutes !== 60) return []
      if (activityId && !this.activities.some(activity => activity.id === activityId)) return []

      const taken = rangeConflicts(template.slots, cells, activityId ?? '')
      template.slots = template.slots.map((holder, index) => (cells.includes(index) ? (activityId ?? '') : holder))
      return taken
    },
    /** Puts back a template's slots as they were before the last paint (single-step undo) */
    restoreSlots(templateId: string, slots: string[]) {
      const template = getTemplateById(this.$state, templateId)

      if (template && template.slots.length === slots.length) template.slots = [...slots]
    },
    setProjectionYears(years: number) {
      this.settings.projectionDefaults.years = years
    },
    /** Adds a category at the end of the list. Returns its id, or null when the name is blank */
    addCategory(name: string, color: string): string | null {
      const trimmedName = name.trim()

      if (!trimmedName) {
        return null
      }

      const id = `category-${Date.now()}`

      this.categories.push({
        id,
        name: trimmedName,
        color,
        order: Math.max(0, ...this.categories.map(category => category.order)) + 1
      })

      return id
    },
    updateCategory(categoryId: string, changes: Partial<Pick<Category, 'name' | 'goal5y' | 'target1y' | 'targetTbd'>>) {
      const category = this.categories.find(item => item.id === categoryId)
      if (category) Object.assign(category, changes)
    },
    setCategoryColor(categoryId: string, color: string) {
      const category = this.categories.find(item => item.id === categoryId)

      if (!category) {
        return
      }

      // A6: only activities still on the old category colour follow the change; hand-picked colours stay
      const previous = category.color?.toLowerCase()
      category.color = color
      for (const activity of this.activities) {
        if (activity.categoryId === categoryId && previous && activity.color.toLowerCase() === previous) {
          activity.color = color
        }
      }
    },
    moveCategory(categoryId: string, offset: -1 | 1) {
      const ordered = numberCategories(this.categories)
      const index = ordered.findIndex(category => category.id === categoryId)
      const targetIndex = index + offset

      if (index === -1 || targetIndex < 0 || targetIndex >= ordered.length) {
        return
      }

      const current = ordered[index]!
      ordered[index] = ordered[targetIndex]!
      ordered[targetIndex] = current
      // Renumber in the swapped order; sorting by the old order numbers would undo the swap
      this.categories = ordered.map((category, position) => ({ ...category, order: position + 1 }))
    },
    /** Removes a category; its activities and habits must first move to another category */
    removeCategory(categoryId: string, targetCategoryId?: string): boolean {
      if (!this.categories.some(category => category.id === categoryId)) {
        return false
      }

      // Only primary links need a new home; secondary links are simply dropped below
      const hasContent = this.activities.some(activity => activity.categoryId === categoryId)
        || this.habits.some(habit => habit.categoryId === categoryId)
      const target = targetCategoryId && targetCategoryId !== categoryId
        && this.categories.some(category => category.id === targetCategoryId)
        ? targetCategoryId
        : null

      if (hasContent && !target) {
        return false
      }

      if (target) {
        for (const activity of this.activities) {
          if (activity.categoryId === categoryId) activity.categoryId = target
        }

        for (const habit of this.habits) {
          if (habit.categoryId === categoryId) habit.categoryId = target
        }
      }

      for (const activity of this.activities) {
        if (!activity.alsoCategoryIds) continue

        activity.alsoCategoryIds = cleanAlsoCategoryIds(this.categories, activity.categoryId, activity.alsoCategoryIds.filter(id => id !== categoryId))
      }

      this.categories = numberCategories(this.categories.filter(category => category.id !== categoryId))
      return true
    },
    /** Adds an activity; it takes the category colour unless one is given. Returns the new id, or null when invalid */
    addActivity(name: string, shortCode: string, categoryId: string, color?: string, alsoCategoryIds: string[] = []): string | null {
      const fields = { name, shortCode, categoryId }

      if (Object.keys(validateActivityFields(this.$state, fields)).length) {
        return null
      }

      const category = this.categories.find(item => item.id === categoryId)
      const id = `activity-${Date.now()}`

      this.activities.push({
        id,
        name: name.trim(),
        shortCode: shortCode.trim().toUpperCase(),
        categoryId,
        alsoCategoryIds: cleanAlsoCategoryIds(this.categories, categoryId, alsoCategoryIds),
        color: color ?? category?.color ?? '#685847'
      })

      return id
    },
    /** Changes any of the given fields at once. Returns the field errors; nothing changes when there are any */
    updateActivity(activityId: string, changes: Partial<Pick<Activity, 'name' | 'shortCode' | 'categoryId' | 'alsoCategoryIds' | 'color'>>): ActivityFieldErrors {
      const activity = this.activities.find(item => item.id === activityId)

      if (!activity) {
        return {}
      }

      const errors = validateActivityFields(this.$state, changes, activityId)

      if (Object.keys(errors).length) {
        return errors
      }

      // Changing the category moves the activity's hours with it; its slots and habit links stay as they are
      // Secondary links follow the primary category: one that becomes primary is dropped from them
      const alsoCategoryIds = changes.alsoCategoryIds !== undefined || changes.categoryId !== undefined
        ? cleanAlsoCategoryIds(this.categories, changes.categoryId ?? activity.categoryId, changes.alsoCategoryIds ?? activity.alsoCategoryIds ?? [])
        : undefined

      Object.assign(activity, {
        ...changes,
        ...(alsoCategoryIds !== undefined ? { alsoCategoryIds } : {}),
        ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
        ...(changes.shortCode !== undefined ? { shortCode: changes.shortCode.trim().toUpperCase() } : {})
      })

      return {}
    },
    removeActivity(activityId: string) {
      const nextActivities = this.activities.filter(activity => activity.id !== activityId)

      if (nextActivities.length === this.activities.length) {
        return
      }

      this.activities = nextActivities

      for (const template of this.templates) {
        template.slots = template.slots.map(slot => slot === activityId ? '' : slot)
      }

      for (const habit of this.habits) {
        if (habit.activityId === activityId) delete habit.activityId
      }
    },
    setWeekTemplate(startDate: string, templateId: string | null) {
      const existing = this.appliedWeeks.find(w => w.startDate === startDate)
      if (templateId === null) {
        this.appliedWeeks = this.appliedWeeks.filter(w => w.startDate !== startDate)
      } else if (existing) {
        existing.templateId = templateId
      } else {
        this.appliedWeeks.push({
          id: `${templateId}-${startDate}`,
          startDate,
          templateId
        })
      }
    },
    /** Applies one week type (or none, with null) to a range of weeks, such as a vacation (FR-YEAR-7) */
    setWeeksTemplate(startDates: string[], templateId: string | null) {
      for (const startDate of startDates) this.setWeekTemplate(startDate, templateId)
    },
    /** Starter grid for an empty planner; existing categories and activities are never replaced */
    seedHaradaGoals() {
      if (this.categories.length) {
        return
      }

      this.$patch(createHaradaSeed())
    },
    updateAmbition(changes: Partial<Pick<Ambition, 'statement' | 'horizonYears'>>) {
      if (this.ambition) Object.assign(this.ambition, changes)
    },
    /** Writes the 5-year ambition: creates it when the state has none (Start empty). A blank statement creates nothing */
    setAmbition(statement: string) {
      if (this.ambition) {
        this.updateAmbition({ statement })
        return
      }

      const trimmed = statement.trim()
      if (!trimmed) return

      this.ambition = { id: `ambition-${Date.now()}`, statement: trimmed, horizonYears: 5 }
    },
    /** Adds a habit to a category. Returns its id, or null when the name is blank or the category is unknown */
    addHabit(categoryId: string, name: string): string | null {
      const trimmedName = name.trim()

      if (!trimmedName || !this.categories.some(category => category.id === categoryId)) {
        return null
      }

      const id = `habit-${Date.now()}`

      this.habits.push({
        id,
        categoryId,
        name: trimmedName,
        frequency: { count: 1, period: 'week' }
      })

      return id
    },
    updateHabit(habitId: string, changes: Partial<Pick<Habit, 'name' | 'minutesPerOccurrence'>>) {
      const habit = this.habits.find(item => item.id === habitId)
      if (habit) Object.assign(habit, changes)
    },
    setHabitFrequency(habitId: string, count: number, period: HabitPeriod) {
      const habit = this.habits.find(item => item.id === habitId)
      if (habit) habit.frequency = { count: Math.max(count, 0), period }
    },
    setHabitActivity(habitId: string, activityId: string | null) {
      const habit = this.habits.find(item => item.id === habitId)

      if (!habit) {
        return
      }

      if (activityId) habit.activityId = activityId
      else delete habit.activityId
    },
    removeHabit(habitId: string) {
      this.habits = this.habits.filter(habit => habit.id !== habitId)
    },
    /** Journal experiment (FR-HOME-11): a blank note removes the entry, so the saved state stays small */
    setJournalEntry(dateKey: string, text: string) {
      if (text.trim()) {
        this.journal[dateKey] = text
      } else {
        delete this.journal[dateKey]
      }
    },
  }
})
