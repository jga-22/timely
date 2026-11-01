/**
 * Week type ops: making, copying, presetting, renaming, colouring, marking as time off and deleting a week type, and which one is
 * active. Owns ensureActiveTemplate, selectTemplate, createTemplate, duplicateTemplate, createTemplateFromPreset, setTemplateKind,
 * deleteTemplate, renameTemplate, setTemplateColor and renameActiveTemplate, and uniqueName (the numbered names)
 */
import type { PlannerState } from '~/types/planner'
import { DESIGN_COLORS, getActiveTemplate, getTemplateById, nextTemplateColor } from '~/utils/planner/templates'
import { newWeekSlots } from '~/utils/plannerStore'
import { PRESET_ROLES, buildPresetSlots, getPreset, presetTemplateFields, type PresetRole, type RoleMap } from '~/utils/presets'
import { createRoleActivity } from '~/utils/store/activities'
import { newId } from '~/utils/store/ids'

/**
 * The name a week type gets among the others: the name as given when no other week type has it (case-insensitive, trimmed), otherwise
 * the first free "Name 2", "Name 3" and so on. Pure: the caller passes the names of the other week types
 */
export const uniqueName = (existing: string[], name: string): string => {
  const base = name.trim()
  const taken = new Set(existing.map(item => item.trim().toLowerCase()))

  if (!taken.has(base.toLowerCase())) {
    return name
  }

  let suffix = 2

  while (taken.has(`${base} ${suffix}`.toLowerCase())) {
    suffix += 1
  }

  return `${base} ${suffix}`
}

export const ensureActiveTemplate = (d: PlannerState) => {
  const template = getActiveTemplate(d)
  d.settings.activeTemplateId = template?.id ?? null
}

export const selectTemplate = (d: PlannerState, templateId: string) => {
  const template = getTemplateById(d, templateId)

  if (!template) {
    return
  }

  d.settings.activeTemplateId = template.id
}

export const createTemplate = (d: PlannerState, stamp: number) => {
  const source = getActiveTemplate(d)
  const templateId = newId('template', stamp)
  const granularity = source?.granularityMinutes ?? 60

  d.templates.unshift({
    id: templateId,
    name: uniqueName(d.templates.map(template => template.name), `New week type ${d.templates.length + 1}`),
    description: 'Empty week type — paint your ideal week.',
    granularityMinutes: granularity,
    color: source?.color,
    slots: newWeekSlots(d, granularity)
  })
  d.settings.activeTemplateId = templateId
}

/** Copies a week type's hours into a new one with the next unused colour, and makes it active (FR-TPL-6). Returns its id, or null when the source is unknown */
export const duplicateTemplate = (d: PlannerState, sourceId: string, name: string, stamp: number): string | null => {
  const source = getTemplateById(d, sourceId)

  if (!source) {
    return null
  }

  const templateId = newId('template', stamp)

  d.templates.unshift({
    id: templateId,
    name: uniqueName(d.templates.map(template => template.name), name.trim() || `Copy of ${source.name}`),
    granularityMinutes: source.granularityMinutes,
    color: nextTemplateColor(d.templates) ?? source.color,
    slots: [...source.slots]
  })
  d.settings.activeTemplateId = templateId

  return templateId
}

/**
 * Creates a week type from a preset (FR-TPL-8) and makes it active. A role set to 'create' gets a new activity, unless one
 * already has its name (then that one is used) or its short code is taken (then the role is left empty). Returns the id, or null for an unknown preset
 */
export const createTemplateFromPreset = (
  d: PlannerState,
  name: string,
  presetId: string,
  roleMap: Partial<Record<PresetRole, string | 'create' | null>>,
  keepHabits: boolean,
  stamp: number
): string | null => {
  const preset = getPreset(presetId)

  if (!preset) {
    return null
  }

  const resolved: RoleMap = {}

  PRESET_ROLES.forEach((role, index) => {
    const choice = roleMap[role]
    resolved[role] = choice === 'create' ? createRoleActivity(d, role, index, stamp) : (choice ?? null)
  })

  // Built before the new week type exists, so the habit hours come from the week type Goals reads now
  const slots = buildPresetSlots(d, preset, resolved, keepHabits)
  const templateId = newId('template', stamp)

  d.templates.unshift({
    id: templateId,
    name: uniqueName(d.templates.map(template => template.name), name.trim() || preset.name),
    color: nextTemplateColor(d.templates) ?? DESIGN_COLORS[0]!.bg,
    slots,
    ...presetTemplateFields(preset)
  })
  d.settings.activeTemplateId = templateId

  return templateId
}

/** Sets or clears a week type's time-off mark (FR-TPL-8). Goals reads a working week type instead */
export const setTemplateKind = (d: PlannerState, templateId: string, kind: 'break' | undefined) => {
  const template = getTemplateById(d, templateId)

  if (!template) return

  if (kind) template.kind = kind
  else delete template.kind
}

/** Deletes a week type and its applied weeks. Refused for an unknown id or the last week type; the active one falls back to the first left */
export const deleteTemplate = (d: PlannerState, templateId: string): boolean => {
  const templateIndex = d.templates.findIndex(template => template.id === templateId)

  if (templateIndex === -1) {
    return false
  }

  if (d.templates.length <= 1) {
    return false
  }

  const nextTemplates = d.templates.filter(template => template.id !== templateId)
  const nextAppliedWeeks = d.appliedWeeks.filter(week => week.templateId !== templateId)
  const fallbackTemplateId = nextTemplates[0]?.id ?? null

  d.templates = nextTemplates
  d.appliedWeeks = nextAppliedWeeks
  d.settings.activeTemplateId = d.settings.activeTemplateId === templateId
    ? fallbackTemplateId
    : d.settings.activeTemplateId

  return true
}

/** Renames a template; a blank name keeps the old one, and a name another week type has gets a number (uniqueName) */
export const renameTemplate = (d: PlannerState, templateId: string, name: string) => {
  const template = getTemplateById(d, templateId)
  const trimmed = name.trim()

  if (template && trimmed) template.name = uniqueName(otherNames(d, templateId), trimmed)
}

export const setTemplateColor = (d: PlannerState, templateId: string, color: string) => {
  const template = getTemplateById(d, templateId)
  if (template) template.color = color
}

/** The names of the week types other than this one */
const otherNames = (d: PlannerState, templateId: string): string[] =>
  d.templates.filter(template => template.id !== templateId).map(template => template.name)

export const renameActiveTemplate = (d: PlannerState, name: string) => {
  const template = getActiveTemplate(d)

  if (!template) {
    return
  }

  const trimmed = name.trim()

  if (trimmed) template.name = uniqueName(otherNames(d, template.id), trimmed)
}
