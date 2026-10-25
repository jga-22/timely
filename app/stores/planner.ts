import { defineStore } from 'pinia'
import type { Ambition, Category, Habit, HabitPeriod, PlannerState } from '~/types/planner'
import {
  aggregateTemplateByCategory,
  createEmptySlots,
  createHaradaSeed,
  createInitialState,
  getActiveTemplate,
  getTemplateById,
  yearlyActivityHours
} from '~/utils/planner'

/** Sorts by order and renumbers from 1, so reorders and removals leave no gaps */
const numberCategories = (categories: Category[]): Category[] =>
  [...categories].sort((a, b) => a.order - b.order).map((category, index) => ({ ...category, order: index + 1 }))

export const usePlannerStore = defineStore('planner', {
  state: (): PlannerState => createInitialState(),
  getters: {
    activeTemplate: state => getActiveTemplate(state),
    activeTemplateCategoryTotals(state) {
      const template = getActiveTemplate(state)
      return template ? aggregateTemplateByCategory(template, state) : new Map<string, number>()
    },
    /** Hours per activity over the horizon: the chosen year's scheduled hours times the horizon in years (PRD 17.11) */
    yearlyProjectionHours(state) {
      return (year: number) => {
        const years = state.settings.projectionDefaults.years
        const projected = new Map<string, number>()

        for (const [activityId, hours] of yearlyActivityHours(state, year)) {
          projected.set(activityId, hours * years)
        }

        return projected
      }
    }
  },
  actions: {
    hydrate(state: PlannerState | null) {
      if (state) {
        this.$patch(state)
        this.ensureActiveTemplate()
      }
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
        name: `New Template ${this.templates.length + 1}`,
        description: 'Empty template — paint your ideal week.',
        granularityMinutes: granularity,
        color: source?.color,
        slots: createEmptySlots(granularity)
      })
      this.settings.activeTemplateId = templateId
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
    applyTimeRange(activityId: string, dayIndexes: number[], startHour: number, endHour: number) {
      const template = this.activeTemplate

      if (!template || startHour < 0 || endHour > 24 || startHour >= endHour) {
        return
      }

      for (const dayIndex of dayIndexes) {
        if (dayIndex < 0 || dayIndex > 6) {
          continue
        }

        for (let hour = startHour; hour < endHour; hour += 1) {
          const index = (dayIndex * 24) + hour
          template.slots[index] = activityId
        }
      }
    },
    clearTimeRange(dayIndexes: number[], startHour: number, endHour: number) {
      this.applyTimeRange('', dayIndexes, startHour, endHour)
    },
    setProjectionYears(years: number) {
      this.settings.projectionDefaults.years = years
    },
    addCategory(name: string, color: string) {
      const trimmedName = name.trim()

      if (!trimmedName) {
        return
      }

      this.categories.push({
        id: `category-${Date.now()}`,
        name: trimmedName,
        color,
        order: Math.max(0, ...this.categories.map(category => category.order)) + 1
      })
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

      category.color = color
      for (const activity of this.activities) {
        if (activity.categoryId === categoryId) activity.color = color
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
      this.categories = numberCategories(ordered)
    },
    /** Removes a category; its activities and habits must first move to another category */
    removeCategory(categoryId: string, targetCategoryId?: string): boolean {
      if (!this.categories.some(category => category.id === categoryId)) {
        return false
      }

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

      this.categories = numberCategories(this.categories.filter(category => category.id !== categoryId))
      return true
    },
    addActivity(name: string, shortCode: string, categoryId: string) {
      const trimmedName = name.trim()
      const normalizedCode = shortCode.trim().slice(0, 3).toUpperCase()
      const category = this.categories.find(item => item.id === categoryId)

      if (!trimmedName || !normalizedCode || !category) {
        return
      }

      this.activities.push({
        id: `activity-${Date.now()}`,
        name: trimmedName,
        shortCode: normalizedCode,
        categoryId,
        color: category.color ?? '#685847'
      })
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
    addHabit(categoryId: string, name: string) {
      const trimmedName = name.trim()

      if (!trimmedName || !this.categories.some(category => category.id === categoryId)) {
        return
      }

      this.habits.push({
        id: `habit-${Date.now()}`,
        categoryId,
        name: trimmedName,
        frequency: { count: 1, period: 'week' }
      })
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
  }
})
