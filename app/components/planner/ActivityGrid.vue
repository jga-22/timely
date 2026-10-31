<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { useGridUndo } from '~/composables/useGridUndo'
import { DAYS, aggregateTemplate, formatHour, isHourlyTemplate, slotsToBlocks } from '~/utils/planner'
import { isSleepActivity, sleepActivityId } from '~/utils/sleep'
import { GAP_PX, HOUR_PX, HOURS, type Cell, type Range, bandOf, blockAt, cancelAction, cellsOf, clearableCells, collapsedBandLabels, collapsedHours, dragRange, edgeHourAt, flowRows, hourAtY, hourTops, isMoved, keyRange, menuTop, nearestShown, popupAt, rangeLabel, saveAction, setEdge, singleCell, stepFor, withoutSleep } from '~/utils/weekGrid'

/** A touch that moves further than this (px) is a scroll, not a tap */
const TOUCH_SLOP = 8
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Press { pointerId: number; pointerType: string; x: number; y: number; cell: Cell; block: Range | null; dragging: boolean }

/**
 * closeToken: the parent bumps it when another editor opens (the entry form), so a box or menu open here closes (PRD 11.2).
 * open: a box or menu opened here, so the parent closes its own editors (the week type panel and the entry form)
 */
const props = defineProps<{ closeToken?: number }>()
const emit = defineEmits<{ open: [] }>()

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)
const { setSelection } = useNav()

// Sleep (FR-SLEEP-3 to 5): while hidden it reads as empty, is not counted, and its rows collapse. The real slots stay the undo's source
const { showSleep, setShowSleep } = useShowSleep()
const sleepId = computed(() => sleepActivityId(planner.$state))
const sleepHidden = computed(() => !!sleepId.value && !showSleep.value)
const slots = computed(() => activeTemplate.value?.slots ?? [])
const shownSlots = computed(() => (sleepHidden.value ? withoutSleep(slots.value, sleepId.value) : slots.value))
const hourly = computed(() => isHourlyTemplate(activeTemplate.value))
const templateName = computed(() => activeTemplate.value?.name ?? 'no week type')
const plannedHours = computed(() => shownSlots.value.filter(Boolean).length)
const metaText = computed(() => (sleepHidden.value ? `${plannedHours.value} h planned, sleep hidden` : `${plannedHours.value} of 168 h planned`))
const hoursPerDay = computed(() => DAYS.map((_, day) => shownSlots.value.slice(day * 24, day * 24 + 24).filter(Boolean).length))
const blocksByDay = computed(() => DAYS.map((_, day) => slotsToBlocks(shownSlots.value, day)))
const menuActivities = computed(() => planner.activities.filter(activity => showSleep.value || !isSleepActivity(activity)))
const activityMap = computed(() => new Map(planner.activities.map(activity => [activity.id, activity])))
const activityHours = computed(() => (activeTemplate.value ? aggregateTemplate(activeTemplate.value, planner.activities) : new Map<string, number>()))

/**
 * Hours that are sleep on all seven days while sleep is hidden: their rows collapse, so the grid is shorter (FR-SLEEP-5).
 * The rules are in utils/weekGrid.ts; the component reads the store and lays the rows out
 */
const collapsed = computed(() => collapsedHours(slots.value, sleepHidden.value ? sleepId.value : null))
const isCollapsed = (hour: number) => collapsed.value[hour] === true
const shownHours = computed(() => HOURS.filter(hour => !isCollapsed(hour)))
const firstShown = computed(() => shownHours.value[0] ?? 0)
const lastShown = computed(() => shownHours.value[shownHours.value.length - 1] ?? 23)

/** The rows of the grid: each shown hour, and one thin band for each run of collapsed hours between shown ones */
const flow = computed(() => flowRows(collapsed.value))
/** Top of each shown hour inside the day columns, in px */
const hourTop = computed<number[]>(() => hourTops(flow.value, HOUR_PX, GAP_PX))
const bandAt = (hour: number) => bandOf(collapsed.value, hour)
const hourAt = (y: number) => hourAtY(hourTop.value, y)
const nearestShownHour = (hour: number) => nearestShown(shownHours.value, hour)

// The bands above and below the rows say which hours are collapsed; clicking one shows sleep
const bands = computed(() => collapsedBandLabels(firstShown.value, lastShown.value))

