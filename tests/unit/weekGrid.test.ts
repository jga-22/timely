import { describe, expect, it } from 'vitest'
import { bandOf, blockAt, cancelAction, cellsOf, clearableCells, collapsedBandLabels, collapsedHours, dragRange, edgeHourAt, flowRows, hourAtY, hourTops, isMoved, keyRange, menuTop, nearestShown, popupBeside, saveAction, setEdge, stepFor, stepHour, withoutSleep } from '~/utils/weekGrid'

const SLEEP = 'sleep'
const WORK = 'work'

/** A week of slots: sleep at night (hours 0 to 6 and 22 to 23) and work from 9 to 12 on Monday, free elsewhere */
const nightWeek = () => Array.from({ length: 7 * 24 }, (_, index) => {
  const hour = index % 24
  if (hour < 7 || hour >= 22) return SLEEP
  if (index < 24 && hour >= 9 && hour < 13) return WORK
  return ''
})

/** Hours 0 to 6 and 22 to 23 */
const NIGHT = [0, 1, 2, 3, 4, 5, 6, 22, 23]

describe('collapsedHours', () => {
  it('does not collapse anything when sleep is shown', () => {
    expect(collapsedHours(nightWeek(), null).some(Boolean)).toBe(false)
  })

  it('collapses the hours that are sleep on all seven days while sleep is hidden', () => {
    const collapsed = collapsedHours(nightWeek(), SLEEP)

    expect(collapsed.flatMap((hidden, hour) => (hidden ? [hour] : []))).toEqual(NIGHT)
  })

  it('never collapses all 24 hours', () => {
    const collapsed = collapsedHours(Array.from({ length: 168 }, () => SLEEP), SLEEP)

    expect(collapsed.some(Boolean)).toBe(false)
  })
})

describe('flowRows', () => {
  it('drops the leading and trailing bands (they sit above and below the grid)', () => {
    const rows = flowRows(collapsedHours(nightWeek(), SLEEP))

    expect(rows[0]).toEqual({ kind: 'hour', hour: 7 })
    expect(rows[rows.length - 1]).toEqual({ kind: 'hour', hour: 21 })
    expect(rows.filter(row => row.kind === 'gap')).toEqual([])
  })

  it('merges an inner run of collapsed hours into one gap', () => {
    const collapsed = Array.from({ length: 24 }, (_, hour) => [5, 6].includes(hour))
    const rows = flowRows(collapsed)

    expect(rows.filter(row => row.kind === 'gap')).toEqual([{ kind: 'gap', from: 5, to: 7 }])
    expect(rows[5]).toEqual({ kind: 'gap', from: 5, to: 7 })
    expect(rows[6]).toEqual({ kind: 'hour', hour: 7 })
  })
})

describe('hourTops', () => {
  it('adds the gap height once per gap', () => {
    const collapsed = Array.from({ length: 24 }, (_, hour) => [5, 6].includes(hour))
    const tops = hourTops(flowRows(collapsed), 28, 14)

    expect(tops[4]).toBe(4 * 28)
    expect(tops[7]).toBe(5 * 28 + 14)
    expect(tops[5]).toBeUndefined()
  })
})

describe('stepHour', () => {
  it('skips collapsed hours in both directions', () => {
    const collapsed = collapsedHours(nightWeek(), SLEEP)

    expect(stepHour(collapsed, 7, -1)).toBe(7)
    expect(stepHour(collapsed, 8, -1)).toBe(7)
    expect(stepHour(collapsed, 21, 1)).toBe(21)
    expect(stepHour(collapsed, 20, 1)).toBe(21)
  })
})

describe('blockAt', () => {
  it('returns the full run of the block that holds the hour', () => {
    expect(blockAt(nightWeek(), { day: 0, hour: 10 })).toEqual({ day: 0, start: 9, end: 13 })
    expect(blockAt(nightWeek(), { day: 0, hour: 13 })).toBeNull()
  })
})

describe('cellsOf', () => {
  it('lists the slot index of each hour in the run', () => {
    expect(cellsOf({ day: 1, start: 2, end: 4 })).toEqual([26, 27])
  })
})

describe('bandOf and hourAtY', () => {
  it('keeps a run of shown hours inside its collapsed edges', () => {
    const collapsed = collapsedHours(nightWeek(), SLEEP)

    expect(bandOf(collapsed, 10)).toEqual({ start: 7, end: 22 })
    expect(hourAtY(hourTops(flowRows(collapsed), 28, 14), 0)).toBe(7)
    expect(nearestShown([7, 8, 21], 1)).toBe(7)
  })
})

