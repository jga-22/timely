import type { ComputedRef, Ref } from 'vue'
import { type Cell, type Range, blockAt, bandOf, dragRange, hourAtY, keyRange, singleCell, stepFor, touchMovedBeyond } from '~/utils/weekGrid'

/** A touch that moves further than this (px) is a scroll, not a tap */
const TOUCH_SLOP = 8

/** A press on the grid, from pointerdown until its pointerup: a click, a tap or the start of a drag */
interface Press { pointerId: number; pointerType: string; x: number; y: number; cell: Cell; block: Range | null; dragging: boolean }

/** The grid's state and layout, owned by the grid and passed in as refs. The edit's callbacks end the edit, open the box and focus the cursor */
export interface GridSelectionOptions {
  selection: Ref<Range | null>
  baseline: Ref<Range | null>
  anchor: Ref<Cell | null>
  cursor: Ref<Cell>
  hourly: ComputedRef<boolean>
  shownSlots: ComputedRef<string[]>
  collapsed: ComputedRef<boolean[]>
  hourTop: ComputedRef<number[]>
  endEdit: () => void
  placeAt: () => void
  focusCursor: () => void
}

/**
 * The grid's selection (FR-PLAN-19, FR-PLAN-23): one run of hours in one day column, set by a press and drag, a click or tap on an hour
 * or a block, or the keyboard (arrows, Shift with arrows, Enter or Space). The pure rules are in utils/weekGrid.ts.
 * A touch only taps, so the page still scrolls
 */
export const useGridSelection = (options: GridSelectionOptions) => {
  const { selection, baseline, anchor, cursor, hourly, shownSlots, collapsed, hourTop, endEdit, placeAt, focusCursor } = options
  let press: Press | null = null

  const setCursor = (cell: Cell) => {
    cursor.value = { day: cell.day, hour: cell.hour }
  }

  const blockOf = (cell: Cell) => blockAt(shownSlots.value, cell)
  const hourAt = (y: number) => hourAtY(hourTop.value, y)
  const bandAt = (hour: number) => bandOf(collapsed.value, hour)

  // The hour and the block under a point in a day column, or null outside the columns
  const cellAt = (x: number, y: number): { cell: Cell; block: Range | null } | null => {
    const column = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.wk-day')
    if (!column) return null

    const rect = column.getBoundingClientRect()
    const hour = hourAt(y - rect.top)
    if (hour === null) return null

    const cell = { day: Number(column.dataset.day), hour }
    return { cell, block: blockOf(cell) }
  }

  // Pointer: press on an hour, drag down the same day column, release to open the bar.
  // A click or tap on a block selects the whole block; a tap on an empty hour selects that hour. Touch only taps, so the page still scrolls
  const onPointerDown = (event: PointerEvent) => {
    if (!hourly.value || event.button !== 0) return

    // Buttons inside the grid (clear day, block delete) handle their own clicks
    if ((event.target as HTMLElement).closest('button')) return

    const hit = cellAt(event.clientX, event.clientY)
    if (!hit) return

    // A mouse press starts a new selection now. A touch waits for its tap, so a scroll leaves the box as it is
    if (event.pointerType === 'mouse') endEdit()
    setCursor(hit.cell)
    press = { pointerId: event.pointerId, pointerType: event.pointerType, x: event.clientX, y: event.clientY, cell: hit.cell, block: hit.block, dragging: false }

    if (event.pointerType === 'mouse') {
      event.preventDefault()
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
      selection.value = singleCell(hit.cell)
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!press) return

    if (press.pointerType !== 'mouse') {
      if (touchMovedBeyond(press, { x: event.clientX, y: event.clientY }, TOUCH_SLOP)) press = null
      return
    }

    const hit = cellAt(event.clientX, event.clientY)
    if (!hit || hit.cell.day !== press.cell.day) return

    // A drag stops at the edge of its shown run: it never selects across a collapsed run
    const range = dragRange(press.cell, hit.cell, bandAt(press.cell.hour))

    if (!selection.value || selection.value.start !== range.start || selection.value.end !== range.end) {
      selection.value = range
    }

    if (hit.cell.hour !== press.cell.hour) press.dragging = true
  }

  const onPointerUp = (event: PointerEvent) => {
    const current = press
    press = null
    if (!current || current.pointerId !== event.pointerId) return

    if (current.pointerType === 'mouse' && current.dragging) {
      baseline.value = selection.value ? { ...selection.value } : null
      placeAt()
      return
    }

    // A click or tap selects its block, or its hour: this run is what the box opens on
    endEdit()
    selection.value = current.block ?? singleCell(current.cell)
    baseline.value = { ...selection.value }
    placeAt()
  }

  const onPointerCancel = () => {
    press = null
  }

  // Keyboard: arrows move the focused hour, Shift with arrows selects within one day, Enter or Space opens the bar
  const onKeydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    if (!hourly.value || !target.dataset.hour) return

    const step = stepFor(event.key, cursor.value, collapsed.value)

    if (step) {
      event.preventDefault()
      const from = event.shiftKey ? (anchor.value ?? cursor.value) : null
      const range = from ? keyRange(from, step, collapsed.value) : null
      endEdit()
      anchor.value = from ? { ...from } : null
      selection.value = range
      baseline.value = range ? { ...range } : null
      setCursor(step)
      focusCursor()
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!selection.value) {
        selection.value = blockOf(cursor.value) ?? singleCell(cursor.value)
        baseline.value = { ...selection.value }
      }
      placeAt()
    }
  }

  // The release can come outside the grid: the press ends here too
  onMounted(() => {
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
  })

  return { setCursor, onPointerDown, onPointerMove, onKeydown }
}
