import { describe, expect, it } from 'vitest'
import { FIRST_RUN_RULES, FIRST_RUN_HOURS, MAX_FIRST_RUN_AREAS, ruleFor } from '~/utils/firstRun/rules'
import { buildDraft, dayOrder, draftProblem, emptyAnswers, firstActionLine, frequencyText, type FirstRunAnswers } from '~/utils/firstRun/draft'
import { starterAnswers, starterDraft } from '~/utils/firstRun/starter'
import { createLifeAreas } from '~/utils/planner/seed'
import { SLEEP_CODE } from '~/utils/sleep'

/** A Wednesday (weekday 2), used as "today" unless a test says otherwise */
const WEDNESDAY = '2026-11-04'

/** Answers for the given areas, with the rest of the defaults (no follow-up answer, standard week, five hours) */
const answersFor = (areas: string[], patch: Partial<FirstRunAnswers> = {}): FirstRunAnswers => ({
  ...emptyAnswers(),
  ambition: 'Stay fit and calm',
  areas,
  ...patch
})

describe('the rule table (FR-ONB, slice 9)', () => {
  it('has one follow-up for each of the eight default life areas', () => {
    const areaIds = createLifeAreas().map(area => area.id)

    expect(FIRST_RUN_RULES.map(rule => rule.areaId).sort()).toEqual([...areaIds].sort())
  })

  it('keeps every option measurable, with a count a day, a week or a month', () => {
    for (const rule of FIRST_RUN_RULES) {
      expect(rule.options.length).toBeGreaterThan(0)
      expect(rule.question.trim()).not.toBe('')
      expect(rule.target.trim()).not.toBe('')

      for (const option of rule.options) {
        expect(option.habit.trim()).not.toBe('')
        expect(Number.isInteger(option.count) && option.count >= 1 && option.count <= 7).toBe(true)
        expect(['day', 'week', 'month']).toContain(option.period)
      }
    }
  })

  it('gives unique short codes of one to three letters, never the Sleep code', () => {
    const codes = FIRST_RUN_RULES.flatMap(rule => rule.options.map(option => option.code)).filter((code): code is string => code !== null)

    expect(new Set(codes).size).toBe(codes.length)
    expect(codes.every(code => /^[A-Z]{1,3}$/.test(code))).toBe(true)
    expect(codes).not.toContain(SLEEP_CODE)
  })

  it('gives a monthly habit no activity, so it takes no hours in the week', () => {
    for (const rule of FIRST_RUN_RULES) {
      for (const option of rule.options.filter(item => item.period === 'month')) {
        expect(option.code).toBeNull()
      }
    }
  })

  it('finds the rule of an area by id, and nothing for an unknown id', () => {
    expect(ruleFor('physique')?.options[0]?.habit).toBe('Run')
    expect(ruleFor('nope')).toBeUndefined()
  })
})

