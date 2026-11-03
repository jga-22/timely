/**
 * The browser preferences (localStorage), kept outside the planner state so a save and a reset never touch them.
 * One list of keys: the prepaint script (utils/prepaint.ts) and the Privacy page refer to these. Pure, so it runs in node.
 * The stored values are the ones the app has always written: dark is 'true' or 'false', Show sleep is '1' or '0'.
 */
export const PREF_KEYS = {
  dark: 'timely.dark',
  motion: 'timely.motion',
  showSleep: 'timely.showSleep',
  weekClosed: 'timely.weekClosed',
} as const

/** A flag that is on when the stored text is the given one. Anything else (including no value) is off. */
export const parseFlag = (raw: string | null, on: string): boolean => raw === on

/** The text stored for a flag: the 'on' text or the 'off' text */
export const serialiseFlag = (value: boolean, on: string, off: string): string => (value ? on : off)

/** Dark mode: 'true' is on */
export const parseDark = (raw: string | null): boolean => parseFlag(raw, 'true')
export const serialiseDark = (value: boolean): string => serialiseFlag(value, 'true', 'false')

/** Show sleep: '1' is on */
export const parseShowSleep = (raw: string | null): boolean => parseFlag(raw, '1')
export const serialiseShowSleep = (value: boolean): string => serialiseFlag(value, '1', '0')

/** The motion choice the user makes: 'calm' keeps the moving parts still, 'lively' runs them (spec 2.5) */
export type MotionChoice = 'calm' | 'lively'

/** Motion choice: 'calm' only when saved as calm; anything else (no value, an unknown value) is lively */
export const parseMotionChoice = (raw: string | null): MotionChoice => (raw === 'calm' ? 'calm' : 'lively')

/** Week sections folded by the user: '1' is folded */
export const parseWeekClosed = (raw: string | null): boolean => parseFlag(raw, '1')
export const serialiseWeekClosed = (value: boolean): string => serialiseFlag(value, '1', '0')
