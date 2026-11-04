import { describe, expect, it } from 'vitest'
import type { Habit, PlannerState } from '~/types/planner'
import { blockDoneKey, habitDoneKey } from '~/utils/done'
import { partOfDay } from '~/utils/motion'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import {
  allItemsDone,
  behindLine,
  cheerLine,
  clockHour,
  countdownText,
  dayLineAxis,
  dayLineBlocks,
  doneCount,
  firstNameOf,
  firstUndone,
  focusItem,
  greeting,
  habitRows,
  nextHabitAction,
  nowPosition,
  stripNote,
  timeSpan,
  todayItems,
  weekStrip
} from '~/utils/today'
import { activity, empty, type Run, slotsWith, withActivities, withDone, withHabits, withSlots } from './fixtures'

// 2026-10-26 is a Monday (day 0 of the week); 2026-10-28 a Wednesday; 2026-10-29 a Thursday
const MONDAY = '2026-10-26'
const TUESDAY = '2026-10-27'
const WEDNESDAY = '2026-10-28'
const THURSDAY = '2026-10-29'

/** The empty state with a plan of the given runs in its week type; the default night stays painted (sleep) */
const planned = (runs: Run[], base: PlannerState = empty()): PlannerState => {
  const slots = base.templates.find(template => template.id === ONBOARDING_TEMPLATE_ID)!.slots

  return withSlots(base, ONBOARDING_TEMPLATE_ID, slotsWith(runs, slots))
}

/** Weekly ticks count the days of the week that carry the key, so a tick is put on each of several days */
const ticksOn = (state: PlannerState, days: Array<[string, string[]]>): PlannerState =>
  days.reduce((next, [date, keys]) => withDone(next, date, keys), state)

/** The keys the focal card takes, one tick at a time, until it has nothing left (the path of a user who ticks the focus) */
const focusPath = (state: PlannerState, date: string): string[] => {
  const keys: string[] = []
  let next = state

  for (let focus = focusItem(next, date); focus; focus = focusItem(next, date)) {
    keys.push(focus.key)
    next = withDone(next, date, [...keys])
  }

  return keys
}

const work = { activityId: 'work', day: 0, start: 8, end: 12 }
const workActivity = activity('work', 'professionnelle')
const walk: Habit = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' } }
const read: Habit = { id: 'read', categoryId: 'spirituelle', name: 'Read', frequency: { count: 3, period: 'week' } }
const pray: Habit = { id: 'pray', categoryId: 'spirituelle', name: 'Pray', frequency: { count: 2, period: 'month' } }
const focus: Habit = { id: 'focus', categoryId: 'professionnelle', name: 'Focus', frequency: { count: 3, period: 'week' }, activityId: 'work' }

describe('todayItems', () => {
  it('lists the blocks in time order, then the daily habits', () => {
    const state = withHabits(withActivities(planned([work, { activityId: 'work', day: 0, start: 13, end: 14 }]), [workActivity]), [walk, read])

    expect(todayItems(state, MONDAY).map(item => item.key)).toEqual([
      blockDoneKey('work', 8),
      blockDoneKey('work', 13),
      habitDoneKey('walk'),
    ])
  })

  it('carries the done state and the life area of each item', () => {
    const state = withDone(withHabits(withActivities(planned([work]), [workActivity]), [walk]), MONDAY, [blockDoneKey('work', 8)])
    const [block, habit] = todayItems(state, MONDAY)

    expect(block).toEqual({ key: 'a:work@8', kind: 'block', title: 'work', start: 8, end: 12, categoryId: 'professionnelle', done: true })
    expect(habit).toEqual({ key: 'h:walk', kind: 'habit', title: 'Walk', start: null, end: null, categoryId: 'physique', done: false })
  })

  it('leaves out the weekly habits, and a day with nothing planned is empty', () => {
    const state = withHabits(withActivities(planned([work]), [workActivity]), [read])

    expect(todayItems(state, MONDAY).map(item => item.title)).toEqual(['work'])
    expect(todayItems(planned([]), MONDAY)).toEqual([])
  })
})

