import type { ComputedRef, Ref } from 'vue'
import { type Cell, type Range, menuTop, popupBeside } from '~/utils/weekGrid'

/** The grid's state and layout, owned by the grid and passed in as refs. `onOpen` tells the parent a box or menu opened */
export interface GridPopupsOptions {
  selection: Ref<Range | null>
  cursor: Ref<Cell>
  gridEl: Ref<HTMLElement | null>
  hourTop: ComputedRef<number[]>
  onOpen: () => void
}

export type GridPopups = ReturnType<typeof useGridPopups>

/**
 * The box (the action bar) and the Apply menu of the week grid (FR-PLAN-23): whether each is open, where it sits, and what has focus.
 * They open beside the run's day column, so they never cover its handles; on phones at the bottom of the screen. The popups show and
 * place only; what happens in them (Change, Edit, Save, Apply) is in useGridEdit.ts
 */
export const useGridPopups = (options: GridPopupsOptions) => {
  const { selection, cursor, gridEl, hourTop, onOpen } = options

  const barRef = ref<{ el: HTMLElement | null } | null>(null)
  const menuRef = ref<{ el: HTMLElement | null } | null>(null)
  const barOpen = ref(false)
  const barPos = ref({ x: 0, y: 0 })
  const menuOpen = ref(false)

  const editing = computed(() => !!selection.value || barOpen.value || menuOpen.value)

  /** Focus returns to the grid's cursor cell */
  const focusCursor = () => {
    nextTick(() => gridEl.value?.querySelector<HTMLElement>(`.wk-slot[data-day="${cursor.value.day}"][data-hour="${cursor.value.hour}"]`)?.focus())
  }

  const focusBox = () => barRef.value?.el?.querySelector<HTMLButtonElement>('button')?.focus()

  const placeBar = () => {
    const range = selection.value
    const column = range ? gridEl.value?.querySelector<HTMLElement>(`.wk-day[data-day="${range.day}"]`) : null
    if (!range || !column) return

    const rect = column.getBoundingClientRect()
    barPos.value = popupBeside({ left: rect.left, right: rect.right }, rect.top + (hourTop.value[range.start] ?? 0), { width: window.innerWidth, height: window.innerHeight })
  }

  // A popup stays on the screen: it moves up when its bottom would pass the screen edge
  const fitPopup = (el: HTMLElement | null | undefined) => {
    if (!el) return

    const height = el.getBoundingClientRect().height
    barPos.value = { ...barPos.value, y: menuTop(barPos.value.y, height, window.innerHeight) }
  }

  const fitBar = () => fitPopup(barRef.value?.el)

  /** Opens the box on the selection: the place it goes, then the box itself */
  const placeAt = () => {
    placeBar()
    openBar()
  }

  /** Opens the box; `then` runs once it renders (by default the box's first button takes focus) */
  const openBar = (then: () => void = focusBox) => {
    menuOpen.value = false
    barOpen.value = true
    onOpen()
    nextTick(then)
  }

  /** Opens the Apply menu over the box's place; it fits the screen and its first button takes focus */
  const openMenu = () => {
    barOpen.value = false
    menuOpen.value = true
    onOpen()
    nextTick(() => {
      fitPopup(menuRef.value?.el)
      menuRef.value?.el?.querySelector<HTMLButtonElement>('button')?.focus()
    })
  }

  const closeBoxes = () => {
    barOpen.value = false
    menuOpen.value = false
  }

  return {
    barRef,
    menuRef,
    barOpen,
    menuOpen,
    barPos,
    editing,
    focusCursor,
    focusBox,
    fitBar,
    placeAt,
    openBar,
    openMenu,
    closeBoxes,
  }
}
