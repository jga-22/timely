/**
 * The first-run draft (FR-ONB, slice 9): the answers become habits, activities and one-hour sessions in the week, inside the
 * hours the user can give. Pure: the caller passes today's date key. Nothing here is saved; `draftToState` (toState.ts) does that.
 */
import type { HabitPeriod } from '~/types/planner'
import { weekdayOf } from '~/utils/dates'
import { clockLabel } from '~/utils/sleep'
import { createLifeAreas } from '~/utils/planner/seed'
import { EVENING_START, FIRST_RUN_HOURS, FIRST_SESSION_HOUR, LAST_SESSION_HOUR, MAX_FIRST_RUN_AREAS, MORNING_START, PREFERRED_WINDOW, ruleFor } from '~/utils/firstRun/rules'

/** The week chips (FR-ONB, "A normal week"): working days, free evenings, free weekends. Sleep is never asked */
export interface FirstRunWeek {
  working: boolean
  evenings: boolean
  weekend: boolean
}

/** Every answer of the first run. Held in session state only */
export interface FirstRunAnswers {
  ambition: string
  /** The chosen life areas, in the order picked (the first one gets the follow-up question) */
  areas: string[]
  /** The follow-up answer per area: an option index, or 'unsure' for the default */
  follow: Record<string, number | 'unsure'>
  week: FirstRunWeek
  hours: number
}

export const emptyAnswers = (): FirstRunAnswers => ({
  ambition: '',
  areas: [],
  follow: {},
  week: { working: false, evenings: false, weekend: false },
  hours: FIRST_RUN_HOURS.default
})

/** A habit of the draft. `name` and `targets` are editable on the draft page; the rest comes from the rules */
export interface DraftHabit {
  id: string
  areaId: string
  name: string
  count: number
  period: HabitPeriod
  /** The activity's short code, or null when the habit has no time in the week */
  code: string | null
  /** Why this habit is in the draft, in one line */
  source: string
}

/** One hour of the week for a habit: weekday 0 is Monday, hour 0 is 12 AM */
export interface DraftSession {
  habitId: string
  weekday: number
  hour: number
}