describe('focusItem', () => {
  it('is the first undone block in time order, skipping the ticked ones', () => {
    const state = withDone(withActivities(planned([work, { activityId: 'work', day: 0, start: 13, end: 14 }]), [workActivity]), MONDAY, [
      blockDoneKey('work', 8)
    ])

    expect(focusItem(state, MONDAY)?.start).toBe(13)
  })

  it('is the first undone daily habit when no block is left, and never a weekly one', () => {
    // Walk is a daily habit, one tick short. Read is weekly with none of its three ticks, so it is short too, but it is not an item of
    // the day: the focus stays on Walk
    const state = withHabits(empty(), [walk, read])

    expect(focusItem(state, WEDNESDAY)?.key).toBe('h:walk')
  })

  it('walks only the items of the day: the blocks in time order, then the daily habits', () => {
    const state = withHabits(withActivities(planned([work, { activityId: 'work', day: 0, start: 13, end: 14 }]), [workActivity]), [walk, read, pray])

    expect(focusPath(state, MONDAY)).toEqual(['a:work@8', 'a:work@13', 'h:walk'])
  })

  it('ends in the same state whether the focus or the list ticks the day, with no weekly or monthly habit ticked', () => {
    const state = withHabits(withActivities(planned([work, { activityId: 'work', day: 0, start: 13, end: 14 }]), [workActivity]), [walk, read, pray])
    const byFocus = withDone(state, MONDAY, focusPath(state, MONDAY))
    const byList = withDone(state, MONDAY, todayItems(state, MONDAY).map(item => item.key))

    expect([...(byFocus.done?.[MONDAY] ?? [])].sort()).toEqual([...(byList.done?.[MONDAY] ?? [])].sort())
    expect([...(byFocus.done?.[MONDAY] ?? [])].sort()).toEqual(['a:work@13', 'a:work@8', 'h:walk'].sort())
    expect(focusItem(byFocus, MONDAY)).toBeNull()
    expect(allItemsDone(todayItems(byFocus, MONDAY))).toBe(true)
  })

  it('picks a daily habit when the weekly ones are on their count', () => {
    // Read has its three ticks in the week (Monday, Tuesday, Thursday), so it is not due on Wednesday
    const state = ticksOn(withHabits(empty(), [walk, read]), [[MONDAY, ['h:read']], [TUESDAY, ['h:read']], [THURSDAY, ['h:read']]])

    expect(focusItem(state, WEDNESDAY)?.key).toBe('h:walk')
  })

  it('is null when every block and every due habit is ticked', () => {
    const state = withDone(withActivities(planned([work]), [workActivity]), MONDAY, [blockDoneKey('work', 8), 'h:walk'])

    expect(focusItem(withHabits(state, [walk]), MONDAY)).toBeNull()
  })

  it('does not focus a weekly habit that has met its count this week', () => {
    const state = ticksOn(withHabits(empty(), [read]), [[MONDAY, ['h:read']], [TUESDAY, ['h:read']], [THURSDAY, ['h:read']]])

    expect(focusItem(state, WEDNESDAY)).toBeNull()
  })

  it('is null on a day with nothing planned, even when a weekly habit is short (the plan action shows instead)', () => {
    expect(focusItem(withHabits(empty(), [read]), WEDNESDAY)).toBeNull()
  })

  it('is null once every item of the day is done, even when a weekly habit is still short', () => {
    expect(focusItem(withDone(withHabits(empty(), [walk, read]), WEDNESDAY, ['h:walk']), WEDNESDAY)).toBeNull()
  })

  it('never focuses a weekly or monthly habit, even while a block or a daily habit of the day is left', () => {
    const state = withHabits(withActivities(planned([work]), [workActivity]), [walk, read, pray])

    expect(focusPath(state, MONDAY)).toEqual(['a:work@8', 'h:walk'])
  })

  it('is done when every item of the day is ticked, even with a weekly or monthly habit still undone', () => {
    const state = withDone(withHabits(withActivities(planned([work]), [workActivity]), [walk, read, pray]), MONDAY, ['a:work@8', 'h:walk'])

    expect(focusItem(state, MONDAY)).toBeNull()
    expect(allItemsDone(todayItems(state, MONDAY))).toBe(true)
  })

  it('does not count a weekly or monthly habit in the day, so a tick of one leaves the count and the focus as they were', () => {
    const state = withHabits(withActivities(planned([work]), [workActivity]), [read, pray])
    const ticked = withDone(state, MONDAY, ['h:read', 'h:pray'])

    expect(doneCount(todayItems(ticked, MONDAY), true)).toEqual({ done: 0, total: 1, when: 'today' })
    expect(focusItem(ticked, MONDAY)?.key).toBe('a:work@8')
  })
})

