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