describe('setEdge', () => {
  const band = { start: 7, end: 22 }
  const run = { day: 1, start: 10, end: 13 }

  it('moves the top edge and keeps at least one hour', () => {
    expect(setEdge(run, 'top', 8, band)).toEqual({ day: 1, start: 8, end: 13 })
    expect(setEdge(run, 'top', 13, band)).toEqual({ day: 1, start: 12, end: 13 })
  })

  it('moves the bottom edge and keeps at least one hour', () => {
    expect(setEdge(run, 'bottom', 15, band)).toEqual({ day: 1, start: 10, end: 15 })
    expect(setEdge(run, 'bottom', 10, band)).toEqual({ day: 1, start: 10, end: 11 })
  })

  it('stops each edge at its band', () => {
    expect(setEdge(run, 'top', 2, band)).toEqual({ day: 1, start: 7, end: 13 })
    expect(setEdge(run, 'bottom', 24, band)).toEqual({ day: 1, start: 10, end: 22 })
  })
})

describe('edgeHourAt', () => {
  // Tops with one 28 px row per hour, so hour h starts at 28 * h
  const tops = Array.from({ length: 24 }, (_, hour) => hour * 28)
  const band = { start: 0, end: 24 }

  it('picks the nearest top line of the run', () => {
    expect(edgeHourAt('top', 60, { day: 0, start: 10, end: 13 }, band, tops)).toBe(2)
    expect(edgeHourAt('top', 2 * 28 + 13, { day: 0, start: 10, end: 13 }, band, tops)).toBe(2)
  })

  it('picks the nearest bottom line of the run', () => {
    expect(edgeHourAt('bottom', 14 * 28, { day: 0, start: 10, end: 13 }, band, tops)).toBe(14)
    expect(edgeHourAt('bottom', 11 * 28 + 5, { day: 0, start: 10, end: 13 }, band, tops)).toBe(11)
  })

  it('only offers the lines inside its band', () => {
    expect(edgeHourAt('top', 0, { day: 0, start: 10, end: 13 }, { start: 9, end: 12 }, tops)).toBe(9)
    expect(edgeHourAt('bottom', 24 * 28, { day: 0, start: 10, end: 13 }, { start: 9, end: 12 }, tops)).toBe(12)
  })
})

describe('dragRange', () => {
  const band = { start: 7, end: 22 }

  it('covers the hours from the press to the pointer, in the press day', () => {
    expect(dragRange({ day: 2, hour: 10 }, { day: 2, hour: 12 }, band)).toEqual({ day: 2, start: 10, end: 13 })
    expect(dragRange({ day: 2, hour: 12 }, { day: 2, hour: 10 }, band)).toEqual({ day: 2, start: 10, end: 13 })
  })

  it('stops at the edge of the band', () => {
    expect(dragRange({ day: 2, hour: 10 }, { day: 2, hour: 2 }, band)).toEqual({ day: 2, start: 7, end: 11 })
    expect(dragRange({ day: 2, hour: 10 }, { day: 2, hour: 23 }, band)).toEqual({ day: 2, start: 10, end: 22 })
  })
})

describe('keyRange', () => {
  const collapsed = collapsedHours(nightWeek(), SLEEP)

  it('selects the hours between the anchor and the cursor in one day', () => {
    expect(keyRange({ day: 1, hour: 10 }, { day: 1, hour: 12 }, collapsed)).toEqual({ day: 1, start: 10, end: 13 })
    expect(keyRange({ day: 1, hour: 12 }, { day: 1, hour: 10 }, collapsed)).toEqual({ day: 1, start: 10, end: 13 })
  })

  it('selects nothing across two days or across a collapsed run', () => {
    expect(keyRange({ day: 1, hour: 10 }, { day: 2, hour: 10 }, collapsed)).toBeNull()
    const split = Array.from({ length: 24 }, (_, hour) => hour === 12)
    expect(keyRange({ day: 1, hour: 10 }, { day: 1, hour: 13 }, split)).toBeNull()
  })
})

