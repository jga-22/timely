import { describe, expect, it } from 'vitest'
import type { PlannerState } from '~/types/planner'
import {
  axisLeft,
  axisTicks,
  dayAllowed,
  dayBlocks,
  dayHabits,
  dayHeaderLine,
  dayHours,
  dayRange,
  dayTitle,
  donePercent,
  formatDayLabel,
  habitHasDay,
  habitProgressText,
  habitTicked,
  isAllDone,
  isNowBlock,
  progressText,
  timelineSegments
} from '~/utils/home'
import { ONBOARDING_TEMPLATE_ID } from '~/utils/planner/seed'
import { activity, applyWeek, empty, type Run, slotsWith, withActivities, withDone, withHabits, withSlots, withTemplate } from './fixtures'

// 2026-10-26 is a Monday (day 0 of the week), 2026-10-27 a Tuesday
const MONDAY = '2026-10-26'
const TUESDAY = '2026-10-27'

/** The empty state with a plan of the given runs in its week type; the default night stays painted */
const planned = (runs: Run[], base: PlannerState = empty()): PlannerState => {
  const slots = base.templates.find(template => template.id === ONBOARDING_TEMPLATE_ID)!.slots

  return withSlots(base, ONBOARDING_TEMPLATE_ID, slotsWith(runs, slots))
}

const withoutSleep = (state: PlannerState): PlannerState => ({
  ...state,
  activities: state.activities.filter(item => item.id !== 'sleep'),
})

const work = { activityId: 'work', day: 0, start: 8, end: 12 }
const deepWorkActivity = activity('work', 'professionnelle')

describe('dayBlocks', () => {
  it('lists the blocks of the day in time order, sleep left out by default', () => {
    const state = withActivities(planned([work, { activityId: 'work', day: 0, start: 13, end: 17 }]), [deepWorkActivity])

    expect(dayBlocks(state, MONDAY)).toEqual([
      { start: 8, end: 12, activityId: 'work' },
      { start: 13, end: 17, activityId: 'work' },
    ])
  })

  it('includes the sleep blocks when sleep is shown', () => {
    const state = withActivities(planned([work]), [deepWorkActivity])

    expect(dayBlocks(state, MONDAY, true)).toEqual([
      { start: 0, end: 7, activityId: 'sleep' },
      { start: 8, end: 12, activityId: 'work' },
      { start: 22, end: 24, activityId: 'sleep' },
    ])
  })

  it('drops blocks of an activity the state does not know', () => {
    const state = planned([{ activityId: 'ghost', day: 0, start: 8, end: 10 }])

    expect(dayBlocks(state, MONDAY)).toEqual([])
  })

  it('has no blocks on a day that nothing is painted on', () => {
    const state = withActivities(planned([work]), [deepWorkActivity])

    expect(dayBlocks(state, TUESDAY)).toEqual([])
  })
})

describe('dayHours', () => {
  it('gives the activity of each of the 24 hours, null when unplanned', () => {
    const hours = dayHours(withActivities(planned([work]), [deepWorkActivity]), MONDAY)

    expect(hours).toHaveLength(24)
    expect(hours[7]).toBeNull()
    expect(hours[8]).toBe('work')
    expect(hours[11]).toBe('work')
    expect(hours[12]).toBeNull()
    expect(hours[23]).toBeNull()
  })
})

describe('dayRange', () => {
  it('trims the sleep at the start and the end of the day when sleep is hidden', () => {
    // The default night is 10 PM to 7 AM: the bar runs from 7 to 22
    expect(dayRange(planned([]), MONDAY)).toEqual({ start: 7, end: 22 })
  })

  it('keeps the whole day when sleep is shown', () => {
    expect(dayRange(planned([]), MONDAY, true)).toEqual({ start: 0, end: 24 })
  })

  it('keeps the whole day when there is no sleep activity', () => {
    expect(dayRange(withoutSleep(planned([])), MONDAY)).toEqual({ start: 0, end: 24 })
  })

  it('keeps all 24 hours on a day that is all sleep', () => {
    const allSleep = Array.from({ length: 24 }, (_, hour) => ({ activityId: 'sleep', day: 0, start: hour, end: hour + 1 }))

    expect(dayRange(planned(allSleep), MONDAY)).toEqual({ start: 0, end: 24 })
  })

  it('follows awake hours that start earlier or end later than the default night', () => {
    const early = planned([{ activityId: 'work', day: 0, start: 5, end: 6 }])

    expect(dayRange(early, MONDAY)).toEqual({ start: 5, end: 22 })
  })
})

