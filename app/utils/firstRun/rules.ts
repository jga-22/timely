/**
 * The first-run rule table (FR-ONB, slice 9): what the first run asks and what it proposes. No AI: each answer picks one row.
 * This is content for the owner to review. Keep the wording calm, make no medical or outcome claims, and keep every habit
 * measurable (a count a day, a week or a month). The area ids are the eight default life areas (`createLifeAreas`, seed.ts).
 * Activity codes are 1 to 3 letters, unique across this table, and never SLP (the Sleep activity's key).
 */
import type { HabitPeriod } from '~/types/planner'

/** One answer of a follow-up question: the habit it proposes, how often, and the activity's short code (null: no activity, no hours) */
export interface FirstRunOption {
  /** The chip's words: what to do and how often */
  label: string
  /** The habit's name; its activity, when it has one, takes the same name */
  habit: string
  count: number
  period: HabitPeriod
  /** The activity's short code (`shortCode`), or null for a habit with no time in the week */
  code: string | null
}

/** The follow-up for one life area: a question, the 1-year target proposed for it, and its options (the first one is the default) */
export interface FirstRunRule {
  areaId: string
  question: string
  /** The 1-year target proposed in the draft, the same wording as the Harada seed */
  target: string
  /** options[0] is the default: "Not sure" picks it, and the areas after the first always use it */
  options: FirstRunOption[]
}

export const FIRST_RUN_RULES: FirstRunRule[] = [
  {
    areaId: 'physique',
    question: 'What would a good month look like for Physical?',
    target: 'Exercise at least three times a week all year.',
    options: [
      { label: 'Run, three times a week', habit: 'Run', count: 3, period: 'week', code: 'RUN' },
      { label: 'Walk, every day', habit: 'Walk', count: 7, period: 'week', code: 'WAL' }
    ]
  },
  {
    areaId: 'spirituelle',
    question: 'Which habit would you like to start?',
    target: 'Read something inspiring at least three times a week.',
    options: [
      { label: 'Read for inspiration, three times a week', habit: 'Read for inspiration', count: 3, period: 'week', code: 'RDG' },
      { label: 'Quiet time, three times a week', habit: 'Quiet time to reflect', count: 3, period: 'week', code: 'QUI' }
    ]
  },
  {
    areaId: 'relationnelle',
    question: 'Who do you want more time with?',
    target: 'A regular time together with family and friends, every week.',
    options: [
      { label: 'Family evening, twice a week', habit: 'Family evening', count: 2, period: 'week', code: 'FAM' },
      { label: 'A call with a friend, twice a week', habit: 'Call a friend or relative', count: 2, period: 'week', code: 'CAL' }
    ]
  },
  {
    areaId: 'economique',
    question: 'Which habit would you like to start?',
    target: 'Save a fixed share of my income every month.',
    options: [
      { label: 'Review the monthly budget, once a month', habit: 'Review the monthly budget', count: 1, period: 'month', code: null },
      { label: 'Set money aside, once a month', habit: 'Set money aside for savings', count: 1, period: 'month', code: null }
    ]
  },
  {
    areaId: 'cognitive',
    question: 'Which habit would you like to start?',
    target: 'Finish one course and share what I learn.',
    options: [
      { label: 'Study a new topic, three times a week', habit: 'Study a new topic', count: 3, period: 'week', code: 'STU' },
      { label: 'Work on a personal project, twice a week', habit: 'Work on a personal project', count: 2, period: 'week', code: 'PRJ' }
    ]
  },
  {
    areaId: 'sociale',
    question: 'Which habit would you like to start?',
    target: 'Join one group and help it regularly.',
    options: [
      { label: 'Attend a community meeting, once a month', habit: 'Attend a community meeting', count: 1, period: 'month', code: null },
      { label: 'Help someone in my network, once a week', habit: 'Help someone in my network', count: 1, period: 'week', code: 'HLP' }
    ]
  },
  {
    areaId: 'professionnelle',
    question: 'Which piece of work would make this year count?',
    target: 'Lead one visible project from start to finish.',
    options: [
      { label: 'Focused work, three mornings a week', habit: 'Focused work', count: 3, period: 'week', code: 'FOC' },
      { label: 'Weekly planning, once a week', habit: 'Weekly planning', count: 1, period: 'week', code: 'PLN' }
    ]
  },
  {
    areaId: 'environnement',
    question: 'Which habit would you like to start?',
    target: 'Reduce waste in one area of daily life.',
    options: [
      { label: 'Run errands with a plan, once a week', habit: 'Run errands with a plan', count: 1, period: 'week', code: 'ERR' },
      { label: 'Tidy the flat, once a week', habit: 'Tidy the flat', count: 1, period: 'week', code: 'TID' }
    ]
  }
]

/** The rule of one life area, or undefined for an unknown id */
export const ruleFor = (areaId: string): FirstRunRule | undefined => FIRST_RUN_RULES.find(rule => rule.areaId === areaId)

/** The answers the first run takes: up to three areas, the hours a week (1 to 20; Sleep is not counted) */
export const MAX_FIRST_RUN_AREAS = 3
export const FIRST_RUN_HOURS = { min: 1, max: 20, default: 5 } as const

/** One session is one hour: a block of the week template (FR-ONB-5) */
export const SESSION_MINUTES = 60

/** Sessions go to awake hours only: Sleep is 10 PM to 7 AM by default (FR-SLEEP-2), so a session starts from 7 AM and ends by 10 PM */
export const FIRST_SESSION_HOUR = 7
export const LAST_SESSION_HOUR = 21
/** The window a session prefers: 9 AM (or 6 PM when free evenings are ticked), four hours long; then any awake hour */
export const MORNING_START = 9
export const EVENING_START = 18
export const PREFERRED_WINDOW = 4
