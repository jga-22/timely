import { defineStore } from 'pinia'
import {
  freeShortCode,
  newWeekSlots,
  presetCategoryId,
  replacedText
} from '~/utils/plannerStore'
import type { Activity, Ambition, Category, Habit, HabitPeriod, PlannerState } from '~/types/planner'
import {
  DESIGN_COLORS,
  createOnboardingState,
  getActiveTemplate,
  getTemplateById,
  isHourlyTemplate,
  nextTemplateColor,
  validateActivityFields,
  type ActivityFieldErrors,
  type HourConflict,
  type PaintMode
} from '~/utils/planner'
import { shortCodeFor } from '~/utils/onboarding'
import { paintCells, setActivitySlots } from '~/utils/store/slots'
import { restoreSlots } from '~/utils/store/undo'
import { setWeekTemplate, setWeeksTemplate } from '~/utils/store/weeks'
import { setAmbition, updateAmbition } from '~/utils/store/ambition'
import { setJournalEntry, toggleDone } from '~/utils/store/daily'
import { replaceStateInto } from '~/utils/store/lifecycle'
import { addCategory, moveCategory, removeCategory, seedHaradaGoals, setCategoryColor, updateCategory } from '~/utils/store/categories'
import { localDateKey } from '~/utils/dates'
import {
  ALL_NIGHTS,
  DEFAULT_SLEEP,
  SLEEP_CODE,
  SLEEP_COLOR,
  SLEEP_ID,
  SLEEP_NAME,
  isSleepActivity,
  paintSleep,
  sleepActivityId,
  sleepWindowError,
  windowLabel,
  type SleepGroup
} from '~/utils/sleep'
import {
  blockHours,
  entryDraftOf,
  entryErrors,
  frequencyChanged,
  frequencyOf,
  paintResultText,
  scheduleChanged,
  type EntryDraft,
  type EntrySaveResult
} from '~/utils/entries'
import {
  PRESET_ROLES,
  ROLE_LABELS,
  buildPresetSlots,
  getPreset,
  presetTemplateFields,
  type PresetRole,
  type RoleMap
} from '~/utils/presets'