describe('firstUndone and allItemsDone', () => {
  it('returns the first item not done, and nothing for an empty list', () => {
    const items = todayItems(withDone(withHabits(empty(), [walk]), MONDAY, ['h:walk']), MONDAY)

    expect(firstUndone(items)).toBeNull()
    expect(firstUndone([])).toBeNull()
  })

  it('is done only when there is an item and every item is done', () => {
    const items = todayItems(withHabits(empty(), [walk]), MONDAY)

    expect(allItemsDone(items)).toBe(false)
    expect(allItemsDone([])).toBe(false)
    expect(allItemsDone(todayItems(withDone(withHabits(empty(), [walk]), MONDAY, ['h:walk']), MONDAY))).toBe(true)
  })
})

describe('doneCount', () => {
  const items = todayItems(withHabits(withActivities(planned([work]), [workActivity]), [walk]), MONDAY)

  it('counts the ticked items of the day, and the numbers show when all are done (Calm keeps every number)', () => {
    expect(doneCount(items, true)).toEqual({ done: 0, total: 2, when: 'today' })
    expect(doneCount(items.map(item => ({ ...item, done: true })), true)).toEqual({ done: 2, total: 2, when: 'today' })
    expect(doneCount(items.slice(0, 1), false)).toEqual({ done: 0, total: 1, when: 'that day' })
  })

  it('counts an empty day as nothing', () => {
    expect(doneCount([], true)).toEqual({ done: 0, total: 0, when: 'today' })
  })
})

describe('clockHour and timeSpan', () => {
  it('writes an hour as the mockup does: a space, AM or PM, and 12 at the turn of the half-day', () => {
    expect(clockHour(0)).toBe('12 AM')
    expect(clockHour(7)).toBe('7 AM')
    expect(clockHour(12)).toBe('12 PM')
    expect(clockHour(18)).toBe('6 PM')
    expect(clockHour(22)).toBe('10 PM')
    expect(clockHour(24)).toBe('12 AM')
  })

  it('writes a span of the clock as "from to"', () => {
    expect(timeSpan(9, 10)).toBe('9 AM to 10 AM')
  })
})

describe('cheerLine', () => {
  it('says nothing for an empty day or a done one', () => {
    expect(cheerLine({ done: 0, total: 0 })).toBe('')
    expect(cheerLine({ done: 2, total: 2 })).toBe('')
  })

  it('names the last one, the first one, and otherwise one of three steady lines by the count', () => {
    expect(cheerLine({ done: 4, total: 5 })).toBe('Last one for today. You are nearly there.')
    expect(cheerLine({ done: 1, total: 5 })).toBe('A first one is a real start.')
    expect(cheerLine({ done: 2, total: 5 })).toBe('Good rhythm. No rush.')
    expect(cheerLine({ done: 3, total: 5 })).toBe('Steady. Nicely paced.')
  })
})

describe('dayLineBlocks and dayLineAxis', () => {
  const day = { start: 7, end: 22 }
  const blockItem = { key: 'a:work@9', kind: 'block' as const, title: 'work', start: 9, end: 12, categoryId: 'professionnelle', done: true }

  it('places each block of the day as a share of the range, and leaves out the habits', () => {
    const habit = { key: 'h:walk', kind: 'habit' as const, title: 'Walk', start: null, end: null, categoryId: 'physique', done: false }

    expect(dayLineBlocks([blockItem, habit], day)).toEqual([
      { key: 'a:work@9', left: '13.33%', width: '20.00%', categoryId: 'professionnelle', done: true },
    ])
  })

  it('clips a block to the range', () => {
    const early = { ...blockItem, start: 5, end: 8 }

    expect(dayLineBlocks([early], day)[0]).toMatchObject({ left: '0.00%', width: '6.67%' })
  })

  it('labels the two ends of the range, and 12 and 18 inside it (the mockup axis: 7 AM, 12 PM, 6 PM, 10 PM)', () => {
    expect(dayLineAxis(day)).toEqual([
      { hour: 7, label: '7 AM', left: '0.00%', edge: 'start' },
      { hour: 12, label: '12 PM', left: '33.33%', edge: 'middle' },
      { hour: 18, label: '6 PM', left: '73.33%', edge: 'middle' },
      { hour: 22, label: '10 PM', left: '100.00%', edge: 'end' },
    ])
  })

  it('leaves out the hours that a short range does not reach', () => {
    expect(dayLineAxis({ start: 9, end: 12 }).map(label => label.label)).toEqual(['9 AM', '12 PM'])
  })
})

