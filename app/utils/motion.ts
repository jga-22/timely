/**
 * Motion and time of day (spec/design-system.md, Modes; spec/ux-migration-plan.md 2.5). Pure, so the rules run in node.
 * The prepaint script (utils/prepaint.ts) repeats the hour limits below; tests/unit/prepaint.test.ts keeps the two in step.
 */
import type { MotionChoice } from './prefs'

/** What the page does: 'lively' runs the moving parts, 'calm' keeps every number and state and stops them */
export type Motion = 'calm' | 'lively'

export type PartOfDay = 'morning' | 'afternoon' | 'evening'

/** Hours (local) where the part of the day starts: morning from 5, afternoon from 12, evening from 17 and through the night */
export const PART_START_HOUR = { morning: 5, afternoon: 12, evening: 17 } as const

/**
 * The motion in effect. Reduced motion (the system's prefers-reduced-motion) always means calm, whatever the choice;
 * the choice itself is kept, so the Account menu still shows what the user picked.
 */
export const resolveMotion = (choice: MotionChoice, reduce: boolean): Motion => (reduce || choice === 'calm' ? 'calm' : 'lively')

/** The part of the day for a time given in minutes since midnight (0 to 1439) */
export const partOfDay = (minutes: number): PartOfDay => {
  const hour = Math.floor(minutes / 60)
  if (hour >= PART_START_HOUR.evening || hour < PART_START_HOUR.morning) return 'evening'
  if (hour >= PART_START_HOUR.afternoon) return 'afternoon'
  return 'morning'
}

/** How long the day count takes to climb to its value, in ms (lively only) */
export const COUNT_UP_MS = 520

/**
 * A number counting up (the day count on Today, lively only): the value after `elapsed` ms of `duration`, eased out, whole numbers.
 * It lands on `to` exactly at the end, and at once when there is no time to run.
 */
export const countValue = (from: number, to: number, elapsed: number, duration: number): number => {
  if (duration <= 0 || elapsed >= duration) return to

  const progress = Math.max(0, elapsed) / duration
  return Math.round(from + (to - from) * (1 - (1 - progress) ** 3))
}

/** The tilt of the focal card toward the pointer (lively, mouse only): degrees on the x and y axes, at most 1.4 each way */
export const TILT_DEGREES = 1.4

export const tiltOf = (pointerX: number, pointerY: number, box: { left: number, top: number, width: number, height: number }): { x: number, y: number } => {
  if (box.width <= 0 || box.height <= 0) return { x: 0, y: 0 }

  const px = Math.min(1, Math.max(-1, ((pointerX - box.left) / box.width) * 2 - 1))
  const py = Math.min(1, Math.max(-1, ((pointerY - box.top) / box.height) * 2 - 1))

  return { x: Number((-py * TILT_DEGREES).toFixed(2)), y: Number((px * TILT_DEGREES).toFixed(2)) }
}
