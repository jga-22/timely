import type { PlannerState, WeekTemplate } from '~/types/planner'
import { mondayOf } from '~/utils/dates'

/** Editorial muted palette used by the design system */
export const DESIGN_COLORS: Array<{ id: string; bg: string }> = [
  { id: 'terracotta', bg: '#d97757' },
  { id: 'ochre',      bg: '#c19a3e' },
  { id: 'sage',       bg: '#7a9471' },
  { id: 'teal',       bg: '#4a8683' },
  { id: 'plum',       bg: '#8a5a7a' },
  { id: 'slate',      bg: '#5d6b7a' },
  { id: 'rose',       bg: '#c4767f' },
  { id: 'moss',       bg: '#5c7248' },
  { id: 'navy',       bg: '#3c4b63' },
  { id: 'cream',      bg: '#d4c19a' },
  { id: 'brick',      bg: '#a04e3e' },
  { id: 'pine',       bg: '#2d5a3f' },
  { id: 'dusk',       bg: '#6e5c7c' },
  { id: 'stone',      bg: '#9a9288' },
  { id: 'coral',      bg: '#e09070' },
  { id: 'ink',        bg: '#2a2a2a' },
]

/** The first palette colour no week type uses yet, so new week types stand apart on the year grid; undefined when all are used */
export const nextTemplateColor = (templates: WeekTemplate[]): string | undefined => {
  const used = new Set(templates.map(template => template.color?.toLowerCase()))
  return DESIGN_COLORS.find(color => !used.has(color.bg.toLowerCase()))?.bg
}

export const getTemplateById = (state: PlannerState, templateId: string) =>
  state.templates.find(template => template.id === templateId)

export const getActiveTemplate = (state: PlannerState) =>
  state.templates.find(template => template.id === state.settings.activeTemplateId) ?? state.templates[0]

/**
 * Template that governs the week starting on the Monday of the given date (FR-DATE-2): the applied week's
 * template, else the active template. A deleted template is never returned; the active template takes its place.
 */
export const effectiveTemplate = (state: PlannerState, date: string): WeekTemplate | undefined => {
  const applied = state.appliedWeeks.find(week => week.startDate === mondayOf(date))
  return (applied && getTemplateById(state, applied.templateId)) || getActiveTemplate(state)
}

export const isHourlyTemplate = (template: WeekTemplate | undefined) => template?.granularityMinutes === 60

/**
 * The week type Goals reads (FR-TPL-8): the active one unless it is time off; otherwise the
 * working week type with the most assigned weeks (the first one when none is assigned); otherwise the active one.
 * Home, Planner and Insights do not use it.
 */
export const goalsTemplate = (state: PlannerState): WeekTemplate | undefined => {
  const active = getActiveTemplate(state)

  if (!active || active.kind !== 'break') return active

  const assigned = new Map<string, number>()
  for (const week of state.appliedWeeks) assigned.set(week.templateId, (assigned.get(week.templateId) ?? 0) + 1)

  let best: WeekTemplate | undefined
  for (const template of state.templates) {
    if (template.kind === 'break') continue
    if (!best || (assigned.get(template.id) ?? 0) > (assigned.get(best.id) ?? 0)) best = template
  }

  return best ?? active
}