describe('countdownText', () => {
  it('counts down to a block within three hours before it', () => {
    expect(countdownText(600, 720, 560)).toEqual({ state: 'soon', text: 'In 40 min' })
    expect(countdownText(660, 720, 480)).toEqual({ state: 'soon', text: 'In 3 h' })
    expect(countdownText(600, 720, 540)).toEqual({ state: 'soon', text: 'In 1 h' })
  })

  it('gives the start hour when the block is more than three hours away', () => {
    expect(countdownText(720, 780, 480)).toEqual({ state: 'later', text: 'Starts at 12 PM' })
  })

  it('reads the time left while the block runs, from its start to its end', () => {
    expect(countdownText(540, 600, 540)).toEqual({ state: 'now', text: 'On now · 1 h left' })
    expect(countdownText(540, 620, 540)).toEqual({ state: 'now', text: 'On now · 1 h 20 min left' })
    expect(countdownText(540, 600, 599)).toEqual({ state: 'now', text: 'On now · 1 min left' })
  })

  it('says the block ended and asks for a tick once its end has passed', () => {
    expect(countdownText(540, 720, 800)).toEqual({ state: 'ended', text: 'Ended at 12 PM. Tick it if it happened.' })
    expect(countdownText(540, 720, 720)).toEqual({ state: 'ended', text: 'Ended at 12 PM. Tick it if it happened.' })
  })
})

describe('greeting', () => {
  it('reads the part of the day, with the boundaries at 5, 12, 17 and 5 again', () => {
    expect(partOfDay(299)).toBe('evening')
    expect(partOfDay(300)).toBe('morning')
    expect(partOfDay(719)).toBe('morning')
    expect(partOfDay(720)).toBe('afternoon')
    expect(partOfDay(1019)).toBe('afternoon')
    expect(partOfDay(1020)).toBe('evening')
    expect(partOfDay(0)).toBe('evening')
  })

  it('greets by the part of the day, with a name when there is one', () => {
    expect(greeting(300)).toBe('Good morning.')
    expect(greeting(720, 'Sam')).toBe('Good afternoon, Sam.')
    expect(greeting(1200)).toBe('Good evening.')
  })

  it('takes the first word of the sign-in name', () => {
    expect(firstNameOf('Sam Reyes')).toBe('Sam')
    expect(firstNameOf('  Sam  ')).toBe('Sam')
    expect(firstNameOf('')).toBe('')
  })
})

describe('behindLine', () => {
  const category = { id: 'physique', name: 'Physical', order: 0, target1y: 'Exercise at least three times a week.' }

  it('names the 1-year target of the life area', () => {
    expect(behindLine(category)).toBe('Behind this: Exercise at least three times a week.')
  })

  it('names the life area and says it has no 1-year target yet, when the target is missing or to be defined', () => {
    expect(behindLine({ ...category, target1y: undefined })).toBe('Behind this: Physical. No 1-year target yet.')
    expect(behindLine({ ...category, target1y: '   ' })).toBe('Behind this: Physical. No 1-year target yet.')
    expect(behindLine({ ...category, targetTbd: true })).toBe('Behind this: Physical. No 1-year target yet.')
  })

  it('gives no line without a life area at all', () => {
    expect(behindLine(undefined)).toBeNull()
  })
})