describe('dayHabits', () => {
  const walk = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' as const } }
  const focus = { id: 'focus', categoryId: 'professionnelle', name: 'Focus', frequency: { count: 3, period: 'week' as const }, activityId: 'work' }
  const sleepy = { id: 'sleepy', categoryId: 'physique', name: 'Go to bed', frequency: { count: 1, period: 'day' as const }, activityId: 'sleep' }

  it('lists the habits without an activity', () => {
    const state = withHabits(withActivities(planned([work]), [deepWorkActivity]), [walk])

    expect(dayHabits(state, MONDAY).map(habit => habit.id)).toEqual(['walk'])
  })

  it('leaves out a linked habit whose activity has a block that week, on its own day and on the others', () => {
    const state = withHabits(withActivities(planned([work]), [deepWorkActivity]), [focus])

    expect(dayHabits(state, MONDAY).map(habit => habit.id)).toEqual([])
    expect(dayHabits(state, TUESDAY).map(habit => habit.id)).toEqual([])
  })

  it('lists a linked habit whose activity has no block that week', () => {
    const state = withHabits(withActivities(planned([]), [deepWorkActivity]), [focus])

    expect(dayHabits(state, MONDAY).map(habit => habit.id)).toEqual(['focus'])
    expect(dayHabits(state, TUESDAY).map(habit => habit.id)).toEqual(['focus'])
  })

  it('judges a day-assigned habit by the template of its own week', () => {
    const linkedWalk = { ...walk, activityId: 'work' }
    const base = withHabits(withActivities(planned([work]), [deepWorkActivity]), [linkedWalk])
    const template = planned([]).templates.find(item => item.id === ONBOARDING_TEMPLATE_ID)!
    // The week of 2 November uses a week type without the activity (the copy starts from the unpainted night)
    const state = applyWeek(withTemplate(base, { ...template, id: 'quiet', name: 'Quiet' }), '2026-11-02', 'quiet')

    expect(dayHabits(state, MONDAY).map(habit => habit.id)).toEqual([])
    expect(dayHabits(state, '2026-11-02').map(habit => habit.id)).toEqual(['walk'])
  })

  it('leaves out a habit of the Sleep activity while sleep is hidden, and a sleep habit whose block is shown', () => {
    const state = withHabits(planned([]), [sleepy])

    expect(dayHabits(state, MONDAY).map(habit => habit.id)).toEqual([])
    expect(dayHabits(state, MONDAY, true).map(habit => habit.id)).toEqual([])
  })
})

describe('habitHasDay', () => {
  const linked = { id: 'focus', categoryId: 'professionnelle', name: 'Focus', frequency: { count: 3, period: 'week' as const }, activityId: 'work' }

  it('is true when the linked activity has a block in the week of the date, on any day of it', () => {
    const state = withHabits(withActivities(planned([{ ...work, day: 4 }]), [deepWorkActivity]), [linked])

    expect(habitHasDay(state, linked, MONDAY)).toBe(true)
    expect(habitHasDay(state, linked, '2026-10-30')).toBe(true)
  })

  it('is false with no linked activity, an unknown activity, or no block that week', () => {
    const unlinked = { ...linked, activityId: undefined }
    const ghost = { ...linked, activityId: 'ghost' }
    const state = withActivities(planned([work]), [deepWorkActivity])

    expect(habitHasDay(state, unlinked, MONDAY)).toBe(false)
    expect(habitHasDay(state, ghost, MONDAY)).toBe(false)
    expect(habitHasDay(withActivities(planned([]), [deepWorkActivity]), linked, MONDAY)).toBe(false)
  })
})

