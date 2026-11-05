import { PREF_KEYS, parseCelebrate, parseMilestones, serialiseCelebrate, serialiseMilestones } from '~/utils/prefs'

/**
 * The two Progress switches of slice 11, kept in this browser (PREF_KEYS): the milestone lines (the Milestones card and their
 * toasts) and the calm line when a day is done (one line on Today, no sound). Both are on by default; neither touches the planner.
 */
export const useMilestoneSettings = () => {
  const milestones = usePref(PREF_KEYS.milestones, { fallback: true, parse: parseMilestones, serialise: serialiseMilestones })
  const celebrate = usePref(PREF_KEYS.celebrate, { fallback: true, parse: parseCelebrate, serialise: serialiseCelebrate })

  return {
    milestonesOn: milestones.value,
    setMilestonesOn: milestones.set,
    celebrateOn: celebrate.value,
    setCelebrateOn: celebrate.set
  }
}