describe('nextHabitAction', () => {
  const linkedRead: Habit = { id: 'read', categoryId: 'spirituelle', name: 'Read', frequency: { count: 3, period: 'week' }, activityId: 'work' }
  const practice: Habit = { id: 'practice', categoryId: 'physique', name: 'Practice', frequency: { count: 2, period: 'week' }, activityId: 'work' }

  it('picks the weekly habit furthest behind its count, with an activity', () => {
    const state = withHabits(withActivities(planned([]), [workActivity]), [linkedRead, practice])

    expect(nextHabitAction(state, WEDNESDAY)?.id).toBe('read')
  })

  it('skips a habit with no activity, a daily one, and one a block of the week already stands for', () => {
    const state = withHabits(withActivities(planned([{ ...work, day: 2 }]), [workActivity]), [walk, focus, { ...practice, activityId: undefined }])

    expect(nextHabitAction(state, WEDNESDAY)).toBeNull()
  })

  it('is null when no weekly habit with an activity is short', () => {
    const state = ticksOn(withHabits(withActivities(planned([]), [workActivity]), [linkedRead]), [[MONDAY, ['h:read']], [TUESDAY, ['h:read']], [THURSDAY, ['h:read']]])

    expect(nextHabitAction(state, WEDNESDAY)).toBeNull()
  })
})

describe('weekStrip', () => {
  // Monday: one block, ticked (full). Tuesday: two blocks, one ticked (part). Wednesday: nothing planned (free).
  // Thursday, today: one block, not ticked (none). Friday to Sunday: after today (future).
  const state = withDone(
    withActivities(planned([work, { activityId: 'work', day: 1, start: 8, end: 12 }, { activityId: 'work', day: 1, start: 13, end: 14 }, { activityId: 'work', day: 3, start: 8, end: 9 }]), [workActivity]),
    MONDAY,
    [blockDoneKey('work', 8)]
  )
  const withTick = withDone(state, TUESDAY, [blockDoneKey('work', 8)])

  it('classes each day of the week as full, part, free, none or future', () => {
    const strip = weekStrip(withTick, THURSDAY)

    expect(strip.days.map(day => day.state)).toEqual(['full', 'part', 'free', 'none', 'future', 'future', 'future'])
    expect(strip.days.map(day => day.word)).toEqual([
      'all done', 'some done', 'nothing planned', 'not ticked', 'not yet', 'not yet', 'not yet'
    ])
  })

  it('marks today and counts only the days up to today', () => {
    const strip = weekStrip(withTick, THURSDAY)

    expect(strip.days.filter(day => day.isToday).map(day => day.date)).toEqual([THURSDAY])
    expect(strip.days[0]!.letter).toBe('M')
    expect(strip.days[0]!.name).toBe('Monday')
    expect(strip.done).toBe(2)
    expect(strip.planned).toBe(4)
  })

  it('words the forgiving note from the counts', () => {
    expect(stripNote({ done: 2, planned: 4 })).toBe('2 of 4 planned so far. A missed one costs only itself; nothing resets.')
  })
})

describe('habitRows', () => {
  it('lists every habit with its tick, its frequency and its progress', () => {
    const state = withDone(withHabits(empty(), [walk, read]), TUESDAY, ['h:walk', 'h:read'])
    const rows = habitRows(state, WEDNESDAY)

    expect(rows.map(row => [row.key, row.done, row.meta])).toEqual([
      ['h:walk', false, 'Every day · Not yet today'],
      ['h:read', false, '3 times a week · 1 of 3 this week'],
    ])
  })

  it('marks a habit a block stands for as planned, and leaves sleep habits out while sleep is hidden', () => {
    const sleepHabit: Habit = { id: 'bed', categoryId: 'physique', name: 'Bed', frequency: { count: 1, period: 'day' }, activityId: 'sleep' }
    const state = withHabits(withActivities(planned([work]), [workActivity]), [focus, sleepHabit])

    expect(habitRows(state, MONDAY).map(row => [row.habit.id, row.planned])).toEqual([['focus', true]])
    expect(habitRows(state, MONDAY, true).map(row => row.habit.id)).toEqual(['focus', 'bed'])
  })
})

describe('nowPosition', () => {
  const range = { start: 7, end: 22 }

  it('places the marker on the awake range, as a share of it', () => {
    expect(nowPosition(7 * 60, range)).toBe('0%')
    expect(nowPosition(14.5 * 60, range)).toBe('50%')
    expect(nowPosition(22 * 60, range)).toBe('100%')
  })

  it('has no marker before the range, after it, or when the minute is not known', () => {
    expect(nowPosition(6 * 60 + 59, range)).toBeNull()
    expect(nowPosition(22 * 60 + 1, range)).toBeNull()
    expect(nowPosition(null, range)).toBeNull()
  })
})