// Selection: one run of hours in one day column, set by drag, click, tap or the keyboard. Its edge handles move it
const selection = ref<Range | null>(null)
// The run as it is in the week, as the selection was made (a release, a key or an Apply). Moving a handle changes the selection only: Save and Cancel compare with this
const baseline = ref<Range | null>(null)
const barOpen = ref(false)
const barPos = ref({ x: 0, y: 0 })
const menuOpen = ref(false)
// True while the edit that Apply opened is open: its undo step is the Apply's, and Save extends that step
const editFromApply = ref(false)
const { undo, dismissUndo, restartUndoTimer, stopUndoTimer, commit, undoLast: undoChange } = useGridUndo()
// Keyboard: the focused hour, and the start of a Shift-arrow selection
const cursor = ref<Cell>({ day: 0, hour: 8 })
const anchor = ref<Cell | null>(null)
const gridEl = ref<HTMLElement | null>(null)
const barRef = ref<{ el: HTMLElement | null } | null>(null)
const menuRef = ref<{ el: HTMLElement | null } | null>(null)

let press: Press | null = null
let resizeDay: HTMLElement | null = null
let resizeSide: 'top' | 'bottom' | null = null
// Whether the press that starts a click was inside the editor (the grid, its box or its handles)
let pressInside = false

const selectionHasActivity = computed(() => !!selection.value && cellsOf(selection.value).some(index => shownSlots.value[index]))
// The edge handles show on a selection that holds an activity, at once: a click or tap on a block, a keyboard run, an Apply (FR-PLAN-23).
// They hide under the menu. Save and Cancel are in the box
const handles = computed(() => !!selection.value && selectionHasActivity.value && !menuOpen.value)
const moved = computed(() => isMoved(baseline.value, selection.value))
const firstActivityIn = (range: Range) => cellsOf(range).map(index => shownSlots.value[index]).find(Boolean) ?? null
const blockOf = (cell: Cell) => blockAt(shownSlots.value, cell)
const setCursor = (cell: Cell) => {
  cursor.value = { day: cell.day, hour: cell.hour }
}

/** Undo leaves an open box first, then restores the week from before the change */
const undoLast = () => undoChange(() => {
  if (selection.value) closeAll()
})

const focusCursor = () => {
  nextTick(() => gridEl.value?.querySelector<HTMLElement>(`.wk-slot[data-day="${cursor.value.day}"][data-hour="${cursor.value.hour}"]`)?.focus())
}

const focusBox = () => barRef.value?.el?.querySelector<HTMLButtonElement>('button')?.focus()
const focusBottomHandle = () => gridEl.value?.querySelector<HTMLElement>('.wk-handle.is-bottom')?.focus()

// Popups open beside the release point, or at the bottom on phones
const placePopup = (x: number, y: number) => {
  barPos.value = popupAt(x, y, window.innerWidth, window.innerHeight)
}

