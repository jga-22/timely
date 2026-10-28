import type { Activity } from '~/types/planner'

/**
 * Sleep (FR-SLEEP-1 to 8). The activity whose short code is SLP is the Sleep activity: the code is its key, no other activity may
 * carry it, and it keeps it. Sleep is painted as ordinary hours in each hourly week type, so this module works on slot arrays and
 * the activity id only, and never imports the planner (no cycle). Pure, so it runs in node.
 */

/** The short code that marks the Sleep activity (FR-SLEEP-1) */
export const SLEEP_CODE = 'SLP'
/** Id, name and colour of the Sleep activity a new user, a reset or the sample data gets (FR-SLEEP-2) */
export const SLEEP_ID = 'sleep'
export const SLEEP_NAME = 'Sleep'
export const SLEEP_COLOR = '#6e5c7c'

/** One night: the hour it starts and the hour it ends (0 to 23). A bedtime later than the wake-up crosses midnight */
export interface SleepWindow {
  bedtime: number
  wake: number
}

/** The nights of some days that share one window. Days are indexes: 0 is Monday, 6 is Sunday */
export interface SleepGroup {
  days: number[]
  window: SleepWindow
}

/** The default night (FR-SLEEP-2): 10 PM to 7 AM, every night */
export const DEFAULT_SLEEP: SleepWindow = { bedtime: 22, wake: 7 }
export const ALL_NIGHTS = [0, 1, 2, 3, 4, 5, 6]
export const WEEKDAY_NIGHTS = [0, 1, 2, 3, 4]
export const WEEKEND_NIGHTS = [5, 6]

const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const isSleepActivity = (activity: Pick<Activity, 'shortCode'> | null | undefined): boolean =>
  (activity?.shortCode ?? '').trim().toUpperCase() === SLEEP_CODE

export const sleepActivityId = (state: { activities: Activity[] }): string | null =>
  state.activities.find(activity => isSleepActivity(activity))?.id ?? null