export interface FirstRunDraft {
  ambition: string
  areas: string[]
  /** The 1-year target of each chosen area, editable */
  targets: Record<string, string>
  habits: DraftHabit[]
  sessions: DraftSession[]
  /** The day order the sessions were placed in (`dayOrder`); the first action follows it */
  order: number[]
  /** Sessions the habits asked for, and the ones that fit the hours */
  asked: number
  placed: number
  hours: number
  /** One line for the draft: "x of y sessions fit your h hours" */
  note: string
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Spread across the week: Monday, Wednesday, Friday, then the rest */
const SPREAD_ORDER = [0, 2, 4, 1, 3, 5, 6]
/** Free weekends and no working days: only Saturday and Sunday, so no session goes on a working day */
const WEEKEND_DAYS = [5, 6]

/**
 * The days sessions go to, first to last. Free weekends with no working days leave only Saturday and Sunday; otherwise every day
 * is used, spread across the week. Today comes first when it is one of those days, so the first session falls on today when it
 * fits (FR-ONB-5)
 */
export const dayOrder = (week: FirstRunWeek, today: string): number[] => {
  const base = week.weekend && !week.working ? WEEKEND_DAYS : SPREAD_ORDER
  const weekday = weekdayOf(today)

  return base.includes(weekday) ? [weekday, ...base.filter(day => day !== weekday)] : base
}

const range = (from: number, to: number): number[] => (to < from ? [] : Array.from({ length: to - from + 1 }, (_, index) => from + index))

/** The hour windows a session tries, in order: the preferred window on every day, then any awake hour */
const windowsFor = (week: FirstRunWeek): number[][] => {
  const start = week.evenings ? EVENING_START : MORNING_START
  return [range(start, Math.min(LAST_SESSION_HOUR, start + PREFERRED_WINDOW - 1)), range(FIRST_SESSION_HOUR, LAST_SESSION_HOUR)]
}

/**
 * Places one session per habit per day, habit by habit, until the hours run out. A habit takes its days in the order given,
 * and never two sessions on one day. Only weekly habits with an activity have sessions (a monthly habit has no time in the week)
 */
const placeSessions = (habits: DraftHabit[], order: number[], week: FirstRunWeek, hours: number) => {
  const taken = new Set<number>()
  const sessions: DraftSession[] = []
  const windows = windowsFor(week)
  let remaining = hours
  let asked = 0

  for (const habit of habits) {
    if (!habit.code || habit.period !== 'week') continue
    asked += habit.count
    const used = new Set<number>()

    for (const hourOptions of windows) {
      for (const day of order) {
        if (used.size >= habit.count || remaining <= 0) break
        if (used.has(day)) continue

        const hour = hourOptions.find(option => !taken.has(day * 24 + option))
        if (hour === undefined) continue

        used.add(day)
        taken.add(day * 24 + hour)
        sessions.push({ habitId: habit.id, weekday: day, hour })
        remaining -= 1
      }
    }
  }

  return { sessions, asked, placed: sessions.length }
}

/** What a follow-up answer says, in the draft's line about the habit */
const sourceLine = (index: number, areaName: string, answer: number | 'unsure' | undefined, label: string): string => {
  if (index > 0) return `A default for ${areaName}. You can change it.`
  if (answer === 'unsure') return `Not sure, so we used the default: ${label}.`
  return `From your answer: ${label}.`
}

const sessionsWord = (count: number) => `session${count === 1 ? '' : 's'}`
const hoursWord = (count: number) => `hour${count === 1 ? '' : 's'}`

/**
 * Builds the draft from the answers. The first chosen area gets its follow-up answer (or the default when unsure); the others
 * get the default. Habits are placed in the order of the areas, so the first area's habits get the hours first
 */
export const buildDraft = (answers: FirstRunAnswers, today: string): FirstRunDraft => {
  const areaNames = new Map(createLifeAreas().map(area => [area.id, area.name]))
  const areas = answers.areas.filter(areaId => ruleFor(areaId)).slice(0, MAX_FIRST_RUN_AREAS)
  const targets: Record<string, string> = {}
  const habits: DraftHabit[] = areas.map((areaId, index) => {
    const rule = ruleFor(areaId)!
    const answer = index === 0 ? answers.follow[areaId] : undefined
    const option = rule.options[typeof answer === 'number' ? answer : 0] ?? rule.options[0]!
    targets[areaId] = rule.target

    return {
      id: `habit-${index + 1}`,
      areaId,
      name: option.habit,
      count: option.count,
      period: option.period,
      code: option.code,
      source: sourceLine(index, areaNames.get(areaId) ?? areaId, answer, option.label)
    }
  })

  const order = dayOrder(answers.week, today)
  const { sessions, asked, placed } = placeSessions(habits, order, answers.week, answers.hours)
  const note = asked === 0
    ? 'None of these habits has a weekly session to place. You can add times in Week.'
    : `${placed} of ${asked} ${sessionsWord(asked)} fit your ${answers.hours} ${hoursWord(answers.hours)}. You can add more later in Week.`

  return { ambition: answers.ambition.trim(), areas, targets, habits, sessions, order, asked, placed, hours: answers.hours, note }
}

/**
 * The first action: the first session in the day order (so today's, when there is one), its habit and time. Null when no
 * habit has a session yet
 */
export const firstActionOf = (draft: FirstRunDraft): { habit: DraftHabit, weekday: number, hour: number } | null => {
  const first = [...draft.sessions].sort((a, b) => draft.order.indexOf(a.weekday) - draft.order.indexOf(b.weekday) || a.hour - b.hour)[0]
  const habit = first && draft.habits.find(item => item.id === first.habitId)

  return first && habit ? { habit, weekday: first.weekday, hour: first.hour } : null
}

/** The first-action line of the draft: "Your first action: Run, today at 6 PM." or "... Saturday at 9 AM." */
export const firstActionLine = (draft: FirstRunDraft, today: string): string => {
  const action = firstActionOf(draft)
  if (!action) return 'Your first action: add one habit in Week.'

  const day = action.weekday === weekdayOf(today) ? 'today' : DAY_NAMES[action.weekday]
  return `Your first action: ${action.habit.name}, ${day} at ${clockLabel(action.hour)}.`
}

/** How often a habit comes, in words: "3 times a week", "once a month" */
export const frequencyText = (count: number, period: HabitPeriod): string => {
  if (count === 1) return `once a ${period}`
  return `${count} times a ${period}`
}

/** Why the draft can't be accepted yet, or null. The ambition and every habit name are needed */
export const draftProblem = (draft: FirstRunDraft): string | null => {
  if (!draft.ambition.trim()) return 'Write your 5-year ambition in a sentence.'
  if (draft.habits.some(habit => !habit.name.trim())) return 'Each habit needs a name.'
  return null
}
