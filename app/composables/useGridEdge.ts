import type { ComputedRef, Ref } from 'vue'
import type { GridPopups } from '~/composables/useGridPopups'
import { type Range, edgeStep, isMoved, keyEdge, rangeHasActivity, resizedRange } from '~/utils/weekGrid'

/** The grid's state and layout, owned by the grid and passed in as refs. `popups` is the box and menu the handles work with */
export interface GridEdgeOptions {
  selection: Ref<Range | null>
  baseline: Ref<Range | null>
  gridEl: Ref<HTMLElement | null>
  shownSlots: ComputedRef<string[]>
  collapsed: ComputedRef<boolean[]>
  hourTop: ComputedRef<number[]>
  popups: Pick<GridPopups, 'barRef' | 'barOpen' | 'menuOpen' | 'focusBox'>
}

export type GridEdge = ReturnType<typeof useGridEdge>

/**
 * The edge handles of a selected run (FR-PLAN-19, FR-PLAN-23): a drag from a handle with the pointer, and Up and Down with a focused
 * handle; Tab moves between a handle and the box. The handles show on a selection that holds an activity, and hide under the Apply menu.
 * The pure rules are in utils/weekGrid.ts
 */
export const useGridEdge = (options: GridEdgeOptions) => {
  const { selection, baseline, gridEl, shownSlots, collapsed, hourTop, popups } = options
  const { barRef, barOpen, menuOpen, focusBox } = popups

  let resizeDay: HTMLElement | null = null
  let resizeSide: 'top' | 'bottom' | null = null

  const selectionHasActivity = computed(() => !!selection.value && rangeHasActivity(selection.value, shownSlots.value))
  // The edge handles show on a selection that holds an activity, at once: a click or tap on a block, a keyboard run, an Apply (FR-PLAN-23).
  // They hide under the menu. Save and Cancel are in the box
  const handles = computed(() => !!selection.value && selectionHasActivity.value && !menuOpen.value)
  // Save and Cancel act on a move of the edge: the run differs from the one it was made on
  const moved = computed(() => isMoved(baseline.value, selection.value))

  const focusHandle = (side: 'top' | 'bottom') => gridEl.value?.querySelector<HTMLElement>(`.wk-handle.is-${side}`)?.focus()

  const startResize = (side: 'top' | 'bottom', event: PointerEvent) => {
    event.stopPropagation()
    event.preventDefault()
    resizeSide = side
    resizeDay = (event.currentTarget as HTMLElement).closest<HTMLElement>('.wk-day')
    window.addEventListener('pointermove', onResizeMove)
    window.addEventListener('pointerup', endResize)
    window.addEventListener('pointercancel', endResize)
  }

  const onResizeMove = (event: PointerEvent) => {
    if (!resizeDay || !resizeSide || !selection.value) return

    const y = event.clientY - resizeDay.getBoundingClientRect().top
    selection.value = resizedRange(selection.value, resizeSide, y, collapsed.value, hourTop.value)
  }

  const endResize = () => {
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', endResize)
    window.removeEventListener('pointercancel', endResize)
    resizeDay = null
    resizeSide = null
  }

  const onHandleKey = (side: 'top' | 'bottom', event: KeyboardEvent) => {
    const step = edgeStep(event.key)
    if (!step) return

    event.preventDefault()
    const range = selection.value
    if (!range) return

    selection.value = keyEdge(range, side, step, collapsed.value)
  }

  // Tab from the bottom handle goes to the box: the box is teleported, so the order is set here
  const onHandleTab = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    if (event.key === 'Tab' && !event.shiftKey && target.classList.contains('is-bottom') && barOpen.value) {
      event.preventDefault()
      focusBox()
    }
  }

  // Shift+Tab from the box's first button goes back to the bottom handle, when the handles show
  const onBarKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !event.shiftKey || !handles.value) return
    if (event.target !== barRef.value?.el?.querySelector('button')) return

    event.preventDefault()
    focusHandle('bottom')
  }

  // A drag in progress ends with the grid
  onBeforeUnmount(endResize)

  return { selectionHasActivity, handles, moved, focusHandle, startResize, onHandleKey, onHandleTab, onBarKey }
}
