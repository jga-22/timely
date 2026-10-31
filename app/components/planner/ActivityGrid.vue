<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { useGridUndo } from '~/composables/useGridUndo'
import { DAYS, aggregateTemplate, formatHour, isHourlyTemplate, slotsToBlocks } from '~/utils/planner'
import { isSleepActivity, sleepActivityId } from '~/utils/sleep'
import { GAP_PX, HOUR_PX, HOURS, type Cell, type Range, bandOf, blockAt, cellsOf, clearableCells, collapsedBandLabels, collapsedHours, dragRange, edgeHourAt, flowRows, hourAtY, hourTops, keyRange, menuTop, nearestShown, popupAt, rangeLabel, setEdge, singleCell, stepFor, withoutSleep } from '~/utils/weekGrid'

/** A touch that moves further than this (px) is a scroll, not a tap */
const TOUCH_SLOP = 8
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Press { pointerId: number; pointerType: string; x: number; y: number; cell: Cell; block: Range | null; dragging: boolean }

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)

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

// Selection: one run of hours in one day column, set by drag, click, tap or the keyboard
const selection = ref<Range | null>(null)
const barOpen = ref(false)
const barPos = ref({ x: 0, y: 0 })
const menuOpen = ref(false)
// Edit mode resizes the selection with its handles; Save applies the new range, Cancel restores the old one
const editing = ref(false)
const editSnapshot = ref<Range | null>(null)
const editActivityId = ref<string | null>(null)
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

const selectionHasActivity = computed(() => !!selection.value && cellsOf(selection.value).some(index => shownSlots.value[index]))
const firstActivityIn = (range: Range) => cellsOf(range).map(index => shownSlots.value[index]).find(Boolean) ?? null
const blockOf = (cell: Cell) => blockAt(shownSlots.value, cell)
const setCursor = (cell: Cell) => {
  cursor.value = { day: cell.day, hour: cell.hour }
}

/** Undo leaves an open edit first, then restores the week from before the change */
const undoLast = () => undoChange(() => {
  if (editing.value) closeAll()
})

const focusCursor = () => {
  nextTick(() => gridEl.value?.querySelector<HTMLElement>(`.wk-slot[data-day="${cursor.value.day}"][data-hour="${cursor.value.hour}"]`)?.focus())
}

// Popups open beside the release point, or at the bottom on phones
const placePopup = (x: number, y: number) => {
  barPos.value = popupAt(x, y, window.innerWidth, window.innerHeight)
}

const openBar = () => {
  menuOpen.value = false
  barOpen.value = true
  nextTick(() => barRef.value?.el?.querySelector<HTMLButtonElement>('button')?.focus())
}

const closeAll = () => {
  const endsApplyEdit = editFromApply.value
  barOpen.value = false
  menuOpen.value = false
  editing.value = false
  editSnapshot.value = null
  editActivityId.value = null
  editFromApply.value = false
  selection.value = null
  anchor.value = null
  // The undo line of an Apply has waited for its edit; it now dismisses itself as usual
  if (endsApplyEdit && undo.value) restartUndoTimer()
  focusCursor()
}

// The menu stays on screen: it moves up when its bottom would pass the screen edge, and its list scrolls inside it
const fitMenu = () => {
  const menu = menuRef.value?.el
  if (!menu) return

  const height = menu.getBoundingClientRect().height
  barPos.value = { ...barPos.value, y: menuTop(barPos.value.y, height, window.innerHeight) }
}

