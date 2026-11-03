import { hoursLabel } from '~/utils/planner/format'

/**
 * The one awake-hours rule (FR-SLEEP-9): the hours a week type plans are counted against the hours of the week that are awake.
 * Sleep is never planned time: it is taken out of the 168 hours, and the planned hours leave it out. The grid meta line, the week
 * type chip and the guided tour all read this, so they say the same numbers. Pure: the slots and the Sleep activity's id only.
 */

/** Minutes in a week (7 days of 24 hours) */
export const WEEK_MINUTES = 7 * 24 * 60

export interface AwakeMinutes {
  /** Minutes a week type plans with activities other than Sleep */
  planned: number
  /** Minutes of the week that are not Sleep */
  awake: number
}

/** The planned and awake minutes of a week type; `sleepId` is null when no Sleep activity exists (then every minute is awake) */
export const awakeMinutes = (
  template: { slots: string[]; granularityMinutes: 60 | 30 } | null | undefined,
  sleepId: string | null
): AwakeMinutes => {
  const slots = template?.slots ?? []
  const granularity = template?.granularityMinutes ?? 60
  let planned = 0
  let asleep = 0

  for (const holder of slots) {
    if (!holder) continue
    if (holder === sleepId) asleep += 1
    else planned += 1
  }

  return { planned: planned * granularity, awake: WEEK_MINUTES - asleep * granularity }
}

/** "3 h planned of 105 h awake": the line the grid meta, the chip and the tour share */
export const awakeHoursText = (
  template: { slots: string[]; granularityMinutes: 60 | 30 } | null | undefined,
  sleepId: string | null
): string => {
  const { planned, awake } = awakeMinutes(template, sleepId)

  return `${hoursLabel(planned)} planned of ${hoursLabel(awake)} awake`
}
