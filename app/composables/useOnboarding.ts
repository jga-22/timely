import type { NavTarget, TabId } from '~/composables/useNav'
import { localDateKey, isoWeekOf } from '~/utils/dates'
import { createInitialState } from '~/utils/planner'
import { buildOnboardingState, firstCategory, type OnboardingAnswers } from '~/utils/onboarding'

export type OnboardingPhase = 'closed' | 'welcome' | 'form' | 'tour'

/** Steps 0 to 4: Goals, Planner, Insights, Home, What next. The last one stays on the current screen */
export const TOUR_STEP_COUNT = 5

/**
 * First-run onboarding (FR-ONB), session state only: nothing here is saved, so a reload closes the flow.
 * Welcome and the form are a dialog; the tour is a card that walks the screens with the user's own data.
 */
export const useOnboarding = () => {
  const planner = usePlannerStore()
  const { go } = useNav()
  const { year, currentYear } = usePlannerYear()

  const phase = useState<OnboardingPhase>('onboarding-phase', () => 'closed')
  const step = useState<number>('onboarding-step', () => 0)

  /** Where each tour step shows its subject, built from the first life area and its activity */
  const stepTarget = (index: number): { tab: TabId, target?: NavTarget } | null => {
    const category = firstCategory(planner.$state)
    const activity = planner.activities.find(item => item.categoryId === category?.id)

    switch (index) {
      case 0: return { tab: 'goals', target: { item: category?.id } }
      case 1: return { tab: 'planner', target: { item: activity?.id } }
      case 2: return { tab: 'insights' }
      case 3: return { tab: 'home' }
      default: return null
    }
  }

  const showStep = (index: number) => {
    step.value = index

    const target = stepTarget(index)
    if (target) go(target.tab, target.target)
  }

  const openWelcome = () => {
    phase.value = 'welcome'
  }

  const openForm = () => {
    phase.value = 'form'
  }

  const close = () => {
    phase.value = 'closed'
  }

  const startTour = () => {
    phase.value = 'tour'
    showStep(0)
  }

  const next = () => {
    if (step.value < TOUR_STEP_COUNT - 1) showStep(step.value + 1)
    else close()
  }

  const back = () => {
    if (step.value > 0) showStep(step.value - 1)
  }

  /** Start empty: no data is created, onboarding is marked done */
  const startEmpty = () => {
    planner.finishOnboarding()
    close()
  }

  /** Explore with sample data: the rich seed replaces the state (FR-ONB-3) */
  const useSampleData = () => {
    planner.replaceState({ ...createInitialState(), onboarding: 'done' })
    close()
  }

  /** Builds the first life area, habit, activity and week from the answers, then starts the tour (FR-ONB-5) */
  const build = (answers: OnboardingAnswers) => {
    const planYear = year.value ?? currentYear.value ?? isoWeekOf(localDateKey()).year

    planner.replaceState(buildOnboardingState(answers, planYear))
    startTour()
  }

  return { phase, step, openWelcome, openForm, close, startTour, next, back, startEmpty, useSampleData, build }
}
