import { defineStore } from 'pinia'
import type { AppliedWeek, PlannerState, WeekStatus } from '~/types/planner'
import {
  aggregateTemplate,
  aggregateTemplateByCategory,
  createEmptySlots,
  createInitialState,
  getActiveTemplate,
  getTemplateById
} from '~/utils/planner'

export const usePlannerStore = defineStore('planner', {
  state: (): PlannerState => createInitialState(),
  getters: {
    activeTemplate: state => getActiveTemplate(state),
    activeTemplateActivityTotals(state) {
      const template = getActiveTemplate(state)
      return template ? aggregateTemplate(template, state.activities) : new Map<string, number>()
    },
    activeTemplateCategoryTotals(state) {
      const template = getActiveTemplate(state)
      return template ? aggregateTemplateByCategory(template, state) : new Map<string, number>()
    },
    yearlyProjectionHours(state) {
      const template = getActiveTemplate(state)

      if (!template) {
        return new Map<string, number>()
      }

      const weeklyTotals = aggregateTemplate(template, state.activities)
      const excludedWeeks = state.appliedWeeks.filter(week =>
        state.settings.projectionDefaults.excludedWeekStatuses.includes(week.status as 'vacation' | 'off')
      ).length
      const includedWeeks = Math.max((52 * state.settings.projectionDefaults.years) - excludedWeeks, 0)
      const projected = new Map<string, number>()

      for (const [activityId, hours] of weeklyTotals) {
        projected.set(activityId, hours * includedWeeks)
      }

      return projected
    }
  },
  actions: {
    hydrate(state: PlannerState | null) {
      if (state?.templates?.length) {
        this.$patch(state)
        this.ensureActiveTemplate()
      }
    },
    ensureDefaultWeek() {
      const template = this.activeTemplate

      if (!template || this.appliedWeeks.some(week => week.templateId === template.id)) {
        return
      }

      this.appliedWeeks.unshift({
        id: 'seed-week',
        startDate: new Date().toISOString().slice(0, 10),
        templateId: template.id,
        status: 'normal',
        notes: 'Seeded automatically after template creation.'
      })
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
    updateActiveTemplateDescription(description: string) {
      const template = this.activeTemplate

      if (!template) {
        return
      }

      template.description = description.trim()
    },
    updateSlot(slotIndex: number, activityId: string) {
      const template = this.activeTemplate

      if (!template || slotIndex < 0 || slotIndex >= template.slots.length) {
        return
      }

      template.slots[slotIndex] = activityId
    },
    setSlot(dayIndex: number, hour: number, activityId: string) {
      const template = this.activeTemplate

      if (!template || dayIndex < 0 || dayIndex > 6 || hour < 0 || hour > 23) {
        return
      }

      const index = (dayIndex * 24) + hour
      template.slots[index] = activityId
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
    clearActiveTemplate() {
      const template = this.activeTemplate

      if (!template) {
        return
      }

      template.slots = template.slots.map(() => '')
    },
    copyDay(sourceDayIndex: number, targetDayIndex: number) {
      const template = this.activeTemplate

      if (!template || sourceDayIndex === targetDayIndex) {
        return
      }

      const slotsPerDay = template.slots.length / 7
      const sourceStart = sourceDayIndex * slotsPerDay
      const targetStart = targetDayIndex * slotsPerDay
      const slice = template.slots.slice(sourceStart, sourceStart + slotsPerDay)

      template.slots.splice(targetStart, slotsPerDay, ...slice)
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
        color
      })
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
          templateId,
          status: 'normal',
          notes: 'Assigned from year painter.'
        })
      }
    },
    setTemplateApplications(templateId: string, weekStartDates: string[], monthWeekStartDates: string[]) {
      const template = getTemplateById(this.$state, templateId)

      if (!template) {
        return
      }

      const selectedDates = new Set(weekStartDates)
      const monthDates = new Set(monthWeekStartDates)

      this.appliedWeeks = this.appliedWeeks.filter(week => !monthDates.has(week.startDate))

      const nextWeeks = monthWeekStartDates
        .filter(startDate => selectedDates.has(startDate))
        .map(startDate => ({
          id: `${templateId}-${startDate}`,
          startDate,
          templateId,
          status: 'normal' as const,
          notes: `Applied from ${template.name}.`
        }))

      this.appliedWeeks.unshift(...nextWeeks.reverse())
    },
    duplicateTemplate(templateId: string) {
      const source = getTemplateById(this.$state, templateId)

      if (!source) {
        return
      }

      this.templates.unshift({
        ...source,
        id: `${source.id}-copy-${Date.now()}`,
        name: `${source.name} Copy`,
        slots: [...source.slots]
      })
      this.settings.activeTemplateId = this.templates[0]?.id ?? null
    },
    applyWeek(startDate: string, templateId: string, status: WeekStatus = 'normal', notes?: string) {
      const existing = this.appliedWeeks.find(week => week.startDate === startDate)

      if (existing) {
        existing.templateId = templateId
        existing.status = status
        if (notes !== undefined) existing.notes = notes
        return
      }

      this.appliedWeeks.push({
        id: `week-${startDate}`,
        startDate,
        templateId,
        status,
        notes
      })
    },
    updateWeek(weekId: string, changes: Partial<Pick<AppliedWeek, 'templateId' | 'status' | 'notes'>>) {
      const week = this.appliedWeeks.find(w => w.id === weekId)

      if (week) {
        Object.assign(week, changes)
      }
    },
    removeWeek(weekId: string) {
      this.appliedWeeks = this.appliedWeeks.filter(w => w.id !== weekId)
    },
    resetToSeed() {
      this.$patch(createInitialState())
      this.ensureActiveTemplate()
    }
  }
})
