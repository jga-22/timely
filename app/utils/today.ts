import type { Category, Habit, PlannerState } from '~/types/planner'
import { addDays, mondayOf } from '~/utils/dates'
import { blockDoneKey, habitDoneKey, isDone, weekTicks } from '~/utils/done'
import { dayBlocks, dayHabits, habitHasDay, habitPlannedOn, habitProgressText, habitTicked, type HourRange } from '~/utils/home'
import { partOfDay } from '~/utils/motion'
import { sleepActivityId } from '~/utils/sleep'

/**
 * Today (FR-TODAY-1 to 9): the rules the screen reads, pure over the planner state. Every date and minute is passed in, so the
 * tests need no clock (FR-DATE-6). The ticks are the done keys of utils/done.ts; nothing here stores anything.
 *
 * A day's items are its scheduled blocks (in time order) and its daily habits (the habits due every day). They are the only
 * things the focus walks, the only things "x of y done" counts, and the only things that make the day done. Weekly and monthly
 * habits are never items: they sit in the All habits list, and a tick there changes none of this.
 */

/** One thing to do on a day (FR-HOME-14): a scheduled block, or a habit. Times are whole hours; a habit has none */
export interface TodayItem {
  key: string
  kind: 'block' | 'habit'
  title: string
  start: number | null
  end: number | null
  categoryId: string | null
  done: boolean
}

/** One day of the week strip (FR-TODAY-6): its state is full, part, none, free or future; `word` is the screen-reader word */
export type StripState = 'full' | 'part' | 'none' | 'free' | 'future'

export interface StripDay {
  date: string
  letter: string
  name: string
  state: StripState
  word: string
  isToday: boolean
}

export interface WeekStrip {
  days: StripDay[]
  done: number
  planned: number
}

/** One habit in the All habits list (FR-TODAY-8): its tick for the day, whether a block stands for it, and its line of meta */
export interface TodayHabitRow {
  key: string
  habit: Habit
  done: boolean
  planned: boolean
  meta: string
}

/** The state of a countdown to a block, and its text as Today shows it */
export interface Countdown {
  state: 'soon' | 'later' | 'now' | 'ended' | 'last'
  text: string
}

/** The count of a day (FR-HOME-17): the ticked items, all of them, and the word for the day ("today" or "that day") */
export interface DoneCount {
  done: number
  total: number
  when: string
}

/** A label under the day line (FR-TODAY-7): the hour, its text, its place as a CSS percentage and the edge it sits on */
export interface AxisLabel {
  hour: number
  label: string
  left: string
  edge: 'start' | 'middle' | 'end'
}

/** One block on the day line (FR-TODAY-7): its place as CSS percentages of the range, its life area and whether it is ticked */
export interface DayLineBlock {
  key: string
  left: string
  width: string
  categoryId: string | null
  done: boolean
}

/** The id of the heading of the card: the shell moves the keyboard there when the day is done and no tick is left to take it */
export const TODAY_FOCUS_TITLE = 'today-focal-title'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const STRIP_WORDS: Record<StripState, string> = {
  full: 'all done',
  part: 'some done',
  none: 'not ticked',
  free: 'nothing planned',
  future: 'not yet'
}

/** An hour of the clock as the mockup writes it: "7 AM", "12 PM", "10 PM" (midnight is "12 AM") */
export const clockHour = (hour: number): string => {
  const h = hour % 24
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`
}

/** A span of the clock: "9 AM to 10 AM" */
export const timeSpan = (start: number, end: number): string => `${clockHour(start)} to ${clockHour(end)}`

/** How often a habit is due, in the mockup's words: "Every day", "Once a week", "3 times a week", "2 times a month" */
export const habitFrequencyText = ({ count, period }: Habit['frequency']): string => {
  if (period === 'day') return 'Every day'
  if (count === 1) return `Once a ${period}`

  return `${count} times a ${period}`
}

/** A minute count as "40 min", "1 h" or "1 h 20 min" */
const durationText = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`

  const rest = minutes % 60
  return `${Math.floor(minutes / 60)} h${rest ? ` ${rest} min` : ''}`
}

/** The blocks of a day as items, in the order the day runs */
const blockItems = (state: PlannerState, date: string, showSleep: boolean): TodayItem[] =>
  dayBlocks(state, date, showSleep).map((block): TodayItem => {
    const activity = state.activities.find(item => item.id === block.activityId)

    return {
      key: blockDoneKey(block.activityId, block.start),
      kind: 'block',
      title: activity?.name ?? '',
      start: block.start,
      end: block.end,
      categoryId: activity?.categoryId ?? null,
      done: isDone(state, date, blockDoneKey(block.activityId, block.start))
    }
  })

