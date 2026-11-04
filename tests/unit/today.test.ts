import { describe, expect, it } from 'vitest'
import type { Habit, PlannerState } from '~/types/planner'
import { blockDoneKey, habitDoneKey } from '~/utils/done'
import { partOfDay } from '~/utils/motion'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import {
  allItemsDone,
  behindLine,
  countdownText,
  doneLine,
  firstNameOf,
  firstUndone,
  focusItem,
  greeting,
  habitMissing,
  habitRows,
  nextHabitAction,
  nowPosition,
  stripNote,
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

const work = { activityId: 'work', day: 0, start: 8, end: 12 }
const workActivity = activity('work', 'professionnelle')
const walk: Habit = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' } }
const read: Habit = { id: 'read', categoryId: 'spirituelle', name: 'Read', frequency: { count: 3, period: 'week' } }
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

  it('is a habit when no block is left: the habit furthest behind its count', () => {
    // Walk is a daily habit (one tick short); Read is weekly with none of three ticks (three short), so Read is the focus
    const state = withHabits(empty(), [walk, read])

    expect(focusItem(state, WEDNESDAY)?.key).toBe('h:read')
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
})

describe('firstUndone, allItemsDone, habitMissing', () => {
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

  it('counts a daily habit as one tick short, and a weekly habit by the ticks still missing', () => {
    expect(habitMissing(empty(), walk, MONDAY)).toBe(1)
    expect(habitMissing(withDone(empty(), MONDAY, ['h:read']), read, WEDNESDAY)).toBe(2)
    expect(habitMissing(ticksOn(empty(), [[MONDAY, ['h:read']], [TUESDAY, ['h:read']], [THURSDAY, ['h:read']]]), read, WEDNESDAY)).toBe(0)
  })
})

describe('doneLine', () => {
  const items = todayItems(withHabits(withActivities(planned([work]), [workActivity]), [walk]), MONDAY)

  it('gives the count for the day, or that it is all done', () => {
    expect(doneLine(items, true)).toBe('0 of 2 done today')
    expect(doneLine(items.map(item => ({ ...item, done: true })), true)).toBe('All done today')
    expect(doneLine(items.slice(0, 1), false)).toBe('0 of 1 done that day')
  })

  it('says nothing is planned for an empty day', () => {
    expect(doneLine([], true)).toBe('Nothing planned')
  })
})

describe('countdownText', () => {
  it('counts down to a block within three hours before it', () => {
    expect(countdownText(600, 720, 560)).toEqual({ state: 'soon', text: 'In 40 min' })
    expect(countdownText(660, 720, 480)).toEqual({ state: 'soon', text: 'In 3 h' })
    expect(countdownText(600, 720, 540)).toEqual({ state: 'soon', text: 'In 1 h' })
  })

  it('gives the start hour when the block is more than three hours away', () => {
    expect(countdownText(720, 780, 480)).toEqual({ state: 'later', text: 'Starts at 12PM' })
  })

  it('reads the time left while the block runs, from its start to its end', () => {
    expect(countdownText(540, 600, 540)).toEqual({ state: 'now', text: 'On now · 1 h left' })
    expect(countdownText(540, 620, 540)).toEqual({ state: 'now', text: 'On now · 1 h 20 min left' })
    expect(countdownText(540, 600, 599)).toEqual({ state: 'now', text: 'On now · 1 min left' })
  })

  it('says the block ended and asks for a tick once its end has passed', () => {
    expect(countdownText(540, 720, 800)).toEqual({ state: 'ended', text: 'Ended at 12PM. Tick it if it happened.' })
    expect(countdownText(540, 720, 720)).toEqual({ state: 'ended', text: 'Ended at 12PM. Tick it if it happened.' })
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

  it('gives no line when the area has no target, or the target is to be defined', () => {
    expect(behindLine({ ...category, target1y: undefined })).toBeNull()
    expect(behindLine({ ...category, target1y: '   ' })).toBeNull()
    expect(behindLine({ ...category, targetTbd: true })).toBeNull()
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
      ['h:read', false, '3 a week · 1 of 3 this week'],
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