describe('the draft (FR-ONB-5)', () => {
  it('places one session per habit per day, the first area first, inside the hours', () => {
    const draft = buildDraft(answersFor(['physique', 'spirituelle']), WEDNESDAY)

    expect(draft.asked).toBe(6)
    expect(draft.placed).toBe(FIRST_RUN_HOURS.default)
    expect(draft.sessions).toHaveLength(FIRST_RUN_HOURS.default)
    expect(draft.note).toBe('5 of 6 sessions fit your 5 hours. You can add more later in Week.')

    for (const habitId of ['habit-1', 'habit-2']) {
      const days = draft.sessions.filter(session => session.habitId === habitId).map(session => session.weekday)
      expect(new Set(days).size).toBe(days.length)
    }
    // The first area's habit gets its three sessions before the second area gets any
    expect(draft.sessions.filter(session => session.habitId === 'habit-1')).toHaveLength(3)
  })

  it('caps the sessions at the hours the user can give', () => {
    const draft = buildDraft(answersFor(['physique'], { hours: 2 }), WEDNESDAY)

    expect(draft.placed).toBe(2)
    expect(draft.asked).toBe(3)
    expect(draft.note).toBe('2 of 3 sessions fit your 2 hours. You can add more later in Week.')
  })

  it('says hour in the singular for one hour', () => {
    const draft = buildDraft(answersFor(['physique'], { hours: 1 }), WEDNESDAY)

    expect(draft.note).toBe('1 of 3 sessions fit your 1 hour. You can add more later in Week.')
  })

  it('says which default Not sure picked', () => {
    const draft = buildDraft(answersFor(['physique'], { follow: { physique: 'unsure' } }), WEDNESDAY)

    expect(draft.habits[0]).toMatchObject({ name: 'Run', count: 3, period: 'week', code: 'RUN' })
    expect(draft.habits[0]!.source).toBe('Not sure, so we used the default: Run, three times a week.')
  })

  it('takes the option the user picked for the first area', () => {
    const draft = buildDraft(answersFor(['physique'], { follow: { physique: 1 } }), WEDNESDAY)

    expect(draft.habits[0]).toMatchObject({ name: 'Walk', count: 7, code: 'WAL' })
    expect(draft.habits[0]!.source).toBe('From your answer: Walk, every day.')
  })

  it('gives the other areas their default and says so', () => {
    const draft = buildDraft(answersFor(['physique', 'spirituelle'], { follow: { physique: 1 } }), WEDNESDAY)

    expect(draft.habits[1]).toMatchObject({ name: 'Read for inspiration', areaId: 'spirituelle' })
    expect(draft.habits[1]!.source).toBe('A default for Spiritual. You can change it.')
    expect(draft.targets.spirituelle).toBe(ruleFor('spirituelle')!.target)
  })

  it('uses at most three areas', () => {
    const areas = ['physique', 'spirituelle', 'relationnelle', 'cognitive']
    const draft = buildDraft(answersFor(areas), WEDNESDAY)

    expect(draft.areas).toEqual(areas.slice(0, MAX_FIRST_RUN_AREAS))
    expect(draft.habits).toHaveLength(MAX_FIRST_RUN_AREAS)
  })

  it('puts the first session on today when today has room', () => {
    const draft = buildDraft(answersFor(['physique']), WEDNESDAY)

    expect(draft.order[0]).toBe(2)
    expect(dayOrder({ working: false, evenings: false, weekend: false }, WEDNESDAY)).toEqual([2, 0, 4, 1, 3, 5, 6])
    expect(draft.sessions.some(session => session.weekday === 2)).toBe(true)
    expect(firstActionLine(draft, WEDNESDAY)).toBe('Your first action: Run, today at 9 AM.')
  })

  it('puts the first action on the next day in the order when today has no room', () => {
    const draft = buildDraft(answersFor(['physique'], { week: { working: false, evenings: false, weekend: true } }), WEDNESDAY)

    expect(draft.sessions.map(session => session.weekday).sort()).toEqual([5, 6])
    expect(firstActionLine(draft, WEDNESDAY)).toBe('Your first action: Run, Saturday at 9 AM.')
  })

  it('keeps free weekends to Saturday and Sunday only, one session a day', () => {
    const draft = buildDraft(answersFor(['physique'], { week: { working: false, evenings: false, weekend: true } }), WEDNESDAY)

    expect(draft.order).toEqual([5, 6])
    expect(draft.placed).toBe(2)
    expect(draft.asked).toBe(3)
    expect(draft.sessions.every(session => session.weekday === 5 || session.weekday === 6)).toBe(true)
  })

  it('starts the sessions at six in the evening when free evenings are ticked', () => {
    const draft = buildDraft(answersFor(['physique'], { week: { working: false, evenings: true, weekend: false } }), WEDNESDAY)

    expect(Math.min(...draft.sessions.map(session => session.hour))).toBe(18)
  })

  it('keeps every session in awake hours, from 7 AM to 10 PM', () => {
    const draft = buildDraft(answersFor(['physique', 'relationnelle', 'cognitive'], { hours: 20, week: { working: false, evenings: true, weekend: false } }), WEDNESDAY)

    expect(draft.sessions.length).toBeGreaterThan(0)
    expect(draft.sessions.every(session => session.hour >= 7 && session.hour <= 21)).toBe(true)
  })

  it('gives no session to a habit that has no weekly count', () => {
    const draft = buildDraft(answersFor(['economique']), WEDNESDAY)

    expect(draft.asked).toBe(0)
    expect(draft.placed).toBe(0)
    expect(draft.note).toBe('None of these habits has a weekly session to place. You can add times in Week.')
    expect(firstActionLine(draft, WEDNESDAY)).toBe('Your first action: add one habit in Week.')
  })

  it('keeps the ambition trimmed', () => {
    const draft = buildDraft(answersFor(['physique'], { ambition: '  Calm  ' }), WEDNESDAY)

    expect(draft.ambition).toBe('Calm')
  })
})

describe('the starter (FR-ONB, Use a starter instead)', () => {
  it('is a draft of Run three times and a family evening twice, for five hours', () => {
    const draft = starterDraft(WEDNESDAY)

    expect(starterAnswers().areas).toEqual(['physique', 'relationnelle'])
    expect(draft.habits.map(habit => habit.name)).toEqual(['Run', 'Family evening'])
    expect(draft.placed).toBe(5)
    expect(draft.asked).toBe(5)
    expect(draft.note).toBe('Starter: a week already set. Edit anything before you accept.')
  })

  it('fills its sessions in the evening', () => {
    const draft = starterDraft(WEDNESDAY)

    expect(Math.min(...draft.sessions.map(session => session.hour))).toBe(18)
  })
})

describe('the draft problems and the wording', () => {
  it('needs an ambition and a name for each habit', () => {
    const draft = buildDraft(answersFor(['physique']), WEDNESDAY)

    expect(draftProblem({ ...draft, ambition: '  ' })).toBe('Write your 5-year ambition in a sentence.')
    expect(draftProblem({ ...draft, habits: [{ ...draft.habits[0]!, name: ' ' }] })).toBe('Each habit needs a name.')
    expect(draftProblem(draft)).toBeNull()
  })

  it('says how often a habit comes', () => {
    expect(frequencyText(3, 'week')).toBe('3 times a week')
    expect(frequencyText(1, 'month')).toBe('once a month')
  })
})