/** A habit as an item of a day (its tick is its habit key) */
export const habitItem = (state: PlannerState, habit: Habit, date: string): TodayItem => ({
  key: habitDoneKey(habit.id),
  kind: 'habit',
  title: habit.name,
  start: null,
  end: null,
  categoryId: habit.categoryId,
  done: habitTicked(state, habit, date)
})

/** The day's items (the count base): its blocks in time order, then its daily habits. Sleep is left out unless it is shown */
export const todayItems = (state: PlannerState, date: string, showSleep = false): TodayItem[] => {
  const daily = dayHabits(state, date, showSleep)
    .filter(habit => habit.frequency.period === 'day')
    .map(habit => habitItem(state, habit, date))

  return [...blockItems(state, date, showSleep), ...daily]
}

/** The first item not done, in list order; null when all are done or the list is empty */
export const firstUndone = (items: TodayItem[]): TodayItem | null => items.find(item => !item.done) ?? null

/** Whether there is at least one item and every item is done (the "Today is done" state) */
export const allItemsDone = (items: TodayItem[]): boolean => items.length > 0 && items.every(item => item.done)

/**
 * The one item to do next (FR-TODAY-2): the first undone item of the day in list order, that is the first undone block in time
 * order, then the first undone daily habit. The focus walks only the day's items (`todayItems`), so a tick by the focus and a
 * tick in the list leave the same state. Null when the day has no items (nothing planned: the plan action shows instead) and
 * when every item is done (today is done)
 */
export const focusItem = (state: PlannerState, date: string, showSleep = false): TodayItem | null =>
  firstUndone(todayItems(state, date, showSleep))

/** The count of a day (FR-HOME-17): the ticked items and all of them. The numbers always show (Calm keeps every number) */
export const doneCount = (items: TodayItem[], isToday: boolean): DoneCount => ({
  done: items.filter(item => item.done).length,
  total: items.length,
  when: isToday ? 'today' : 'that day'
})

/**
 * The line after a tick (the mockup's cheer): nothing once the day is done, a word for the last one, a start for the first one,
 * then one of three steady lines by the count. Warm, never a score
 */
export const cheerLine = ({ done, total }: Pick<DoneCount, 'done' | 'total'>): string => {
  if (!total || done === total) return ''
  if (total - done === 1) return 'Last one for today. You are nearly there.'
  if (done === 1) return 'A first one is a real start.'

  return ['Steady. Nicely paced.', 'That is how a week gets built.', 'Good rhythm. No rush.'][done % 3]!
}

/** The quiet pill on the last item still to do on today (the mockup's "Last one for today") */
export const LAST_ONE_TEXT = 'Last one for today'

/**
 * The day line's blocks (FR-TODAY-7): the day's blocks clipped to the range, each as a place on it. Daily habits are not on the
 * line: they have no hours. A block ticked is filled; one not yet ticked is a tint with its outline (the shell draws both)
 */
export const dayLineBlocks = (items: TodayItem[], range: HourRange): DayLineBlock[] => {
  const span = range.end - range.start

  return items
    .filter(item => item.kind === 'block')
    .map((item): DayLineBlock => {
      const start = Math.max(item.start!, range.start)
      const end = Math.min(item.end!, range.end)

      return {
        key: item.key,
        left: `${(((start - range.start) / span) * 100).toFixed(2)}%`,
        width: `${(((end - start) / span) * 100).toFixed(2)}%`,
        categoryId: item.categoryId,
        done: item.done
      }
    })
}

/**
 * The hour labels under the day line (FR-TODAY-7): the two ends of the range, and 12 and 18 when they fall inside it. With the
 * usual awake range of 7 AM to 10 PM this is the mockup's axis: 7 AM, 12 PM, 6 PM, 10 PM
 */
export const dayLineAxis = (range: HourRange): AxisLabel[] => {
  const hours = [range.start, ...[12, 18].filter(hour => hour > range.start && hour < range.end), range.end]
  const span = range.end - range.start

  return hours.map((hour, index) => ({
    hour,
    label: clockHour(hour),
    left: `${(((hour - range.start) / span) * 100).toFixed(2)}%`,
    edge: index === 0 ? 'start' : index === hours.length - 1 ? 'end' : 'middle'
  }))
}

/**
 * The countdown to a block, minutes from midnight (FR-TODAY-3): "In 40 min" within three hours before it, "Starts at 9 AM" before
 * that, "On now · 1 h left" while it runs, and "Ended at 3 PM. Tick it if it happened." after it
 */