describe('dayHabits: habits due on the day', () => {
  const daily = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' as const } }
  const weekly = { id: 'focus', categoryId: 'professionnelle', name: 'Focus', frequency: { count: 3, period: 'week' as const } }
  const monthly = { id: 'mentor', categoryId: 'professionnelle', name: 'Mentor', frequency: { count: 4, period: 'month' as const } }
  const sleepy = { id: 'sleepy', categoryId: 'physique', name: 'Go to bed', frequency: { count: 1, period: 'day' as const }, activityId: 'sleep' }
  const ids = (state: PlannerState, date: string, showSleep = false) => dayHabits(state, date, showSleep).map(habit => habit.id)

  it('always lists a daily habit, ticked or not, on any day', () => {
    const state = withDone(withHabits(empty(), [daily]), '2026-10-27', ['h:walk'])

    expect(ids(state, '2026-10-27')).toEqual(['walk'])
    expect(ids(state, '2026-10-28')).toEqual(['walk'])
  })

  it('lists a weekly habit while it is short of its count in the week', () => {
    const state = withDone(withHabits(empty(), [weekly]), '2026-10-26', ['h:focus'])

    // Wednesday 28 October: one of three ticks so far this week
    expect(ids(state, '2026-10-28')).toEqual(['focus'])
  })

  it('hides a weekly habit that has met its count earlier in the week and is not ticked on the day', () => {
    const state = withDone(withHabits(empty(), [weekly]), '2026-10-26', ['h:focus'])
    const met = withDone(withDone(state, '2026-10-27', ['h:focus']), '2026-10-28', ['h:focus'])

    // Thursday 29 October: three ticks already, none today
    expect(ids(met, '2026-10-29')).toEqual([])
  })

  it('keeps a weekly habit that has met its count when it is ticked on the day, so the tick can be undone', () => {
    const met = withDone(withDone(withDone(withHabits(empty(), [weekly]), '2026-10-26', ['h:focus']), '2026-10-27', ['h:focus']), '2026-10-28', ['h:focus'])

    expect(ids(met, '2026-10-28')).toEqual(['focus'])
    expect(ids(met, '2026-10-29')).toEqual([])
  })

  it('lists a monthly habit while it is short of its count in the month, and hides it once met unless ticked on the day', () => {
    const short = withDone(withDone(withHabits(empty(), [monthly]), '2026-10-01', ['h:mentor']), '2026-10-05', ['h:mentor'])
    const met = withDone(withDone(short, '2026-10-10', ['h:mentor']), '2026-10-15', ['h:mentor'])

    expect(ids(short, '2026-10-20')).toEqual(['mentor'])
    expect(ids(met, '2026-10-20')).toEqual([])
    expect(ids(met, '2026-10-15')).toEqual(['mentor'])
  })

  it('judges a past day by the week or month of that date, not by today', () => {
    const state = withDone(withDone(withHabits(empty(), [weekly]), '2026-10-27', ['h:focus']), '2026-10-28', ['h:focus'])
    const later = withDone(state, '2026-10-29', ['h:focus'])

    // Monday 26 October: the week had two ticks on 27 and 28, so it is still short, not ticked that day
    expect(ids(state, '2026-10-26')).toEqual(['focus'])
    // The same Monday once the third tick of that week is on 29 October: the week was met, so the day's list hides it
    expect(ids(later, '2026-10-26')).toEqual([])
  })

  it('leaves a sleep habit out while sleep is hidden, whatever its frequency and count', () => {
    const sleepyWeekly = { ...sleepy, id: 'sleepy-week', frequency: { count: 5, period: 'week' as const } }
    const state = withHabits(planned([]), [sleepy, sleepyWeekly])

    expect(ids(state, MONDAY)).toEqual([])
    expect(ids(state, TUESDAY)).toEqual([])
  })
})

describe('habitProgressText', () => {
  const weekly = { id: 'focus', categoryId: 'professionnelle', name: 'Focus', frequency: { count: 3, period: 'week' as const } }
  const monthly = { id: 'mentor', categoryId: 'professionnelle', name: 'Mentor', frequency: { count: 4, period: 'month' as const } }
  const daily = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' as const } }

  it('counts the ticks of the week and the month', () => {
    const state = withDone(withDone(empty(), '2026-10-26', ['h:focus']), '2026-10-30', ['h:focus'])

    expect(habitProgressText(state, weekly, '2026-10-28')).toBe('2 of 3 this week')
    expect(habitProgressText(withDone(empty(), '2026-11-02', ['h:mentor']), monthly, '2026-10-28')).toBe('0 of 4 this month')
  })

  it('has no progress line for a daily habit', () => {
    expect(habitProgressText(empty(), daily, '2026-10-28')).toBeNull()
  })
})

describe('habitTicked', () => {
  it('reads the habit tick of the date', () => {
    const walk = { id: 'walk', categoryId: 'physique', name: 'Walk', frequency: { count: 1, period: 'day' as const } }
    const state = withDone(empty(), '2026-10-28', ['h:walk'])

    expect(habitTicked(state, walk, '2026-10-28')).toBe(true)
    expect(habitTicked(state, walk, '2026-10-27')).toBe(false)
  })
})

