import type { ComputedRef, Ref } from 'vue'
import { useGridUndo } from '~/composables/useGridUndo'
import { useNav } from '~/composables/useNav'
import { type Cell, type Range, appliesChange, applyLabel, bandOf, cancelAction, cellsOf, clearableCells, edgeHourAt, firstActivityIn, isMoved, menuTop, popupBeside, rangeHasActivity, rangeLabel, saveAction, setEdge, sleepHoursIn } from '~/utils/weekGrid'

/** The grid's state and layout, owned by the grid and passed in as refs. `paintCells` is the store's paint; `onOpen` tells the parent a box or menu opened */
export interface GridEditOptions {
  selection: Ref<Range | null>
  baseline: Ref<Range | null>
  anchor: Ref<Cell | null>
  cursor: Ref<Cell>
  gridEl: Ref<HTMLElement | null>
  activeTemplate: Ref<{ id: string } | undefined>
  slots: ComputedRef<string[]>
  shownSlots: ComputedRef<string[]>
  sleepId: ComputedRef<string | null>
  sleepHidden: ComputedRef<boolean>
  showSleep: Ref<boolean>
  collapsed: ComputedRef<boolean[]>
  hourTop: ComputedRef<number[]>
  activityMap: ComputedRef<Map<string, { name: string }>>
  paintCells: (templateId: string, cells: number[], activityId: string | null) => void
  onOpen: () => void
}

/**
 * The grid's box and menu and the edit of a selected run (FR-PLAN-23, FR-ITEM-3, FR-SLEEP-5): the action bar (Change or Apply, Edit,
 * Delete, Save, Cancel), the Apply menu, the edge handles (drag, Tab, Up and Down), one undo step per change, and the focus that returns
 * to the grid. The box and the menu open beside the run's day column, and close each other and the grid's selection
 */
