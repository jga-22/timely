/**
 * The starter (FR-ONB, "Use a starter instead"): a fixed set of answers that gives a draft a user can edit and accept at once.
 * It is the same draft the answers make, so it follows the same rules.
 */
import { buildDraft, type FirstRunAnswers, type FirstRunDraft } from '~/utils/firstRun/draft'

export const STARTER_AMBITION = 'Stronger, calmer, and able to keep up with my kids.'

/** Physical (three runs) and Relational (two family evenings), in the evening: five sessions for five hours */
export const starterAnswers = (): FirstRunAnswers => ({
  ambition: STARTER_AMBITION,
  areas: ['physique', 'relationnelle'],
  follow: { physique: 0 },
  week: { working: false, evenings: true, weekend: false },
  hours: 5
})

/** The starter draft for `today` (a date key). Its note says it is a starter, so the user knows what it is */
export const starterDraft = (today: string): FirstRunDraft => ({
  ...buildDraft(starterAnswers(), today),
  note: 'Starter: a week already set. Edit anything before you accept.'
})