describe('formatDayLabel', () => {
  it('reads the weekday, day, month and year in English', () => {
    expect(formatDayLabel('2026-10-25')).toBe('Sunday 25 October 2026')
    expect(formatDayLabel('2026-01-01')).toBe('Thursday 1 January 2026')
  })
})

describe('timeline and axis', () => {
  const full = { start: 0, end: 24 }
  const trimmed = { start: 7, end: 22 }

  it('labels the axis hours inside the span only', () => {
    expect(axisTicks(full)).toEqual([9, 12, 18, 22])
    expect(axisTicks(trimmed)).toEqual([9, 12, 18])
    expect(axisTicks({ start: 9, end: 12 })).toEqual([])
  })

  it('places an hour as a percentage of the span', () => {
    expect(axisLeft(12, full)).toBe('50%')
    expect(axisLeft(7, trimmed)).toBe('0%')
    expect(axisLeft(18, trimmed)).toBe(`${(11 / 15) * 100}%`)
  })

  it('builds one segment per hour of the span, named and coloured by its activity', () => {
    const hours: Array<string | null> = Array.from({ length: 24 }, () => null)
    hours[8] = 'work'
    hours[9] = 'work'
    const names: Record<string, string> = { work: 'Deep work' }
    const segments = timelineSegments(hours, { start: 8, end: 11 }, id => names[id] ?? '', id => `colour-${id}`)

    expect(segments).toEqual([
      { key: 'h8', color: 'colour-work', title: '8AM, Deep work' },
      { key: 'h9', color: 'colour-work', title: '9AM, Deep work' },
      { key: 'h10', color: '', title: '10AM, unplanned' }
    ])
  })

  it('titles an activity with no name as unplanned, keeping its colour', () => {
    const hours: Array<string | null> = Array.from({ length: 24 }, () => 'ghost')

    expect(timelineSegments(hours, { start: 0, end: 1 }, () => '', id => id)[0]).toEqual({ key: 'h0', color: 'ghost', title: '12AM, unplanned' })
  })
})

describe('day progress', () => {
  it('is done only when every item is done, and never for an empty day', () => {
    expect(isAllDone(3, 3)).toBe(true)
    expect(isAllDone(2, 3)).toBe(false)
    expect(isAllDone(0, 0)).toBe(false)
  })

  it('gives the share done, or null when nothing is planned', () => {
    expect(donePercent(1, 4)).toBe(25)
    expect(donePercent(0, 0)).toBeNull()
  })

  it('words the line for the day', () => {
    expect(progressText(2, 5, 'today')).toBe('2 of 5 done')
    expect(progressText(5, 5, 'today')).toBe('All done for today')
    expect(progressText(5, 5, 'Sunday 25 October 2026')).toBe('All done for Sunday 25 October 2026')
  })

  it('marks the current hour only on today, once the clock is read', () => {
    const block = { start: 9, end: 10, activityId: 'work' }

    expect(isNowBlock(block, 9, true)).toBe(true)
    expect(isNowBlock(block, 10, true)).toBe(false)
    expect(isNowBlock(block, 9, false)).toBe(false)
    expect(isNowBlock(block, null, true)).toBe(false)
  })
})

describe('day header and navigation', () => {
  it('titles today and any other day, and "Today" until the day is known', () => {
    expect(dayTitle('2026-10-25', true)).toBe('Today')
    expect(dayTitle('2026-10-25', false)).toBe('Sunday 25 October 2026')
    expect(dayTitle(null, false)).toBe('Today')
  })

  it('gives the day label on today and the ISO week, and nothing until the day is known', () => {
    expect(dayHeaderLine('2026-10-25', true)).toBe('Sunday 25 October 2026 · Week 43')
    expect(dayHeaderLine('2026-10-25', false)).toBe('Week 43')
    expect(dayHeaderLine(null, false)).toBeNull()
  })

  it('refuses a future day and a day before the back limit', () => {
    expect(dayAllowed('2026-10-27', '2026-10-27', '2026-08-28')).toBe(true)
    expect(dayAllowed('2026-10-28', '2026-10-27', '2026-08-28')).toBe(false)
    expect(dayAllowed('2026-08-27', '2026-10-27', '2026-08-28')).toBe(false)
    expect(dayAllowed('2026-10-27', null, null)).toBe(false)
  })
})
