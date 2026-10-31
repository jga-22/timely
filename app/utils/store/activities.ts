/**
 * Activity ops: adding, editing and removing activities, the activity a habit gets from its name (FR-GOALS-24), and the
 * activity of a preset role. Owns createRoleActivity, addActivity, ownActivityFor, updateActivity, removeActivity and ensureSleepActivity
 */
import type { Activity, PlannerState } from '~/types/planner'
import { DESIGN_COLORS, validateActivityFields, type ActivityFieldErrors } from '~/utils/planner'
import { freeShortCode, presetCategoryId } from '~/utils/plannerStore'
import { shortCodeFor } from '~/utils/onboarding'
import { ROLE_LABELS, type PresetRole } from '~/utils/presets'
import { SLEEP_CODE, SLEEP_COLOR, SLEEP_ID, SLEEP_NAME, isSleepActivity, sleepActivityId } from '~/utils/sleep'
import { newId } from '~/utils/store/ids'

/** The Sleep activity, created when the planner has none: Sleep, SLP, the quiet purple, in Physical (FR-SLEEP-2). Null when there is no life area */
export const ensureSleepActivity = (d: PlannerState, stamp: number): string | null => {
  const existing = sleepActivityId(d)
  if (existing) return existing

  const area = presetCategoryId(d.categories, 'sleep')
  if (!area) return null

  const id = d.activities.some(activity => activity.id === SLEEP_ID) ? newId('activity', stamp) : SLEEP_ID
  d.activities.push({ id, name: SLEEP_NAME, shortCode: SLEEP_CODE, categoryId: area, color: SLEEP_COLOR })

  return id
}

/** An activity for a preset role: the existing one with the same name, else a new one. Null when it cannot be created */
export const createRoleActivity = (d: PlannerState, role: PresetRole, index: number, stamp: number): string | null => {
  // Sleep is the one activity with a key: it is found by its code, or created with it (FR-SLEEP-1, 2)
  if (role === 'sleep') return ensureSleepActivity(d, stamp)

  const label = ROLE_LABELS[role]
  const existing = d.activities.find(activity => activity.name.trim().toLowerCase() === label.toLowerCase())

  if (existing) {
    return existing.id
  }

  const categoryId = presetCategoryId(d.categories, role)
  const shortCode = shortCodeFor(label)

  if (!categoryId || Object.keys(validateActivityFields(d, { name: label, shortCode, categoryId })).length) {
    return null
  }

  const usedColors = new Set(d.activities.map(activity => activity.color.toLowerCase()))
  const id = newId('activity', stamp, index)

  d.activities.push({
    id,
    name: label,
    shortCode,
    categoryId,
    color: DESIGN_COLORS.find(color => !usedColors.has(color.bg.toLowerCase()))?.bg ?? DESIGN_COLORS[0]!.bg
  })

  return id
}

/** Adds an activity; it takes the category colour unless one is given. Returns the new id, or null when invalid */
export const addActivity = (d: PlannerState, name: string, shortCode: string, categoryId: string, color: string | undefined, stamp: number): string | null => {
  const fields = { name, shortCode, categoryId }

  if (Object.keys(validateActivityFields(d, fields)).length) {
    return null
  }

  const category = d.categories.find(item => item.id === categoryId)
  const id = newId('activity', stamp)

  d.activities.push({
    id,
    name: name.trim(),
    shortCode: shortCode.trim().toUpperCase(),
    categoryId,
    color: color ?? category?.color ?? '#685847'
  })

  return id
}

/**
 * The activity a habit gets from its name (FR-GOALS-24): the activity of that name in the life area when there is one, else a new
 * activity with the life area colour and a free short code. Returns its id, or the error; nothing is added on error
 */
export const ownActivityFor = (d: PlannerState, categoryId: string, name: string, stamp: number): { id: string } | { error: string } => {
  const trimmed = name.trim()
  const existing = d.activities.find(activity => activity.categoryId === categoryId && activity.name.trim().toLowerCase() === trimmed.toLowerCase())

  if (existing) {
    return { id: existing.id }
  }

  const shortCode = freeShortCode(d, trimmed)

  if (!shortCode) {
    return { error: 'No short code is free for this name. Link an existing activity instead.' }
  }

  const id = addActivity(d, trimmed, shortCode, categoryId, undefined, stamp)
  return id ? { id } : { error: 'The activity could not be added. Check the life area.' }
}

/** Changes any of the given fields at once. Returns the field errors; nothing changes when there are any */
export const updateActivity = (d: PlannerState, activityId: string, changes: Partial<Pick<Activity, 'name' | 'shortCode' | 'categoryId' | 'color'>>): ActivityFieldErrors => {
  const activity = d.activities.find(item => item.id === activityId)

  if (!activity) {
    return {}
  }

  const errors = validateActivityFields(d, changes, activityId)

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
}

/** Removes an activity: its hours go in every week type and its habits let go of it. The Sleep activity is never removed */
export const removeActivity = (d: PlannerState, activityId: string) => {
  // The Sleep activity cannot be deleted: it is built in, and hiding it is the way to keep it out of view (FR-SLEEP-3)
  if (isSleepActivity(d.activities.find(activity => activity.id === activityId))) return

  const nextActivities = d.activities.filter(activity => activity.id !== activityId)

  if (nextActivities.length === d.activities.length) {
    return
  }

  d.activities = nextActivities

  for (const template of d.templates) {
    template.slots = template.slots.map(slot => slot === activityId ? '' : slot)
  }

  for (const habit of d.habits) {
    if (habit.activityId === activityId) delete habit.activityId
  }
}