const pickFromBar = () => {
  barOpen.value = false
  menuOpen.value = true
  nextTick(() => {
    fitMenu()
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

  // The new block opens in edit mode at once, so its start and end change without selecting it again (FR-PLAN-23).
  // Its undo step waits for the edit: Save extends it, Cancel and Escape keep the block as applied
  stopUndoTimer()
  barOpen.value = false
  menuOpen.value = false
  editSnapshot.value = { ...range }
  editActivityId.value = activityId
  editFromApply.value = true
  editing.value = true
  nextTick(() => gridEl.value?.querySelector<HTMLElement>('.wk-handle.is-top')?.focus())
}

const clearRange = (range: Range) => {
  const template = activeTemplate.value
  if (!template) return

  // A change made outside the edit (clear day, a block's delete) ends the edit first
  if (editing.value) closeAll()

  commit(`Cleared ${rangeLabel(range)}`, template.id, () => {
    planner.paintCells(template.id, clearableCells(range, slots.value, sleepId.value, showSleep.value), null)
  })
}

const clearSelection = () => {
  if (selection.value) clearRange(selection.value)
  closeAll()
}

const clearDay = (day: number) => clearRange({ day, start: 0, end: 24 })

// Edit: the selection gets handles; Save clears the old range and applies the activity to the new one
const startEdit = () => {
  const range = selection.value
  if (!range || !selectionHasActivity.value) return

  editSnapshot.value = { ...range }
  editActivityId.value = firstActivityIn(range)
  editing.value = true
  barOpen.value = false
  nextTick(() => gridEl.value?.querySelector<HTMLElement>('.wk-round.is-ok')?.focus())
}

const cancelEdit = () => {
  // The edit that Apply opened leaves the block as applied
  if (editFromApply.value) {
    closeAll()
    return
  }

  if (editSnapshot.value) selection.value = { ...editSnapshot.value }
  editing.value = false
  editSnapshot.value = null
  editActivityId.value = null
  openBar()
}

const saveEdit = () => {
  const snapshot = editSnapshot.value
  const range = selection.value
  const template = activeTemplate.value
  const activityId = editActivityId.value

  if (snapshot && range && template) {
    const moved = range.day !== snapshot.day || range.start !== snapshot.start || range.end !== snapshot.end
    const move = () => {
      planner.paintCells(template.id, clearableCells(snapshot, slots.value, sleepId.value, showSleep.value), null)
      if (activityId) planner.paintCells(template.id, cellsOf(range), activityId)
    }

    if (editFromApply.value && undo.value) {
      // The Apply's step still restores the week from before the Apply, so a move extends that step instead of adding one
      if (moved) {
        move()
        undo.value = { ...undo.value, text: `Moved to ${rangeLabel(range)}.` }
      }
    } else {
      commit(`Moved to ${rangeLabel(range)}`, template.id, move)
    }
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
  if (!hourly.value || editing.value || event.button !== 0) return

  // Buttons inside the grid (clear day, block delete) handle their own clicks
  if ((event.target as HTMLElement).closest('button')) return

  const hit = cellAt(event.clientX, event.clientY)
  if (!hit) return

  barOpen.value = false
  menuOpen.value = false
  anchor.value = null
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
    placeAt(event.clientX, event.clientY)
    return
  }

  selection.value = current.block ?? singleCell(current.cell)
  placeAt(event.clientX, event.clientY)
}

const onPointerCancel = () => {
  press = null
}

// Keyboard: arrows move the focused hour, Shift with arrows selects within one day, Enter or Space opens the bar
const onKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (!hourly.value || editing.value || !target.dataset.hour) return

  const step = stepFor(event.key, cursor.value, collapsed.value)

  if (step) {
    event.preventDefault()
    const from = event.shiftKey ? (anchor.value ?? cursor.value) : null
    anchor.value = from ? { ...from } : null
    selection.value = from ? keyRange(from, step, collapsed.value) : null
    setCursor(step)
    focusCursor()
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selection.value = selection.value ?? blockOf(cursor.value) ?? singleCell(cursor.value)
    const rect = target.getBoundingClientRect()
    placeAt(rect.right, rect.top)
  }
}

const onWindowKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  if (editing.value || barOpen.value || menuOpen.value || selection.value) closeAll()
}

// Switching template closes any open popup and forgets the undo step (it belongs to the old template)
watch(() => activeTemplate.value?.id, () => {
  dismissUndo()
  if (barOpen.value || menuOpen.value || editing.value) closeAll()
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
  if (!open && (barOpen.value || menuOpen.value || editing.value)) closeAll()
})

onMounted(() => {
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
  window.addEventListener('keydown', onWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
  window.removeEventListener('keydown', onWindowKeydown)
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
            <div class="wk" :data-editing="editing ? 'true' : 'false'">
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
                  :editing="editing"
                  @focus-cell="setCursor"
                  @clear="clearRange"
                  @resize="startResize"
                  @handle-key="onHandleKey"
                  @cancel="cancelEdit"
                  @save="saveEdit"
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
      <!-- Closes on pointerdown, not click: the click that follows a tap would otherwise land on the overlay that the tap just opened -->
      <div v-if="barOpen || menuOpen" class="wk-overlay" @pointerdown="closeAll" @contextmenu.prevent="closeAll" />

      <PlannerWeekGridBar
        v-if="barOpen && selection"
        ref="barRef"
        :selection="selection"
        :pos="barPos"
        :has-activity="selectionHasActivity"
        @pick="pickFromBar"
        @edit="startEdit"
        @delete="clearSelection"
        @cancel="closeAll"
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
