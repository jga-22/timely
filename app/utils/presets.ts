import type { Activity, PlannerState, WeekTemplate } from '~/types/planner'
import { createEmptySlots } from '~/utils/planner/slots'
import { goalsTemplate } from '~/utils/planner/templates'
import { sleepActivityId } from '~/utils/sleep'

/** The three roles a preset paints. Free time and meals are never painted (FR-TPL-6) */
export type PresetRole = 'sleep' | 'work' | 'exercise'

export const PRESET_ROLES: PresetRole[] = ['sleep', 'work', 'exercise']

export const ROLE_LABELS: Record<PresetRole, string> = {
  sleep: 'Sleep',
  work: 'Work',
  exercise: 'Exercise'
}

/** Names an existing activity may carry for each role (matched case-insensitively). Sleep has no name: only its SLP code matches (FR-SLEEP-2) */
const ROLE_ALIASES: Record<PresetRole, string[]> = {
  sleep: [],
  work: ['work', 'focused work', 'deep work', 'job'],
  exercise: ['exercise', 'training', 'sport', 'gym']
}

/** One block of one role on some days; hours are 0 to 23 and the end is exclusive */
export interface PresetBlock {
  role: PresetRole
  start: number
  end: number
  /** Day indexes, 0 is Monday and 6 is Sunday */
  days: number[]
}

export type PresetId = 'standard' | 'deep-work' | 'light' | 'vacation'

export interface Preset {
  id: PresetId
  name: string
  description: string
  /** 'break' marks time off: Goals reads a working week type instead */
  kind?: 'break'
  /** Whether a new week type keeps the hours of habit-linked activities by default */
  keepHabitsDefault: boolean
  blocks: PresetBlock[]
}

const WEEKDAYS = [0, 1, 2, 3, 4]
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

/** Standard: sleep, work and three exercise sessions a week. Deep work and Light change only the work blocks */
/** The default night (FR-SLEEP-2): 10 PM to 7 AM every night, as the Sleep activity's default in every week type */
const SLEEP_BLOCKS: PresetBlock[] = [
  { role: 'sleep', start: 0, end: 7, days: EVERY_DAY },
  { role: 'sleep', start: 22, end: 24, days: EVERY_DAY }
]

const STANDARD_BLOCKS: PresetBlock[] = [
  ...SLEEP_BLOCKS,
  { role: 'work', start: 9, end: 12, days: WEEKDAYS },
  { role: 'work', start: 13, end: 17, days: WEEKDAYS },
  { role: 'exercise', start: 18, end: 19, days: [0, 2, 4] }
]

export const PRESETS: Preset[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Sleep, work on weekdays and three exercise sessions a week.',
    keepHabitsDefault: true,
    blocks: STANDARD_BLOCKS
  },
  {
    id: 'deep-work',
    name: 'Deep work',
    description: 'Standard with longer work blocks, and a morning on Saturday.',
    keepHabitsDefault: true,
    blocks: [
      ...STANDARD_BLOCKS.filter(block => block.role !== 'work'),
      { role: 'work', start: 8, end: 12, days: WEEKDAYS },
      { role: 'work', start: 13, end: 18, days: WEEKDAYS },
      { role: 'work', start: 9, end: 12, days: [5] }
    ]
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Standard with one short work block a day.',
    keepHabitsDefault: true,
    blocks: [
      ...STANDARD_BLOCKS.filter(block => block.role !== 'work'),
      { role: 'work', start: 9, end: 13, days: WEEKDAYS }
    ]
  },
  {
    id: 'vacation',
    name: 'Vacation',
    description: 'Sleep only. Goals reads a working week type instead.',
    kind: 'break',
    keepHabitsDefault: false,
    blocks: SLEEP_BLOCKS
  }
]

export const getPreset = (presetId: string): Preset | undefined => PRESETS.find(preset => preset.id === presetId)

/**
 * The activity a role maps to by default: the first activity whose name is one of the role's aliases, or null.
 * The match is by name only, so a renamed activity is not found
 */
export const matchRole = (state: Pick<PlannerState, 'activities'>, role: PresetRole): string | null => {
  if (role === 'sleep') return sleepActivityId(state)

  const aliases = ROLE_ALIASES[role]
  const match: Activity | undefined = state.activities.find(activity => aliases.includes(activity.name.trim().toLowerCase()))

  return match?.id ?? null
}

/** Role mapping: an activity id, or null to leave the role's hours empty */
export type RoleMap = Partial<Record<PresetRole, string | null>>

/**
 * Slots of a new week type from a preset (FR-TPL-8). With keepHabits, the hours of every habit-linked activity are
 * copied first from the Goals week type, so habit sessions stay where they are. The role blocks then fill only the
 * empty hours; a role with no activity in the map is left empty.
 */
export const buildPresetSlots = (state: PlannerState, preset: Preset, roleMap: RoleMap, keepHabits: boolean): string[] => {
  const slots = createEmptySlots(60)

  if (keepHabits) {
    const source = goalsTemplate(state)
    const linked = new Set(state.habits.map(habit => habit.activityId).filter((id): id is string => !!id))

    source?.slots.forEach((holder, index) => {
      if (holder && linked.has(holder)) slots[index] = holder
    })
  }

  for (const block of preset.blocks) {
    const activityId = roleMap[block.role]
    if (!activityId) continue

    for (const day of block.days) {
      for (let hour = block.start; hour < block.end; hour += 1) {
        const index = day * 24 + hour
        if (!slots[index]) slots[index] = activityId
      }
    }
  }

  return slots
}

/** The template fields a preset gives a new week type; the store adds the id, name, colour and active flag */
export const presetTemplateFields = (preset: Preset): Pick<WeekTemplate, 'description' | 'granularityMinutes' | 'kind'> => ({
  description: preset.description,
  granularityMinutes: 60,
  ...(preset.kind ? { kind: preset.kind } : {})
})