const openBar = () => {
  menuOpen.value = false
  barOpen.value = true
  emit('open')
  nextTick(focusBox)
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

const pickFromBar = () => {
  toBlock()
  barOpen.value = false
  menuOpen.value = true
  emit('open')
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
  const changes = cellsOf(range).some(index => slots.value[index] !== activityId)
  // Hidden sleep in the run is replaced, and the result says so (FR-SLEEP-5)
  const replacedSleep = sleepHidden.value ? cellsOf(range).filter(index => slots.value[index] === sleepId.value).length : 0
  commit(`${name} set on ${rangeLabel(range)}${replacedSleep ? `. Replaced ${replacedSleep} h of Sleep` : ''}`, template.id, () => {
    planner.paintCells(template.id, cellsOf(range), activityId)
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
  emit('open')
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
    planner.paintCells(template.id, clearableCells(range, slots.value, sleepId.value, showSleep.value), null)
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
  const activityId = range ? firstActivityIn(range) : null
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
  const activityId = from ? firstActivityIn(from) : null
  if (!from || !range || !template || !activityId) return

  const action = saveAction(moved.value, editFromApply.value && !!undo.value)
  const move = () => {
    planner.paintCells(template.id, clearableCells(from, slots.value, sleepId.value, showSleep.value), null)
    planner.paintCells(template.id, cellsOf(range), activityId)
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
  const band = bandAt(range.start)
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

// A focused handle moves its edge one hour with Up and Down (FR-PLAN-19)
const onHandleKey = (side: 'top' | 'bottom', event: KeyboardEvent) => {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

  event.preventDefault()
  const range = selection.value
  if (!range) return

  selection.value = setEdge(range, side, (side === 'top' ? range.start : range.end) + (event.key === 'ArrowUp' ? -1 : 1), bandAt(range.start))
}

// Pointer: press on an hour, drag down the same day column, release to open the bar.
// A click or tap on a block selects the whole block; a tap on an empty hour selects that hour. Touch only taps, so the page still scrolls
const cellAt = (x: number, y: number): { cell: Cell; block: Range | null } | null => {
  const column = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.wk-day')
  if (!column) return null

  const rect = column.getBoundingClientRect()
  const hour = hourAt(y - rect.top)
  if (hour === null) return null

  const cell = { day: Number(column.dataset.day), hour }
  return { cell, block: blockOf(cell) }
}

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
    if (Math.abs(event.clientX - press.x) > TOUCH_SLOP || Math.abs(event.clientY - press.y) > TOUCH_SLOP) press = null
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

const placeAt = (x: number, y: number) => {
  placePopup(x, y)
  openBar()
}

const onPointerUp = (event: PointerEvent) => {
  const current = press
  press = null
  if (!current || current.pointerId !== event.pointerId) return

  if (current.pointerType === 'mouse' && current.dragging) {
    baseline.value = selection.value ? { ...selection.value } : null
    placeAt(event.clientX, event.clientY)
    return
  }

  // A click or tap selects its block, or its hour: this run is what the box opens on
  endEdit()
  selection.value = current.block ?? singleCell(current.cell)
  baseline.value = { ...selection.value }
  placeAt(event.clientX, event.clientY)
}

const onPointerCancel = () => {
  press = null
}

// Keyboard: arrows move the focused hour, Shift with arrows selects within one day, Enter or Space opens the bar
const onKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement

  // Tab from the bottom handle goes to the box: the box is teleported, so the order is set here
  if (target.classList.contains('wk-handle')) {
    if (event.key === 'Tab' && !event.shiftKey && target.classList.contains('is-bottom') && barOpen.value) {
      event.preventDefault()
      focusBox()
    }
    return
  }

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
    const rect = target.getBoundingClientRect()
    placeAt(rect.right, rect.top)
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

// Switching template closes any open popup and forgets the undo step (it belongs to the old template)
watch(() => activeTemplate.value?.id, () => {
  dismissUndo()
  if (selection.value || barOpen.value || menuOpen.value) closeAll()
})

// Rows collapse or come back with Show sleep: the cursor moves to a shown hour; a selection that now covers a collapsed hour is dropped.
// Showing sleep again restores every row and keeps the selection
watch(collapsed, () => {
  if (isCollapsed(cursor.value.hour)) setCursor({ day: cursor.value.day, hour: nearestShownHour(cursor.value.hour) })

  const range = selection.value
  if (range && HOURS.some(hour => hour >= range.start && hour < range.end && isCollapsed(hour))) closeAll()
})

// The week grid's disclosure (open by default, in memory only). Collapsing it hides the grid, so a bar or menu open on it closes;
// the selection and the cursor stay and show again when it opens
const weekOpen = ref(true)
watch(weekOpen, (open) => {
  if (!open && (selection.value || barOpen.value || menuOpen.value)) closeAll()
})

// Another editor opened (the entry form, through the parent): this box or menu closes without moving focus
watch(() => props.closeToken, () => {
  if (selection.value || barOpen.value || menuOpen.value) closeAll({ focus: false })
})

onMounted(() => {
  window.addEventListener('pointerdown', onWindowPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
  window.addEventListener('keydown', onWindowKeydown)
  window.addEventListener('click', onWindowClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onWindowPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
  window.removeEventListener('keydown', onWindowKeydown)
  window.removeEventListener('click', onWindowClick)
  window.removeEventListener('pointermove', onResizeMove)
})
</script>

<template>
  <section class="section wk-section" aria-labelledby="week-title">
    <!-- Collapsible like the Year section (open by default, in memory only); the Show sleep button is inside it, above the grid -->
    <div class="wk-head-line">
      <details class="wk-details" :open="weekOpen" @toggle="weekOpen = ($event.currentTarget as HTMLDetailsElement).open">
        <summary class="section-summary wk-summary">
          <h2 id="week-title" class="section-title">Week</h2>
          <p class="wk-meta">{{ templateName }} · {{ metaText }}</p>
        </summary>

        <p v-if="!hourly" class="wk-helper">This week type has 30-minute slots, and this grid edits hourly week types only.</p>

        <template v-else>
          <div v-if="sleepId" class="wk-tools">
            <SleepToggle />
          </div>

          <div class="wk-scroll">
            <div class="wk" :data-editing="handles ? 'true' : 'false'">
              <div class="wk-head">
                <div class="wk-corner" aria-hidden="true" />
                <div v-for="(day, index) in DAYS" :key="day" class="wk-day-head">
                  <span class="wk-day-name">{{ day }}</span>
                  <span class="wk-day-hours">{{ hoursPerDay[index] }} h</span>
                  <button
                    type="button"
                    class="wk-clear-day"
                    :title="`Clear ${DAY_NAMES[index]}`"
                    :aria-label="`Clear ${DAY_NAMES[index]}`"
                    @click="clearDay(index)"
                  >✕</button>
                </div>
              </div>

              <!-- The band above the rows: the leading run of collapsed hours (sleep hidden), clicking it shows sleep -->
              <button v-if="bands.top" type="button" class="wk-band is-top" @click="setShowSleep(true)">
                <span>Sleep hidden: {{ bands.top }}</span>
                <span class="wk-band-action">Show sleep</span>
              </button>

              <div
                ref="gridEl"
                class="wk-body"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @keydown="onKeydown"
              >
                <div class="wk-hours" aria-hidden="true">
                  <template v-for="row in flow" :key="row.kind === 'hour' ? `h${row.hour}` : `g${row.from}`">
                    <div v-if="row.kind === 'gap'" class="wk-gap" />
                    <div v-else class="wk-hour" :class="{ 'is-major': row.hour % 3 === 0 }">{{ row.hour % 3 === 0 ? formatHour(row.hour) : '' }}</div>
                  </template>
                </div>

                <PlannerWeekGridDay
                  v-for="(day, dayIndex) in DAYS"
                  :key="day"
                  :day="dayIndex"
                  :name="DAY_NAMES[dayIndex] ?? ''"
                  :flow="flow"
                  :tops="hourTop"
                  :shown-slots="shownSlots"
                  :activities="activityMap"
                  :blocks="blocksByDay[dayIndex] ?? []"
                  :cursor="cursor"
                  :selection="selection"
                  :handles="handles"
                  @focus-cell="setCursor"
                  @clear="clearRange"
                  @resize="startResize"
                  @handle-key="onHandleKey"
                />
              </div>
            </div>
          </div>

          <!-- The band below the rows: the trailing run of collapsed hours -->
          <button v-if="bands.bottom" type="button" class="wk-band is-bottom" @click="setShowSleep(true)">
            <span>Sleep hidden: {{ bands.bottom }}</span>
            <span class="wk-band-action">Show sleep</span>
          </button>

          <p v-if="undo" class="wk-undo" role="status">
            <span>{{ undo.text }}</span>
            <button type="button" class="btn btn-xs btn-outline" @click="undoLast">Undo</button>
          </p>
        </template>
      </details>
    </div>

    <Teleport to="body">
      <!-- Closes on pointerdown, not click: the click that follows a tap would otherwise land on the overlay that the tap just opened.
           With handles the grid stays live under the box, so a handle can be dragged -->
      <div v-if="menuOpen || (barOpen && !handles)" class="wk-overlay" @pointerdown="closeAll()" @contextmenu.prevent="closeAll()" />

      <PlannerWeekGridBar
        v-if="barOpen && selection"
        ref="barRef"
        :selection="selection"
        :pos="barPos"
        :has-activity="selectionHasActivity"
        :can-save="moved"
        @pick="pickFromBar"
        @edit="editActivity"
        @delete="clearSelection"
        @save="saveEdit"
        @cancel="cancelEdit"
        @keydown="onBarKey"
      />

      <PlannerWeekGridMenu
        v-if="menuOpen && selection"
        ref="menuRef"
        :selection="selection"
        :pos="barPos"
        :activities="menuActivities"
        :hours="activityHours"
        :has-any="planner.activities.length > 0"
        @apply="applyActivity"
        @clear="clearSelection"
      />
    </Teleport>
  </section>
</template>
