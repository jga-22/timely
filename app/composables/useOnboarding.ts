import type { NavTarget, TabId } from '~/composables/useNav'
import { localDateKey, isoWeekOf } from '~/utils/dates'
import { createInitialState } from '~/utils/planner'
import { buildOnboardingState, firstCategory, type OnboardingAnswers } from '~/utils/onboarding'

export type OnboardingPhase = 'closed' | 'welcome' | 'intro' | 'ambition' | 'goals' | 'tour'

/** The guided path: 1 Your ambition and 2 Goals and habits (dialogs), then 3 to 5 as tour cards */
export const ONBOARDING_STEP_COUNT = 5
/** The first tour card is step 3 of the path: Plan your week */
export const TOUR_FIRST_STEP = 3
/** Tour cards: Plan your week, Insights, Daily follow-up. `step` in the composable counts from 0 within the tour */
export const TOUR_STEP_COUNT = ONBOARDING_STEP_COUNT - TOUR_FIRST_STEP + 1

/**
 * First-run onboarding (FR-ONB), session state only: nothing here is saved, so a reload closes the flow.
 * Welcome and the two dialogs are over the page; the tour is a card that walks the screens with the user's own data.
 */
export const useOnboarding = () => {
  const planner = usePlannerStore()
  const { go } = useNav()
  const { year, currentYear } = usePlannerYear()

  const phase = useState<OnboardingPhase>('onboarding-phase', () => 'closed')
  const step = useState<number>('onboarding-step', () => 0)
  /** Where the intro was opened from: after Welcome it leads to step 1, from the tour it returns to the tour */
  const introFrom = useState<'welcome' | 'tour'>('onboarding-intro-from', () => 'welcome')

  /** Where each tour card shows its subject, built from the first life area and its activity */
  const stepTarget = (index: number): { tab: TabId, target?: NavTarget } | null => {
    const category = firstCategory(planner.$state)
    const activity = planner.activities.find(item => item.categoryId === category?.id)

    switch (index) {
      case 0: return { tab: 'planner', target: { item: activity?.id } }
      case 1: return { tab: 'insights' }
      case 2: return { tab: 'home' }
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

  const openIntro = (from: 'welcome' | 'tour') => {
    introFrom.value = from
    phase.value = 'intro'
  }

  /** Leaves the intro: to step 1 after Welcome, back to the tour when it was opened from there */
  const finishIntro = () => {
    if (introFrom.value === 'tour') phase.value = 'tour'
    else openAmbition()
  }

  const openAmbition = () => {
    phase.value = 'ambition'
  }

  const openGoals = () => {
    phase.value = 'goals'
  }

  const close = () => {
    phase.value = 'closed'
  }

  /** Starts the tour cards at Plan your week (step 3) */
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

  /** Builds the ambition, the goals, their habits, activities and week from the answers, then starts the tour (FR-ONB-5) */
  const build = (answers: OnboardingAnswers) => {
    const planYear = year.value ?? currentYear.value ?? isoWeekOf(localDateKey()).year

    planner.replaceState(buildOnboardingState(answers, planYear))
    startTour()
  }

  return { phase, step, openWelcome, openIntro, finishIntro, openAmbition, openGoals, close, startTour, next, back, startEmpty, useSampleData, build }
}
