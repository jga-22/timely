/**
 * Lifecycle ops: replacing the whole state in one step (load, sign-out, reset). Owns replaceStateInto
 */
import type { PlannerState } from '~/types/planner'
import { sanitiseDone } from '~/utils/done'

/** Replaces the whole state in place with `next`, so nothing of the previous state (a journal, a stale onboarding flag) carries over */
export const replaceStateInto = (d: PlannerState, next: PlannerState) => {
  Object.assign(d, next)
  if (next.onboarding === undefined) delete d.onboarding
  // Done ticks are per user (FR-HOME-14): a save without them, or a malformed map, starts with none
  d.done = sanitiseDone(next.done)
}