export const usePlannerStore = defineStore('planner', {
  /** The empty onboarding state, so server and first client render match for a new user (FR-ONB-2) */
  // `done` is listed so the storage watcher can track it (FR-HOME-14)
  state: (): PlannerState => ({ ...createOnboardingState(), done: {} }),
  getters: {
    activeTemplate: state => getActiveTemplate(state),
    /** The done keys of one date (FR-HOME-14) */
    doneOn: state => (date: string): string[] => state.done?.[date] ?? [],
  },
  actions: {
    // ---------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------
    hydrate(state: PlannerState | null) {
      if (state) {
        this.replaceState(state)
        this.ensureActiveTemplate()
      }
    },

    /** Replaces the whole state in one step, so nothing of the previous state (a journal, a stale onboarding flag) carries over */
    replaceState(next: PlannerState) {
      this.$patch(current => replaceStateInto(current, next))
    },

    /** Ends the first-run onboarding without creating data (FR-ONB-3, Start empty) */
    finishOnboarding() {
      this.onboarding = 'done'
    },

    // ---------------------------------------------------------------
    // Week types
    // ---------------------------------------------------------------
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
        slots: newWeekSlots(this.$state, granularity)
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

    /** Sets or clears a week type's time-off mark (FR-TPL-8). Goals reads a working week type instead */
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

    // ---------------------------------------------------------------
    // Slots
    // ---------------------------------------------------------------
    /**
     * Paints one activity's hours in one hourly template (FR-PLAN-17, 18). `add` takes hours held by other
     * activities only when `reassign` is true; otherwise nothing changes and the conflicts are returned for confirmation.
     * Returns [] when the change was applied.
     */
    setActivitySlots(templateId: string, activityId: string, cells: number[], mode: PaintMode, reassign = false): HourConflict[] {
      return setActivitySlots(this.$state, templateId, activityId, cells, mode, reassign)
    },

    /**
     * Paints cells with one activity, replacing whatever other activities hold them (FR-PLAN-17). With a null activity the cells
     * are erased. Returns the hours taken from each holder, for the undo notice. Nothing is checked or confirmed first.
     */
    paintCells(templateId: string, cells: number[], activityId: string | null): HourConflict[] {
      return paintCells(this.$state, templateId, cells, activityId)
    },

    /** Puts back a template's slots as they were before the last paint (single-step undo) */
    restoreSlots(templateId: string, slots: string[]) {
      restoreSlots(this.$state, templateId, slots)
    },

    // ---------------------------------------------------------------
    // Categories
    // ---------------------------------------------------------------
    /** Adds a category at the end of the list. Returns its id, or null when the name is blank */
    addCategory(name: string, color: string): string | null {
      return addCategory(this.$state, name, color, Date.now())
    },

    updateCategory(categoryId: string, changes: Partial<Pick<Category, 'name' | 'goal5y' | 'target1y' | 'targetTbd'>>) {
      updateCategory(this.$state, categoryId, changes)
    },

    setCategoryColor(categoryId: string, color: string) {
      setCategoryColor(this.$state, categoryId, color)
    },

    moveCategory(categoryId: string, offset: -1 | 1) {
      moveCategory(this.$state, categoryId, offset)
    },

    /** Removes a category; its activities and habits must first move to another category */
    removeCategory(categoryId: string, targetCategoryId?: string): boolean {
      return removeCategory(this.$state, categoryId, targetCategoryId)
    },

    /** Starter grid for an empty planner; existing categories and activities are never replaced */
    seedHaradaGoals() {
      seedHaradaGoals(this.$state)
    },

    // ---------------------------------------------------------------
    // Activities
    // ---------------------------------------------------------------
    /** An activity for a preset role: the existing one with the same name, else a new one. Null when it cannot be created */
    createRoleActivity(role: PresetRole, index: number): string | null {
      // Sleep is the one activity with a key: it is found by its code, or created with it (FR-SLEEP-1, 2)
      if (role === 'sleep') return this.ensureSleepActivity()

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

    /** Adds an activity; it takes the category colour unless one is given. Returns the new id, or null when invalid */
    addActivity(name: string, shortCode: string, categoryId: string, color?: string): string | null {
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
        color: color ?? category?.color ?? '#685847'
      })

      return id
    },

    /**
     * The activity a habit gets from its name (FR-GOALS-24): the activity of that name in the life area when there is one, else a new
     * activity with the life area colour and a free short code. Returns its id, or the error; nothing is added on error
     */
    ownActivityFor(categoryId: string, name: string): { id: string } | { error: string } {
      const trimmed = name.trim()
      const existing = this.activities.find(activity => activity.categoryId === categoryId && activity.name.trim().toLowerCase() === trimmed.toLowerCase())

      if (existing) {
        return { id: existing.id }
      }

      const shortCode = freeShortCode(this.$state, trimmed)

      if (!shortCode) {
        return { error: 'No short code is free for this name. Link an existing activity instead.' }
      }

      const id = this.addActivity(trimmed, shortCode, categoryId)
      return id ? { id } : { error: 'The activity could not be added. Check the life area.' }
    },

    /** Changes any of the given fields at once. Returns the field errors; nothing changes when there are any */
    updateActivity(activityId: string, changes: Partial<Pick<Activity, 'name' | 'shortCode' | 'categoryId' | 'color'>>): ActivityFieldErrors {
      const activity = this.activities.find(item => item.id === activityId)

      if (!activity) {
        return {}
      }

      const errors = validateActivityFields(this.$state, changes, activityId)

      if (Object.keys(errors).length) {
        return errors
      }

      // Changing the category moves the activity's hours with it; its slots and habit links stay as they are
      Object.assign(activity, {
        ...changes,
        ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
        ...(changes.shortCode !== undefined ? { shortCode: changes.shortCode.trim().toUpperCase() } : {})
      })

      return {}
    },

    removeActivity(activityId: string) {
      // The Sleep activity cannot be deleted: it is built in, and hiding it is the way to keep it out of view (FR-SLEEP-3)
      if (isSleepActivity(this.activities.find(activity => activity.id === activityId))) return

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

    // ---------------------------------------------------------------
    // Sleep
    // ---------------------------------------------------------------
    /** The Sleep activity, created when the planner has none: Sleep, SLP, the quiet purple, in Physical (FR-SLEEP-2). Null when there is no life area */
    ensureSleepActivity(): string | null {
      const existing = sleepActivityId(this.$state)
      if (existing) return existing

      const area = presetCategoryId(this.categories, 'sleep')
      if (!area) return null

      const id = this.activities.some(activity => activity.id === SLEEP_ID) ? `activity-${Date.now()}` : SLEEP_ID
      this.activities.push({ id, name: SLEEP_NAME, shortCode: SLEEP_CODE, categoryId: area, color: SLEEP_COLOR })

      return id
    },

    /**
     * Paints the Sleep activity's nights in the given hourly week type (FR-SLEEP-5): its old hours go, and the groups' nights are painted
     * over whatever holds them. Returns the result text and the undo, or null when a window is refused or there is no Sleep activity
     */
    setSleep(templateId: string, groups: SleepGroup[]): { text: string; undo: Array<{ templateId: string; slots: string[] }> } | null {
      const template = getTemplateById(this.$state, templateId)
      const sleepId = sleepActivityId(this.$state)

      if (!template || !sleepId || !isHourlyTemplate(template) || groups.some(group => sleepWindowError(group.window))) return null

      const before = [...template.slots]
      const { slots, replaced } = paintSleep(template.slots, sleepId, groups)
      template.slots = slots

      const text = groups.length === 1
        ? `Sleep set to ${windowLabel(groups[0]!.window)}.`
        : `Sleep set to ${windowLabel(groups[0]!.window)} on weekdays and ${windowLabel(groups[1]!.window)} at weekends.`

      return { text: `${text}${replacedText(replaced, this.activities)}`, undo: [{ templateId, slots: before }] }
    },

    /**
     * Sets up Sleep in a save that has none (FR-SLEEP-2): creates the Sleep activity, then paints the default night in the active week
     * type. Null when there is no life area or the active week type is not hourly. The undo puts the hours back; the activity stays
     */
    setupSleep(): { text: string; undo: Array<{ templateId: string; slots: string[] }> } | null {
      const template = this.activeTemplate
      if (!template || !isHourlyTemplate(template)) return null

      const sleepId = this.ensureSleepActivity()
      if (!sleepId) return null

      const before = [...template.slots]
      const { slots, replaced } = paintSleep(template.slots, sleepId, [{ days: ALL_NIGHTS, window: DEFAULT_SLEEP }])
      template.slots = slots

      return {
        text: `Sleep set up: ${windowLabel(DEFAULT_SLEEP)} every night in ${template.name}.${replacedText(replaced, this.activities)}`,
        undo: [{ templateId: template.id, slots: before }]
      }
    },

    // ---------------------------------------------------------------
    // Weeks
    // ---------------------------------------------------------------
    setWeekTemplate(startDate: string, templateId: string | null) {
      setWeekTemplate(this.$state, startDate, templateId)
    },

    /** Applies one week type (or none, with null) to a range of weeks, such as a vacation (FR-YEAR-7) */
    setWeeksTemplate(startDates: string[], templateId: string | null) {
      setWeeksTemplate(this.$state, startDates, templateId)
    },

    setProjectionYears(years: number) {
      this.settings.projectionDefaults.years = years
    },

    // ---------------------------------------------------------------
    // Ambition
    // ---------------------------------------------------------------
    updateAmbition(changes: Partial<Pick<Ambition, 'statement' | 'horizonYears'>>) {
      updateAmbition(this.$state, changes)
    },

    /** Writes the 5-year ambition: creates it when the state has none (Start empty). A blank statement creates nothing */
    setAmbition(statement: string) {
      setAmbition(this.$state, statement, Date.now())
    },

    // ---------------------------------------------------------------
    // Habits
    // ---------------------------------------------------------------
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

    // ---------------------------------------------------------------
    // Entries
    // ---------------------------------------------------------------
    /**
     * Saves one entry of the one form (FR-ITEM-2): its habit, its activity and the activity's hours, in one step. Nothing changes when the
     * draft has errors. A timed draft writes the activity; the hours are repainted only when the schedule changed, and the result carries
     * the undo. An untimed draft drops the activity: its hours go and its habit keeps no link, unless another habit still uses it.
     */
    saveEntry(draft: EntryDraft): EntrySaveResult {
      const initial = entryDraftOf(this.$state, draft.habitId, draft.activityId)
      const errors = entryErrors(this.$state, draft)
      const timed = draft.durationMinutes > 0
      const name = draft.name.trim()
      const code = draft.shortCode.trim().toUpperCase()

      // A new activity with no code takes the first free one from its name (FR-GOALS-24); none free is an error
      if (timed && !draft.activityId && !errors.shortCode && !code && !freeShortCode(this.$state, name)) {
        errors.shortCode = 'No short code is free for this name. Type one.'
      }

      if (Object.keys(errors).length) return { errors }

      // Every entry has a habit, except an activity that stays timed: it is an entry on its own (FR-ITEM-1)
      const needsHabit = !!draft.habitId || !draft.activityId || !timed

      let activityId = draft.activityId
      if (timed) {
        if (activityId) {
          this.updateActivity(activityId, {
            name,
            categoryId: draft.categoryId,
            color: draft.color,
            ...(code ? { shortCode: code } : {})
          })
        } else {
          activityId = this.addActivity(name, code || freeShortCode(this.$state, name) || '', draft.categoryId, draft.color) ?? null
          if (!activityId) return { errors: { shortCode: 'The activity could not be added. Check the life area.' } }
        }
      }

      let habitId: string | undefined
      if (needsHabit) {
        habitId = draft.habitId ?? undefined

        if (habitId) {
          const habit = this.habits.find(item => item.id === habitId)
          if (habit) Object.assign(habit, { name, categoryId: draft.categoryId })
        } else {
          habitId = this.addHabit(draft.categoryId, name) ?? undefined
          if (!habitId) return { errors: { name: 'Name can\'t be empty' } }
        }

        const habit = this.habits.find(item => item.id === habitId)!

        if (!draft.habitId || frequencyChanged(draft, initial)) {
          const frequency = frequencyOf(draft)
          this.setHabitFrequency(habitId, frequency.count, frequency.period)
        }

        if (timed) {
          if (!draft.habitId || draft.durationMinutes !== initial.durationMinutes) this.updateHabit(habitId, { minutesPerOccurrence: draft.durationMinutes })
          this.setHabitActivity(habitId, activityId)
        } else {
          delete habit.minutesPerOccurrence
          // Another habit still uses the activity: only this habit lets go of it. Otherwise the activity goes with its hours
          if (draft.activityId && this.habits.some(item => item.activityId === draft.activityId && item.id !== habitId)) {
            this.setHabitActivity(habitId, null)
          } else if (draft.activityId) {
            this.removeActivity(draft.activityId)
          }
        }
      }

      if (!timed || !activityId || !scheduleChanged(draft, initial)) {
        return { errors: {}, habitId, activityId: timed ? activityId ?? undefined : undefined }
      }

      // Repaint: the activity's hours leave every hourly week type, then the checked ones get the days, whole hours and start
      const hours = blockHours(draft.durationMinutes)
      const cells = draft.days.flatMap(day => Array.from({ length: hours }, (_, offset) => day * 24 + draft.start + offset))
      const hourly = this.templates.filter(template => isHourlyTemplate(template))
      const undo = hourly
        .filter(template => template.slots.includes(activityId!) || draft.templateIds.includes(template.id))
        .map(template => ({ templateId: template.id, slots: [...template.slots] }))

      const cleared: string[] = []
      for (const template of hourly) {
        if (!template.slots.includes(activityId)) continue
        if (!draft.templateIds.includes(template.id)) cleared.push(template.name)
        template.slots = template.slots.map(slot => (slot === activityId ? '' : slot))
      }

      const added: string[] = []
      const replaced = new Map<string, number>()
      for (const templateId of draft.templateIds) {
        const template = getTemplateById(this.$state, templateId)
        if (!template || !isHourlyTemplate(template)) continue

        for (const conflict of this.paintCells(templateId, cells, activityId)) {
          replaced.set(conflict.activityId, (replaced.get(conflict.activityId) ?? 0) + conflict.hours)
        }
        added.push(template.name)
      }

      const text = paintResultText({
        added,
        days: draft.days.length,
        hours,
        replaced: [...replaced].map(([id, count]) => ({ name: this.activities.find(item => item.id === id)?.name ?? 'another activity', hours: count })),
        cleared
      })

      return { errors: {}, habitId, activityId, text, undo }
    },

    /** Removes an entry as the form's Delete does: a habit leaves its activity in place (its own entry from then on); an activity clears its hours and unlinks its habits */
    removeEntry(habitId: string | null, activityId: string | null) {
      if (habitId) this.removeHabit(habitId)
      else if (activityId) this.removeActivity(activityId)
    },

    // ---------------------------------------------------------------
    // Journal
    // ---------------------------------------------------------------
    /** Journal experiment (FR-HOME-11): a blank note removes the entry, so the saved state stays small */
    setJournalEntry(dateKey: string, text: string) {
      setJournalEntry(this.$state, dateKey, text)
    },

    // ---------------------------------------------------------------
    // Done
    // ---------------------------------------------------------------
    /** Done tick on Home (FR-HOME-14): adds or removes a block or habit key of a date. A date with no ticks left is removed.
     * A future date (after today, local) or a malformed key is refused */
    toggleDone(date: string, key: string) {
      toggleDone(this.$state, date, key, localDateKey())
    },
  }
})