export const countdownText = (start: number, end: number, minute: number): Countdown => {
  if (minute < start) {
    const diff = start - minute

    return diff <= 180
      ? { state: 'soon', text: `In ${durationText(diff)}` }
      : { state: 'later', text: `Starts at ${clockHour(Math.floor(start / 60))}` }
  }

  if (minute < end) return { state: 'now', text: `On now · ${durationText(end - minute)} left` }

  return { state: 'ended', text: `Ended at ${clockHour(Math.floor(end / 60))}. Tick it if it happened.` }
}

const GREETINGS = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' } as const

/** "Good morning, Sam." with a name, "Good morning." without one (the name is the sign-in name, Supabase mode only) */
export const greeting = (minute: number, name = ''): string => `${GREETINGS[partOfDay(minute)]}${name ? `, ${name}` : ''}.`

/** The first word of a full name, '' when there is none */
export const firstNameOf = (fullName: string): string => fullName.trim().split(/\s+/)[0] ?? ''

/**
 * The line under the focal item (FR-TODAY-4): "Behind this: <1-year target>". With no target (or one marked to be defined) it
 * names the life area and says so: "Behind this: Economic. No 1-year target yet." (the mockup). Null with no life area at all
 */
export const behindLine = (category: Category | null | undefined): string | null => {
  if (!category) return null

  const target = category.target1y?.trim()
  if (!target || category.targetTbd) return `Behind this: ${category.name}. No 1-year target yet.`

  return `Behind this: ${target}`
}

/**
 * The habit to plan next when today is empty (FR-TODAY-5, in place of A2's "Add Run this evening"): the weekly habit furthest
 * behind its count, with an activity, that no block of this week stands for yet. Null when none is short
 */
export const nextHabitAction = (state: PlannerState, date: string): Habit | null => {
  let best: Habit | null = null
  let gap = 0

  for (const habit of state.habits) {
    if (habit.frequency.period !== 'week' || !habit.activityId) continue
    if (!state.activities.some(item => item.id === habit.activityId)) continue
    if (habitHasDay(state, habit, date)) continue

    const missing = habit.frequency.count - weekTicks(state, habit.id, date)
    if (missing > gap) {
      best = habit
      gap = missing
    }
  }

  return best
}

/**
 * The week strip (FR-TODAY-6): the seven days from the Monday of today's week. A day after today is future; otherwise it is free
 * (nothing due), full (all its items done), part (some done) or none (nothing done yet). The count covers the days up to today
 */
export const weekStrip = (state: PlannerState, today: string, showSleep = false): WeekStrip => {
  const monday = mondayOf(today)
  let done = 0
  let planned = 0

  const days = DAY_NAMES.map((name, index): StripDay => {
    const date = addDays(monday, index)
    const letter = DAY_LETTERS[index]!
    const isToday = date === today

    if (date > today) return { date, letter, name, state: 'future', word: STRIP_WORDS.future, isToday }

    const items = todayItems(state, date, showSleep)
    const ticked = items.filter(item => item.done).length
    const stripState: StripState = !items.length ? 'free' : ticked === items.length ? 'full' : ticked > 0 ? 'part' : 'none'

    done += ticked
    planned += items.length

    return { date, letter, name, state: stripState, word: STRIP_WORDS[stripState], isToday }
  })

  return { days, done, planned }
}

/** The forgiving line under the strip (FR-TODAY-6): counts only; nothing resets, and a missed one costs only itself */
export const stripNote = (strip: Pick<WeekStrip, 'done' | 'planned'>): string =>
  `${strip.done} of ${strip.planned} planned so far. A missed one costs only itself; nothing resets.`

/** The now marker's place on the day line, as a CSS percentage of the range; null when the minute is unknown or outside the range */
export const nowPosition = (minute: number | null, range: HourRange): string | null => {
  if (minute === null) return null

  const from = range.start * 60
  const to = range.end * 60
  if (minute < from || minute > to) return null

  return `${((minute - from) / (to - from)) * 100}%`
}

/** Every habit of the All habits list (FR-TODAY-8), in the order of the habits; sleep habits are left out while sleep is hidden */
export const habitRows = (state: PlannerState, date: string, showSleep = false): TodayHabitRow[] => {
  const sleepId = showSleep ? null : sleepActivityId(state)

  return state.habits
    .filter(habit => !sleepId || habit.activityId !== sleepId)
    .map(habit => {
      const done = habitTicked(state, habit, date)
      const progress = habitProgressText(state, habit, date) ?? (done ? 'Done today' : 'Not yet today')

      return {
        key: habitDoneKey(habit.id),
        habit,
        done,
        planned: habitPlannedOn(state, habit, date),
        meta: `${habitFrequencyText(habit.frequency)} · ${progress}`
      }
    })
}
