import { createInitialState } from '~/utils/planner/seed'
import { isoWeekOf, localDateKey } from '~/utils/dates'
import { buildDraft, draftProblem, emptyAnswers, type FirstRunAnswers, type FirstRunDraft, type FirstRunWeek } from '~/utils/firstRun/draft'
import { FIRST_RUN_HOURS, MAX_FIRST_RUN_AREAS } from '~/utils/firstRun/rules'
import { hasUserData } from '~/utils/firstRun/saved'
import { starterAnswers, starterDraft } from '~/utils/firstRun/starter'
import { draftToState } from '~/utils/firstRun/toState'

/** The steps: 0 Welcome, 1 Your ambition, 2 Your areas, 3 the follow-up, 4 A normal week, 5 Hours, 6 Your draft (FR-ONB) */
export type FirstRunStep = 0 | 1 | 2 | 3 | 4 | 5 | 6
/** The questions after Welcome, counted for "Step n of 6" */
export const FIRST_RUN_STEP_COUNT = 6

/** How long the "plan is saved" line stays on Today, in milliseconds. It is also dismissed by hand */
export const FIRST_RUN_TOAST_MS = 7000

/**
 * The first run (FR-ONB, slice 9): a full page of five questions and a draft, held in session state only (a reload starts it
 * again while the save is pending). Nothing is saved until the draft is accepted, which replaces the planner in one step.
 */
export const useFirstRun = () => {
  const planner = usePlannerStore()
  const { go } = useNav()
  const { year, currentYear } = usePlannerYear()

  /** The first run is on screen (the page replaces the shell) */
  const active = useState<boolean>('firstrun-active', () => false)
  const step = useState<FirstRunStep>('firstrun-step', () => 0)
  /** Started from Replay first run: Welcome then offers "Keep my plan", the way out that is not a skip */
  const replaying = useState<boolean>('firstrun-replaying', () => false)
  const answers = useState<FirstRunAnswers>('firstrun-answers', emptyAnswers)
  const draft = useState<FirstRunDraft | null>('firstrun-draft', () => null)
  const error = useState<string>('firstrun-error', () => '')
  /** The replace confirmation of Replay first run, shown when the account already holds a plan */
  const replayAsk = useState<boolean>('firstrun-replay-ask', () => false)
  /** The one-line "plan is saved" note on Today */
  const toast = useState<boolean>('firstrun-toast', () => false)

  /** The year the draft is built for: the one on screen, else the current ISO year */
  const planYear = () => year.value ?? currentYear.value ?? isoWeekOf(localDateKey()).year

  /** Starts the first run from Welcome with empty answers. Nothing in the planner changes until the draft is accepted */
  const begin = (replay = false) => {
    answers.value = emptyAnswers()
    draft.value = null
    error.value = ''
    replaying.value = replay
    step.value = 0
    active.value = true
  }

  /** Closes the first run without a change (Keep my plan, or the sample data) */
  const close = () => {
    active.value = false
    replaying.value = false
    draft.value = null
    error.value = ''
  }

  /** Keep my plan: a replay that is not wanted ends here and the plan stays as it was */
  const keepPlan = () => {
    close()
    go('today')
  }

  /** Replay first run (Account menu): with a plan already there, it asks first; with an empty plan it starts at once */
  const askReplay = () => {
    if (hasUserData(planner.$state)) replayAsk.value = true
    else begin(true)
  }

  const cancelReplay = () => {
    replayAsk.value = false
  }

  const confirmReplay = () => {
    replayAsk.value = false
    begin(true)
  }

  const start = () => goTo(1)

  /** Goes to a step; the page moves focus to its heading */
  const goTo = (index: FirstRunStep) => {
    step.value = index
    error.value = ''
  }

  /** Back one step. The draft is rebuilt from the answers when the user goes forward again */
  const back = () => {
    if (step.value === 6) draft.value = null
    goTo(Math.max(0, step.value - 1) as FirstRunStep)
  }

  /** The starter: fixed answers and the draft they make, still to be accepted (FR-ONB, "Use a starter instead"). Back keeps the answers, so the starter can be edited */
  const useStarter = () => {
    answers.value = starterAnswers()
    draft.value = starterDraft(localDateKey())
    goTo(6)
  }

  /** Each area toggles in and out; up to three (FR-ONB). Taking one out forgets its follow-up answer */
  const toggleArea = (areaId: string) => {
    const chosen = answers.value.areas.includes(areaId)

    if (chosen) {
      answers.value.areas = answers.value.areas.filter(id => id !== areaId)
      delete answers.value.follow[areaId]
    } else if (answers.value.areas.length < MAX_FIRST_RUN_AREAS) {
      answers.value.areas = [...answers.value.areas, areaId]
    }

    error.value = ''
  }

  /** The answer to the follow-up of the first chosen area: an option index, or 'unsure' for the default */
  const chooseFollow = (answer: number | 'unsure') => {
    const first = answers.value.areas[0]
    if (first) answers.value.follow[first] = answer
    error.value = ''
  }

  const toggleWeek = (key: keyof FirstRunWeek) => {
    answers.value.week[key] = !answers.value.week[key]
    error.value = ''
  }

  /** Hours a week, one to twenty (FR-ONB), in steps of one */
  const setHours = (delta: number) => {
    answers.value.hours = Math.min(FIRST_RUN_HOURS.max, Math.max(FIRST_RUN_HOURS.min, answers.value.hours + delta))
  }

  /** Forward: each question checks its answer first; the hours step builds the draft */
  const next = () => {
    const current = answers.value

    if (step.value === 1) {
      if (!current.ambition.trim()) error.value = 'Write one sentence to continue.'
      else goTo(2)
    } else if (step.value === 2) {
      if (!current.areas.length) error.value = 'Choose at least one area to continue.'
      else goTo(3)
    } else if (step.value === 3) {
      const first = current.areas[0]
      if (!first || current.follow[first] === undefined) error.value = 'Choose one answer, or Not sure.'
      else goTo(4)
    } else if (step.value === 4) {
      goTo(5)
    } else if (step.value === 5) {
      // A missing answer sends the user back to its question, so a draft is never built from nothing
      const first = current.areas[0]
      if (!current.ambition.trim()) goTo(1)
      else if (!first) goTo(2)
      else if (current.follow[first] === undefined) goTo(3)
      else {
        draft.value = buildDraft(current, localDateKey())
        goTo(6)
      }
    } else if (step.value === 6) {
      accept()
    }
  }

  /**
   * Accepts the draft: the planner is replaced in one step with the draft's state (every week of the year gets the one week type),
   * the first run closes and Today opens with the "plan is saved" line. Returns false while the draft has a problem to fix
   */
  const accept = (): boolean => {
    if (!draft.value) return false

    const problem = draftProblem(draft.value)
    if (problem) {
      error.value = problem
      return false
    }

    planner.replaceState(draftToState(draft.value, planYear(), Date.now()))
    close()
    toast.value = true
    go('today')
    return true
  }

  /** Dev only (FR-ONB-3, sample data): the rich seed replaces the planner and the first run closes */
  const sampleData = () => {
    planner.replaceState({ ...createInitialState(), onboarding: 'done' })
    close()
    go('today')
  }

  const dismissToast = () => {
    toast.value = false
  }

  return {
    active, step, replaying, answers, draft, error, replayAsk, toast,
    begin, close, keepPlan, askReplay, cancelReplay, confirmReplay, start, goTo, back, useStarter,
    toggleArea, chooseFollow, toggleWeek, setHours, next, accept, sampleData, dismissToast
  }
}
