import { defineStore } from 'pinia'
import { freeShortCode } from '~/utils/plannerStore'
import type { Activity, Ambition, Category, Habit, HabitPeriod, PlannerState } from '~/types/planner'
import {
  createOnboardingState,
  getActiveTemplate,
  getTemplateById,
  isHourlyTemplate,
  type ActivityFieldErrors,
  type HourConflict,
  type PaintMode
} from '~/utils/planner'
import { addActivity, createRoleActivity, ensureSleepActivity, ownActivityFor, removeActivity, updateActivity } from '~/utils/store/activities'
import { addHabit, removeHabit, setHabitActivity, setHabitFrequency, updateHabit } from '~/utils/store/habits'
import { setSleep, setupSleep } from '~/utils/store/sleepSetup'
import { paintCells, setActivitySlots } from '~/utils/store/slots'
import { restoreSlots } from '~/utils/store/undo'
import { setWeekTemplate, setWeeksTemplate } from '~/utils/store/weeks'
import { createTemplate, createTemplateFromPreset, deleteTemplate, duplicateTemplate, ensureActiveTemplate, renameActiveTemplate, renameTemplate, selectTemplate, setTemplateColor, setTemplateKind } from '~/utils/store/weekTypes'
import { setAmbition, updateAmbition } from '~/utils/store/ambition'
import { setJournalEntry, toggleDone } from '~/utils/store/daily'
import { replaceStateInto } from '~/utils/store/lifecycle'
import { addCategory, moveCategory, removeCategory, seedHaradaGoals, setCategoryColor, updateCategory } from '~/utils/store/categories'
import { localDateKey } from '~/utils/dates'
import type { SleepGroup } from '~/utils/sleep'
import type { PresetRole } from '~/utils/presets'
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
      ensureActiveTemplate(this.$state)
    },

    selectTemplate(templateId: string) {
      selectTemplate(this.$state, templateId)
    },

    createTemplate() {
      createTemplate(this.$state, Date.now())
    },

    /** Copies a week type's hours into a new one with the next unused colour, and makes it active (FR-TPL-6). Returns its id, or null when the source is unknown */
    duplicateTemplate(sourceId: string, name: string): string | null {
      return duplicateTemplate(this.$state, sourceId, name, Date.now())
    },

    /**
     * Creates a week type from a preset (FR-TPL-8) and makes it active. A role set to 'create' gets a new activity, unless one
     * already has its name (then that one is used) or its short code is taken (then the role is left empty). Returns the id, or null for an unknown preset
     */
    createTemplateFromPreset(name: string, presetId: string, roleMap: Partial<Record<PresetRole, string | 'create' | null>>, keepHabits: boolean): string | null {
      return createTemplateFromPreset(this.$state, name, presetId, roleMap, keepHabits, Date.now())
    },

    /** Sets or clears a week type's time-off mark (FR-TPL-8). Goals reads a working week type instead */
    setTemplateKind(templateId: string, kind: 'break' | undefined) {
      setTemplateKind(this.$state, templateId, kind)
    },

    deleteTemplate(templateId: string): boolean {
      return deleteTemplate(this.$state, templateId)
    },

    /** Renames a template; a blank name keeps the old one */
    renameTemplate(templateId: string, name: string) {
      renameTemplate(this.$state, templateId, name)
    },

    setTemplateColor(templateId: string, color: string) {
      setTemplateColor(this.$state, templateId, color)
    },

    renameActiveTemplate(name: string) {
      renameActiveTemplate(this.$state, name)
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
      return createRoleActivity(this.$state, role, index, Date.now())
    },

    /** Adds an activity; it takes the category colour unless one is given. Returns the new id, or null when invalid */
    addActivity(name: string, shortCode: string, categoryId: string, color?: string): string | null {
      return addActivity(this.$state, name, shortCode, categoryId, color, Date.now())
    },

    /**
     * The activity a habit gets from its name (FR-GOALS-24): the activity of that name in the life area when there is one, else a new
     * activity with the life area colour and a free short code. Returns its id, or the error; nothing is added on error
     */
    ownActivityFor(categoryId: string, name: string): { id: string } | { error: string } {
      return ownActivityFor(this.$state, categoryId, name, Date.now())
    },

    /** Changes any of the given fields at once. Returns the field errors; nothing changes when there are any */
    updateActivity(activityId: string, changes: Partial<Pick<Activity, 'name' | 'shortCode' | 'categoryId' | 'color'>>): ActivityFieldErrors {
      return updateActivity(this.$state, activityId, changes)
    },

    removeActivity(activityId: string) {
      removeActivity(this.$state, activityId)
    },

    // ---------------------------------------------------------------
    // Sleep
    // ---------------------------------------------------------------
    /** The Sleep activity, created when the planner has none: Sleep, SLP, the quiet purple, in Physical (FR-SLEEP-2). Null when there is no life area */
    ensureSleepActivity(): string | null {
      return ensureSleepActivity(this.$state, Date.now())
    },
    /**
     * Paints the Sleep activity's nights in the given hourly week type (FR-SLEEP-5): its old hours go, and the groups' nights are painted
     * over whatever holds them. Returns the result text and the undo, or null when a window is refused or there is no Sleep activity
     */
    setSleep(templateId: string, groups: SleepGroup[]): { text: string; undo: Array<{ templateId: string; slots: string[] }> } | null {
      return setSleep(this.$state, templateId, groups)
    },

    /**
     * Sets up Sleep in a save that has none (FR-SLEEP-2): creates the Sleep activity, then paints the default night in the active week
     * type. Null when there is no life area or the active week type is not hourly. The undo puts the hours back; the activity stays
     */
    setupSleep(): { text: string; undo: Array<{ templateId: string; slots: string[] }> } | null {
      return setupSleep(this.$state, Date.now())
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
      return addHabit(this.$state, categoryId, name, Date.now())
    },

    updateHabit(habitId: string, changes: Partial<Pick<Habit, 'name' | 'minutesPerOccurrence'>>) {
      updateHabit(this.$state, habitId, changes)
    },

    setHabitFrequency(habitId: string, count: number, period: HabitPeriod) {
      setHabitFrequency(this.$state, habitId, count, period)
    },

    setHabitActivity(habitId: string, activityId: string | null) {
      setHabitActivity(this.$state, habitId, activityId)
    },

    removeHabit(habitId: string) {
      removeHabit(this.$state, habitId)
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
