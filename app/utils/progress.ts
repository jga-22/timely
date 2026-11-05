import type { PlannerState } from '~/types/planner'
import { adherenceReport } from '~/utils/adherence'
import { addDays, isoWeekOf, mondayOf } from '~/utils/dates'

/**
 * Progress (FR-PROG-1 and 2): the headline in words and the eight-week trend. Both come from the adherence report of the weeks
 * (utils/adherence.ts, the same bars and the same tracking start), so they agree with Progress's detail. The trend counts planned
 * block hours only (the adherence percent falls back to habit ticks for a week with no planned block; the trend does not). A week
 * with no schedule plans nothing: its percent is null, never 0, and the headline never reads "fewer than half" for nothing planned.
 * Pure: dates are passed in; nothing reads the clock.
 */

/** The weeks the headline and the trend cover: the last eight ISO weeks, the current one included */
export const TREND_WEEKS = 8

const pad = (value: number) => String(value).padStart(2, '0')

/** The ISO week key of a date, '2026-W45' (the key the recap is closed for) */
export const weekKeyOf = (date: string): string => {
  const { year, week } = isoWeekOf(date)

  return `${year}-W${pad(week)}`
}

/** One week of the trend, oldest first */
export interface TrendWeek {
  key: string
  week: number
  /** The week holding today: its figure is so far, and its bar is dashed until it ends */
  current: boolean
  /** At or after the first tick (counted); a week before the first tick is not tracked yet */
  tracked: boolean
  /** Planned block hours of the week, counted up to today (0 for a week with nothing planned) */
  planned: number
  /** Ticked block hours */
  done: number
  /** Whole percent of the planned hours ticked, or null when nothing is planned */
  percent: number | null
}

/** The Mondays of the last `count` ISO weeks, the week of today last; oldest first */
export const trendStarts = (today: string, count = TREND_WEEKS): string[] => {
  const monday = mondayOf(today)

  return Array.from({ length: count }, (_, index) => addDays(monday, -7 * (count - 1 - index)))
}

/** The trend of the last weeks, from the weekly bars of the adherence report (the same numbers as Progress's detail) */
export const weekTrend = (state: PlannerState, today: string, count = TREND_WEEKS): TrendWeek[] => {
  const starts = trendStarts(today, count)
  const years: number[] = []

  for (let year = Number(starts[0]!.slice(0, 4)); year <= Number(today.slice(0, 4)); year += 1) years.push(year)

  const bars = new Map(adherenceReport(state, years, today, 'week').bars.map(bar => [bar.key, bar]))
  const currentKey = weekKeyOf(today)

  return starts.map((start) => {
    const key = weekKeyOf(start)
    const bar = bars.get(key)
    const planned = bar?.measure.blockHours.planned ?? 0
    const done = bar?.measure.blockHours.done ?? 0

    return {
      key,
      week: isoWeekOf(start).week,
      current: key === currentKey,
      tracked: Boolean(bar),
      planned,
      done,
      percent: planned > 0 ? Math.round((done / planned) * 100) : null
    }
  })
}

/** The share of planned hours ticked, in words (the A2 thresholds: .85, .7 and .45) */
export const inWords = (ratio: number): string => {
  if (ratio >= 0.85) return 'nearly all'
  if (ratio >= 0.7) return 'about three in four'
  if (ratio >= 0.45) return 'about half'

  return 'fewer than half'
}

/** The headline: 'words' when hours were planned and ticked over the tracked weeks; 'no-ticks' before any tick; 'nothing-planned' when no hour was planned */
export type HeadlineState = 'no-ticks' | 'nothing-planned' | 'words'

export interface Headline {
  state: HeadlineState
  /** The share in words, for the 'words' state only */
  words: string | null
  /** Tracked weeks with planned hours in the trend (a blank week is not counted in the words) */
  weeks: number
  planned: number
  done: number
}

/** The headline over the tracked weeks of the trend; `ticked` is whether any tick exists (trackingStartOf) */
export const progressHeadline = (trend: TrendWeek[], ticked: boolean): Headline => {
  const tracked = trend.filter(week => week.tracked)
  const planned = tracked.reduce((sum, week) => sum + week.planned, 0)
  const done = tracked.reduce((sum, week) => sum + week.done, 0)
  const base = { weeks: tracked.filter(week => week.planned > 0).length, planned, done }

  if (!ticked) return { ...base, state: 'no-ticks', words: null }
  if (planned <= 0) return { ...base, state: 'nothing-planned', words: null }

  return { ...base, state: 'words', words: inWords(done / planned) }
}

/** The headline sentence, split so the share can be emphasised: `words` is null when the sentence has no share */
export interface HeadlineLine {
  lead: string
  words: string | null
  tail: string
}

const NUMBER_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']

/** The headline in plain words for the state; the weeks are named by count ("the last eight weeks", "this week so far") */
export const headlineLine = (headline: Headline): HeadlineLine => {
  if (headline.state === 'no-ticks') return { lead: 'Your progress starts with your first tick.', words: null, tail: '' }
  if (headline.state === 'nothing-planned') return { lead: 'Nothing was planned in these weeks yet.', words: null, tail: '' }

  const span = headline.weeks <= 1 ? 'this week so far' : `the last ${NUMBER_WORDS[headline.weeks] ?? headline.weeks} weeks`

  return { lead: `Over ${span} you ticked`, words: headline.words, tail: 'of the hours you planned.' }
}