export const useGridEdit = (options: GridEditOptions) => {
  const { selection, baseline, anchor, cursor, gridEl, activeTemplate, slots, shownSlots, sleepId, sleepHidden, showSleep, collapsed, hourTop, activityMap, paintCells, onOpen } = options
  const { undo, dismissUndo, restartUndoTimer, stopUndoTimer, commit, undoLast: undoChange } = useGridUndo()
  const { setSelection } = useNav()

  const barRef = ref<{ el: HTMLElement | null } | null>(null)
  const menuRef = ref<{ el: HTMLElement | null } | null>(null)
  const barOpen = ref(false)
  const barPos = ref({ x: 0, y: 0 })
  const menuOpen = ref(false)
  // True while the edit that Apply opened is open: its undo step is the Apply's, and Save extends that step
  const editFromApply = ref(false)
  // Whether the press that starts a click was inside the editor (the grid, its box or its handles)
  let pressInside = false
  let resizeDay: HTMLElement | null = null
  let resizeSide: 'top' | 'bottom' | null = null

  const editing = computed(() => !!selection.value || barOpen.value || menuOpen.value)
  const selectionHasActivity = computed(() => !!selection.value && rangeHasActivity(selection.value, shownSlots.value))
  // The edge handles show on a selection that holds an activity, at once: a click or tap on a block, a keyboard run, an Apply (FR-PLAN-23).
  // They hide under the menu. Save and Cancel are in the box
  const handles = computed(() => !!selection.value && selectionHasActivity.value && !menuOpen.value)
  const moved = computed(() => isMoved(baseline.value, selection.value))
  const firstActivity = (range: Range) => firstActivityIn(range, shownSlots.value)

  const focusCursor = () => {
    nextTick(() => gridEl.value?.querySelector<HTMLElement>(`.wk-slot[data-day="${cursor.value.day}"][data-hour="${cursor.value.hour}"]`)?.focus())
  }

  const focusBox = () => barRef.value?.el?.querySelector<HTMLButtonElement>('button')?.focus()
  const focusBottomHandle = () => gridEl.value?.querySelector<HTMLElement>('.wk-handle.is-bottom')?.focus()

  // The bar and the menu open beside the run's day column, so they never cover its handles; on phones at the bottom of the screen
  const placeBar = () => {
    const range = selection.value
    const column = range ? gridEl.value?.querySelector<HTMLElement>(`.wk-day[data-day="${range.day}"]`) : null
    if (!range || !column) return

    const rect = column.getBoundingClientRect()
    barPos.value = popupBeside({ left: rect.left, right: rect.right }, rect.top + (hourTop.value[range.start] ?? 0), { width: window.innerWidth, height: window.innerHeight })
  }

  const openBar = () => {
    menuOpen.value = false
    barOpen.value = true
    onOpen()
    nextTick(focusBox)
  }

  /** Opens the box on the selection: the place it goes, then the box itself */
  const placeAt = () => {
    placeBar()
    openBar()
  }

  /** Ends the selection and any box or menu. An Apply's undo step, which waited for its edit, resumes its timer */
  const endEdit = () => {
    const endsApplyEdit = editFromApply.value
    barOpen.value = false
    menuOpen.value = false
    editFromApply.value = false
    selection.value = null
    baseline.value = null
    anchor.value = null
    if (endsApplyEdit && undo.value) restartUndoTimer()
  }

  const closeAll = ({ focus = true }: { focus?: boolean } = {}) => {
    endEdit()
    if (focus) focusCursor()
  }

  // A popup stays on the screen: it moves up when its bottom would pass the screen edge
  const fitPopup = (el: HTMLElement | null | undefined) => {
    if (!el) return

    const height = el.getBoundingClientRect().height
    barPos.value = { ...barPos.value, y: menuTop(barPos.value.y, height, window.innerHeight) }
  }

  /** Change, Edit and Delete act on the block as it is in the week: unsaved edge moves are dropped first */
  const toBlock = () => {
    if (baseline.value) selection.value = { ...baseline.value }
  }

  /** Undo leaves an open box first, then restores the week from before the change */
  const undoLast = () => undoChange(() => {
    if (selection.value) closeAll()
  })

  const pickFromBar = () => {
    toBlock()
    barOpen.value = false
    menuOpen.value = true
    onOpen()
    nextTick(() => {
      fitPopup(menuRef.value?.el)
      menuRef.value?.el?.querySelector<HTMLButtonElement>('button')?.focus()
    })
  }

  const applyActivity = (activityId: string) => {
    const range = selection.value
    const template = activeTemplate.value
    if (!range || !template) return

    const name = activityMap.value.get(activityId)?.name ?? 'Activity'
    // Applying the activity that already fills the whole run changes nothing: the bar closes as it always did
    const changes = appliesChange(range, slots.value, activityId)
    // Hidden sleep in the run is replaced, and the result says so (FR-SLEEP-5)
    const replacedSleep = sleepHidden.value ? sleepHoursIn(range, slots.value, sleepId.value) : 0
    commit(applyLabel(name, range, replacedSleep), template.id, () => {
      paintCells(template.id, cellsOf(range), activityId)
    })

    if (!changes) {
      closeAll()
      return
    }

    // The new block is edited at once: its box shows the edge handles, Save and Cancel. Its undo step waits for the edit:
    // Save extends it, Cancel and Escape keep the block as applied
    stopUndoTimer()
    menuOpen.value = false
    baseline.value = { ...range }
    editFromApply.value = true
    barOpen.value = true
    onOpen()
    nextTick(() => {
      fitPopup(barRef.value?.el)
      gridEl.value?.querySelector<HTMLElement>('.wk-handle.is-top')?.focus()
    })
  }

  const clearRange = (range: Range) => {
    const template = activeTemplate.value
    if (!template) return

    // A change made outside the box (clear day, a block's delete) ends the box first
    if (selection.value) closeAll({ focus: false })

    commit(`Cleared ${rangeLabel(range)}`, template.id, () => {
      paintCells(template.id, clearableCells(range, slots.value, sleepId.value, showSleep.value), null)
    })
  }

  // Delete takes out the block as it is in the week; unsaved edge moves are dropped
  const clearSelection = () => {
    const range = baseline.value ?? selection.value
    if (range) clearRange(range)
    closeAll()
  }

  const clearDay = (day: number) => clearRange({ day, start: 0, end: 24 })

  // Edit opens the entry's form (ActivityForm) through the URL, as Goals and the Week's entry buttons do; the box closes first
  const editActivity = () => {
    const range = baseline.value
    const activityId = range ? firstActivity(range) : null
    if (!activityId) return

    closeAll({ focus: false })
    setSelection({ item: activityId, edit: true })
  }

  // Cancel with a moved edge puts it back and keeps the box; a clean one closes the box (an Apply's block stays as applied)
  const cancelEdit = () => {
    if (cancelAction(moved.value) === 'revert') {
      selection.value = baseline.value ? { ...baseline.value } : null
      return
    }

    closeAll()
  }

  // Save writes the moved block: the run it was made on is cleared, and the new run takes the activity that held the old one
  const saveEdit = () => {
    const from = baseline.value
    const range = selection.value
    const template = activeTemplate.value
    const activityId = from ? firstActivity(from) : null
    if (!from || !range || !template || !activityId) return

    const action = saveAction(moved.value, editFromApply.value && !!undo.value)
    const move = () => {
      paintCells(template.id, clearableCells(from, slots.value, sleepId.value, showSleep.value), null)
      paintCells(template.id, cellsOf(range), activityId)
    }

    if (action === 'extend' && undo.value) {
      // The Apply's step still restores the week from before the Apply, so a move extends that step instead of adding one
      move()
      undo.value = { ...undo.value, text: `Moved to ${rangeLabel(range)}.` }
    } else if (action === 'commit') {
      commit(`Moved to ${rangeLabel(range)}`, template.id, move)
    }

    closeAll()
  }

  // ── Edge handles: a drag (pointer), and Up and Down with a focused handle (FR-PLAN-19) ──

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

    const range = selection.value
    const band = bandOf(collapsed.value, range.start)
    const y = event.clientY - resizeDay.getBoundingClientRect().top
    selection.value = setEdge(range, resizeSide, edgeHourAt(resizeSide, y, range, band, hourTop.value), band)
  }

  const endResize = () => {
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', endResize)
    window.removeEventListener('pointercancel', endResize)
    resizeDay = null
    resizeSide = null
  }

  const onHandleKey = (side: 'top' | 'bottom', event: KeyboardEvent) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

    event.preventDefault()
    const range = selection.value
    if (!range) return

    selection.value = setEdge(range, side, (side === 'top' ? range.start : range.end) + (event.key === 'ArrowUp' ? -1 : 1), bandOf(collapsed.value, range.start))
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
    focusBottomHandle()
  }

  const onWindowKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    if (selection.value || barOpen.value || menuOpen.value) closeAll()
  }

  // A click outside the grid and its box ends the selection. The press that began inside (a drag from a handle, released outside) is not one
  const insideEditor = (target: EventTarget | null) => target instanceof Element && !!target.closest('.wk-body, .wk-pop, .wk-handle')
  const onWindowPointerDown = (event: PointerEvent) => {
    pressInside = insideEditor(event.target)
  }
  const onWindowClick = (event: MouseEvent) => {
    const startedInside = pressInside
    pressInside = false
    if (!selection.value && !barOpen.value && !menuOpen.value) return
    if (startedInside || insideEditor(event.target)) return

    closeAll({ focus: false })
  }

  onMounted(() => {
    window.addEventListener('pointerdown', onWindowPointerDown)
    window.addEventListener('keydown', onWindowKeydown)
    window.addEventListener('click', onWindowClick)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointerdown', onWindowPointerDown)
    window.removeEventListener('keydown', onWindowKeydown)
    window.removeEventListener('click', onWindowClick)
    window.removeEventListener('pointermove', onResizeMove)
  })

  return {
    barRef,
    menuRef,
    barOpen,
    menuOpen,
    barPos,
    editing,
    handles,
    moved,
    selectionHasActivity,
    undo,
    dismissUndo,
    undoLast,
    focusCursor,
    placeAt,
    endEdit,
    closeAll,
    pickFromBar,
    applyActivity,
    clearRange,
    clearSelection,
    clearDay,
    editActivity,
    cancelEdit,
    saveEdit,
    startResize,
    onHandleKey,
    onHandleTab,
    onBarKey,
  }
}