describe('stepFor', () => {
  const collapsed = collapsedHours(nightWeek(), SLEEP)

  it('moves one day left or right, within the week', () => {
    expect(stepFor('ArrowLeft', { day: 0, hour: 9 }, collapsed)).toEqual({ day: 0, hour: 9 })
    expect(stepFor('ArrowRight', { day: 6, hour: 9 }, collapsed)).toEqual({ day: 6, hour: 9 })
    expect(stepFor('ArrowRight', { day: 2, hour: 9 }, collapsed)).toEqual({ day: 3, hour: 9 })
  })

  it('moves one shown hour up or down', () => {
    expect(stepFor('ArrowUp', { day: 2, hour: 7 }, collapsed)).toEqual({ day: 2, hour: 7 })
    expect(stepFor('ArrowDown', { day: 2, hour: 21 }, collapsed)).toEqual({ day: 2, hour: 21 })
    expect(stepFor('ArrowDown', { day: 2, hour: 8 }, collapsed)).toEqual({ day: 2, hour: 9 })
  })

  it('returns null for keys that do not move the cursor', () => {
    expect(stepFor('Enter', { day: 2, hour: 8 }, collapsed)).toBeNull()
  })
})

describe('withoutSleep and clearableCells', () => {
  const slots = nightWeek()

  it('reads hidden sleep as empty and keeps the other hours', () => {
    const shown = withoutSleep(slots, SLEEP)

    expect(shown[0]).toBe('')
    expect(shown[9]).toBe(WORK)
    expect(shown.filter(Boolean)).toHaveLength(4)
  })

  it('keeps sleep out of a clear while it is hidden, and clears it when shown', () => {
    const range = { day: 0, start: 6, end: 10 }

    expect(clearableCells(range, slots, SLEEP, false)).toEqual([7, 8, 9])
    expect(clearableCells(range, slots, SLEEP, true)).toEqual([6, 7, 8, 9])
  })
})

describe('collapsedBandLabels', () => {
  it('names the leading and trailing collapsed hours', () => {
    expect(collapsedBandLabels(7, 21)).toEqual({ top: '12 AM to 7 AM', bottom: '10 PM to 12 AM' })
  })

  it('leaves a band empty when nothing is collapsed on its side', () => {
    expect(collapsedBandLabels(0, 23)).toEqual({ top: '', bottom: '' })
  })
})

describe('popupBeside and menuTop', () => {
  it('opens a popup beside its day column on desktop, level with the run', () => {
    expect(popupBeside({ left: 400, right: 540 }, 300, { width: 1280, height: 900 })).toEqual({ x: 552, y: 300 })
  })

  it('opens to the left of the column when the right has no room, and keeps it on the screen', () => {
    expect(popupBeside({ left: 1100, right: 1240 }, 300, { width: 1280, height: 900 })).toEqual({ x: 828, y: 300 })
    expect(popupBeside({ left: 400, right: 540 }, 880, { width: 1280, height: 900 })).toEqual({ x: 552, y: 700 })
  })

  it('opens a popup at the bottom on phones', () => {
    expect(popupBeside({ left: 100, right: 240 }, 300, { width: 400, height: 800 })).toEqual({ x: 16, y: 640 })
  })

  it('moves a menu up when its bottom would pass the screen edge', () => {
    expect(menuTop(600, 200, 900)).toBe(600)
    expect(menuTop(800, 200, 900)).toBe(692)
    expect(menuTop(-50, 200, 900)).toBe(8)
  })
})

describe('isMoved', () => {
  const block = { day: 1, start: 10, end: 13 }

  it('is false for the same run and for a missing side', () => {
    expect(isMoved(block, { ...block })).toBe(false)
    expect(isMoved(null, block)).toBe(false)
    expect(isMoved(block, null)).toBe(false)
  })

  it('is true when either edge or the day changes', () => {
    expect(isMoved(block, { ...block, start: 9 })).toBe(true)
    expect(isMoved(block, { ...block, end: 12 })).toBe(true)
    expect(isMoved(block, { ...block, day: 2 })).toBe(true)
  })
})

describe('saveAction and cancelAction', () => {
  it('saves nothing when the run has not moved', () => {
    expect(saveAction(false, false)).toBe('none')
    expect(saveAction(false, true)).toBe('none')
  })

  it('extends the Apply undo step for a move made by an Apply edit, and commits any other move', () => {
    expect(saveAction(true, true)).toBe('extend')
    expect(saveAction(true, false)).toBe('commit')
  })

  it('reverts a moved edge, and closes a clean selection', () => {
    expect(cancelAction(true)).toBe('revert')
    expect(cancelAction(false)).toBe('close')
  })
})
