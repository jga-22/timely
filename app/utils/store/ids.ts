/**
 * Id helper of the store ops. Ops never read the clock: the store reads the clock once per action and passes it as a stamp
 */

/** A new id from its prefix and a stamp, with an optional suffix (`activity-1700000000000-0`) */
export const newId = (prefix: string, stamp: number, suffix?: string | number): string =>
  suffix === undefined ? `${prefix}-${stamp}` : `${prefix}-${stamp}-${suffix}`