/** An hour as the editor and the result text show it: "10 PM", "12 AM" */
export const clockLabel = (hour: number): string => {
  const h = ((hour % 24) + 24) % 24

  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

/** Hours of one night: from bedtime to wake-up, across midnight when the bedtime is later; 0 when they are equal */
export const nightHours = ({ bedtime, wake }: SleepWindow): number =>
  bedtime === wake ? 0 : bedtime > wake ? 24 - bedtime + wake : wake - bedtime

/** A window whose bedtime and wake-up are the same hour is refused: it would be 0 hours, or 24 with no way to tell them apart */
export const sleepWindowError = ({ bedtime, wake }: SleepWindow): string | null =>
  bedtime === wake ? 'Bedtime and wake-up must be different hours' : null

/** Sleep hours a week of the groups: each night counted once */
export const sleepHoursPerWeek = (groups: SleepGroup[]): number =>
  groups.reduce((total, group) => total + group.days.length * nightHours(group.window), 0)

/** "Mon 10 PM to Tue 6 AM": the night of one day, from its bedtime to its wake-up */
export const nightLabel = (day: number, { bedtime, wake }: SleepWindow): string => {
  const endDay = bedtime > wake ? (day + 1) % 7 : day
  return `${SHORT_DAYS[day]} ${clockLabel(bedtime)} to ${SHORT_DAYS[endDay]} ${clockLabel(wake)}`
}

/** "10 PM to 6 AM" */
export const windowLabel = ({ bedtime, wake }: SleepWindow): string => `${clockLabel(bedtime)} to ${clockLabel(wake)}`

const hoursOf = (day: number, start: number, end: number): number[] =>
  Array.from({ length: Math.max(0, end - start) }, (_, offset) => day * 24 + start + offset)

/**
 * Slot indexes (day * 24 + hour) of one night. A night that crosses midnight paints the rest of its day, then the start of the
 * next one: Sunday's night ends on Monday, in the same week. A refused window paints nothing
 */
export const sleepNightCells = (day: number, window: SleepWindow): number[] => {
  if (sleepWindowError(window)) return []

  const { bedtime, wake } = window

  if (bedtime < wake) return hoursOf(day, bedtime, wake)
  return [...hoursOf(day, bedtime, 24), ...hoursOf((day + 1) % 7, 0, wake)]
}

/** Every slot the groups paint, each once */
export const sleepCells = (groups: SleepGroup[]): number[] =>
  [...new Set(groups.flatMap(group => group.days.flatMap(day => sleepNightCells(day, group.window))))]

export interface SleepPaint {
  slots: string[]
  /** Hours the nights took from other activities, per activity: for the result text */
  replaced: Array<{ activityId: string; hours: number }>
}

/**
 * The slots with the Sleep activity's hours cleared, then the groups' nights painted with it (FR-SLEEP-5). Hours held by other
 * activities are replaced. The length never changes and the input is not mutated
 */
export const paintSleep = (slots: string[], sleepId: string, groups: SleepGroup[]): SleepPaint => {
  const next = slots.map(holder => (holder === sleepId ? '' : holder))
  const taken = new Map<string, number>()

  for (const index of sleepCells(groups)) {
    if (index < 0 || index >= next.length) continue

    const holder = next[index]
    if (holder) taken.set(holder, (taken.get(holder) ?? 0) + 1)
    next[index] = sleepId
  }

  return { slots: next, replaced: [...taken].map(([activityId, hours]) => ({ activityId, hours })) }
}

/** The groups of the editor: one window for every night, or one for weekday nights and one for weekend nights */
export const sleepGroupsOf = (split: boolean, weekdays: SleepWindow, weekend: SleepWindow): SleepGroup[] =>
  split
    ? [{ days: WEEKDAY_NIGHTS, window: weekdays }, { days: WEEKEND_NIGHTS, window: weekend }]
    : [{ days: ALL_NIGHTS, window: weekdays }]

export interface SleepRun {
  start: number
  /** Exclusive */
  end: number
}

/** The runs of sleep in one day, in hour order */
const sleepRuns = (slots: string[], sleepId: string, day: number): SleepRun[] => {
  const runs: SleepRun[] = []
  let start = -1

  for (let hour = 0; hour <= 24; hour += 1) {
    const asleep = hour < 24 && slots[day * 24 + hour] === sleepId

    if (asleep && start < 0) start = hour
    else if (!asleep && start >= 0) {
      runs.push({ start, end: hour })
      start = -1
    }
  }

  return runs
}

/**
 * The night of one day as the slots paint it, or null. The run that ends the day gives the bedtime, and the run that starts the
 * next day gives the wake-up (0 when there is none). A run inside the day alone is a window within that day. A run from midnight
 * after a night that crosses midnight is that night's wake-up, not a window of its own
 */
const nightWindow = (slots: string[], sleepId: string, day: number): SleepWindow | null => {
  const runs = sleepRuns(slots, sleepId, day)
  const evening = runs.find(run => run.end === 24)

  if (evening) {
    const morning = sleepRuns(slots, sleepId, (day + 1) % 7).find(run => run.start === 0)
    return { bedtime: evening.start, wake: morning?.end ?? 0 }
  }

  const wrapped = sleepRuns(slots, sleepId, (day + 6) % 7).some(run => run.end === 24)
  const within = runs.find(run => !(wrapped && run.start === 0))

  return within ? { bedtime: within.start, wake: within.end } : null
}

/** The most common window of some nights (the first one wins a tie); null when none has a window */
const mostCommon = (windows: Array<SleepWindow | null>): SleepWindow | null => {
  const counts = new Map<string, { window: SleepWindow; count: number }>()

  for (const window of windows) {
    if (!window) continue

    const key = `${window.bedtime}-${window.wake}`
    const entry = counts.get(key)

    if (entry) entry.count += 1
    else counts.set(key, { window, count: 1 })
  }

  let best: { window: SleepWindow; count: number } | undefined

  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry
  }

  return best?.window ?? null
}

export interface SleepReading {
  /** Weekday nights and weekend nights have different windows */
  split: boolean
  /** The window of the weekday nights (every night when not split) */
  weekdays: SleepWindow | null
  /** The window of the weekend nights (every night when not split) */
  weekend: SleepWindow | null
}

/** The current sleep of a week type, read back from its painted hours (most common window per group) for the editor */
export const readSleep = (slots: string[], sleepId: string): SleepReading => {
  const nights = ALL_NIGHTS.map(day => nightWindow(slots, sleepId, day))
  const weekdays = mostCommon(WEEKDAY_NIGHTS.map(day => nights[day] ?? null))
  const weekend = mostCommon(WEEKEND_NIGHTS.map(day => nights[day] ?? null))

  if (weekdays && weekend && (weekdays.bedtime !== weekend.bedtime || weekdays.wake !== weekend.wake)) {
    return { split: true, weekdays, weekend }
  }

  const every = mostCommon(nights)
  return { split: false, weekdays: every, weekend: every }
}

/** "10 PM to 6 AM", or with the weekend window when the nights differ */
export const sleepSummary = (reading: SleepReading): string => {
  const when = (window: SleepWindow | null) => (window ? windowLabel(window) : 'not set')

  return reading.split
    ? `${when(reading.weekdays)} on weekdays, ${when(reading.weekend)} at weekends`
    : when(reading.weekdays)
}

/** The default night painted over the slots of a week type: empty slots of an hourly week type get the Sleep activity */
export const paintDefaultSleep = (slots: string[], sleepId: string): string[] =>
  paintSleep(slots, sleepId, [{ days: ALL_NIGHTS, window: DEFAULT_SLEEP }]).slots
