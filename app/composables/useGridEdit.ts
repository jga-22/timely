import type { ComputedRef, Ref } from 'vue'
import type { GridEdge } from '~/composables/useGridEdge'
import type { GridPopups } from '~/composables/useGridPopups'
import { useGridUndo } from '~/composables/useGridUndo'
import { useNav } from '~/composables/useNav'
import { type Cell, type Range, appliesChange, applyLabel, cancelAction, cellsOf, clearableCells, firstActivityIn, isInEditor, rangeLabel, saveAction, sleepHoursIn } from '~/utils/weekGrid'

/** The grid's state, owned by the grid and passed in as refs; `paintCells` is the store's paint. `popups` and `edge` are the box and the handles */
export interface GridEditOptions {
  selection: Ref<Range | null>
  baseline: Ref<Range | null>
  anchor: Ref<Cell | null>
  activeTemplate: Ref<{ id: string } | undefined>
  slots: ComputedRef<string[]>
  shownSlots: ComputedRef<string[]>
  sleepId: ComputedRef<string | null>
  sleepHidden: ComputedRef<boolean>
  showSleep: Ref<boolean>
  activityMap: ComputedRef<Map<string, { name: string }>>
  paintCells: (templateId: string, cells: number[], activityId: string | null) => void
  popups: GridPopups
  edge: GridEdge
}

/**
 * The edit of a selected run (FR-PLAN-23, FR-ITEM-3, FR-SLEEP-5): Apply, Change, Edit, Delete, Save and Cancel, one undo step per change,
 * and the window's Escape and click outside, which end the edit. The box, the menu and the handles are in useGridPopups.ts and
 * useGridEdge.ts; the pure rules are in utils/weekGrid.ts. The returned names are the grid's (the popups' and the edge's included)
 */
export const useGridEdit = (options: GridEditOptions) => {
  const { selection, baseline, anchor, activeTemplate, slots, shownSlots, sleepId, sleepHidden, showSleep, activityMap, paintCells, popups, edge } = options
  const { undo, dismissUndo, restartUndoTimer, stopUndoTimer, commit, undoLast: undoChange } = useGridUndo()
  const { setSelection } = useNav()

  // True while the edit that Apply opened is open: its undo step is the Apply's, and Save extends that step
  const editFromApply = ref(false)
  // Whether the press that starts a click was inside the editor (the grid, its box or its handles)
  let pressInside = false

  const firstActivity = (range: Range) => firstActivityIn(range, shownSlots.value)

  /** Ends the selection and any box or menu. An Apply's undo step, which waited for its edit, resumes its timer */
  const endEdit = () => {
    const endsApplyEdit = editFromApply.value
    popups.closeBoxes()
    editFromApply.value = false
    selection.value = null
    baseline.value = null
    anchor.value = null
    if (endsApplyEdit && undo.value) restartUndoTimer()
  }

  const closeAll = ({ focus = true }: { focus?: boolean } = {}) => {
    endEdit()
    if (focus) popups.focusCursor()
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
    popups.openMenu()
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
    baseline.value = { ...range }
    editFromApply.value = true
    popups.openBar(() => {
      popups.fitBar()
      edge.focusHandle('top')
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
    if (cancelAction(edge.moved.value) === 'revert') {
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

    const action = saveAction(edge.moved.value, editFromApply.value && !!undo.value)
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

  // ── Window: Escape ends the edit; a click outside the grid and its box ends the selection ──

  const onWindowKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    if (selection.value || popups.barOpen.value || popups.menuOpen.value) closeAll()
  }

  // The press that began inside (a drag from a handle, released outside) is not a click outside
  const onWindowPointerDown = (event: PointerEvent) => {
    pressInside = isInEditor(event.target)
  }
  const onWindowClick = (event: MouseEvent) => {
    const startedInside = pressInside
    pressInside = false
    if (!selection.value && !popups.barOpen.value && !popups.menuOpen.value) return
    if (startedInside || isInEditor(event.target)) return

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
  })

  return {
    ...popups,
    ...edge,
    undo, dismissUndo, undoLast, endEdit, closeAll, pickFromBar, applyActivity, clearRange, clearSelection, clearDay, editActivity, cancelEdit, saveEdit,
  }
}
