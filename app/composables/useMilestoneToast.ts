import type { PlannerState } from '~/types/planner'
import { dayIsDone, newMilestones, pickToast, type ToastLine } from '~/utils/milestones'
import { PREF_KEYS, parseLastToast, serialiseLastToast } from '~/utils/prefs'

/** A toast on screen: its line and an id, so a new one restarts its timer */
export interface AppToast extends ToastLine {
  id: number
}

/**
 * The one toast of the app shell (AppToast.vue): a milestone or the calm line, after a tick on Today (slice 11). At most one a day:
 * the day of the last toast is kept in `timely.lastToast`, and a second one that day is not shown. A toast is a line, never a block;
 * the milestone it names stays on the Progress card either way.
 */
export const useMilestoneToast = () => {
  const toast = useState<AppToast | null>('app-toast', () => null)
  const { milestonesOn, celebrateOn } = useMilestoneSettings()
  const lastToast = usePref<string | null>(PREF_KEYS.lastToast, { fallback: null, parse: parseLastToast, serialise: serialiseLastToast })

  /** After a tick: the state before it and after it, the day of the tick and whether the day's items are shown (Sleep hidden or not) */
  const offer = (before: PlannerState, after: PlannerState, today: string, showSleep: boolean) => {
    const picked = pickToast({
      candidates: newMilestones(before, after, today),
      milestonesOn: milestonesOn.value,
      celebrateOn: celebrateOn.value,
      dayDone: dayIsDone(after, today, showSleep),
      lastToast: lastToast.value.value,
      today
    })
    if (!picked) return

    lastToast.set(today)
    toast.value = { ...picked, id: Date.now() }
  }

  const dismiss = () => {
    toast.value = null
  }

  return { toast, offer, dismiss }
}
