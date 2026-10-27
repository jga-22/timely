import type { PlannerState } from '~/types/planner'
import { createOnboardingState } from '~/utils/planner'
import { getActivePlannerStorage } from '~/utils/storage/active'

/**
 * Reset my data (FR-ONB-10): the planner becomes the empty onboarding state and is saved at once (not only debounced).
 * The sign-in is kept. Returns null when the reset is saved; otherwise the message to show, and the previous data is put back.
 */
export const useResetData = () => {
  const planner = usePlannerStore()
  const onboarding = useOnboarding()
  const { go } = useNav()
  const { resetYear } = usePlannerYear()

  const resetData = async (): Promise<string | null> => {
    const storage = getActivePlannerStorage()
    if (!storage) return 'Your planner is still loading. Try again in a moment.'

    const previous = JSON.parse(JSON.stringify(planner.$state)) as PlannerState
    planner.replaceState(createOnboardingState())

    const result = await storage.saveNow(planner.$state)
    if (!result.ok) {
      planner.replaceState(previous)
      return `Not reset: ${result.message} Your data is unchanged.`
    }

    // Session state back to its first-run values, then the first-run flow from the start
    resetYear()
    onboarding.close()
    go('home')
    onboarding.openWelcome()
    return null
  }

  return { resetData }
}
