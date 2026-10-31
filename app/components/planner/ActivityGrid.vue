<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { inkOn } from '~/utils/palette'
import {
  DAYS,
  aggregateTemplate,
  formatHour,
  isHourlyTemplate,
  slotsToBlocks,
  type TimeBlock
} from '~/utils/planner'
import { clockLabel, isSleepActivity, sleepActivityId } from '~/utils/sleep'

/** Height of one hour row in px, as in the original week grid */
const HOUR_PX = 28
/** Height of the thin band that stands for a run of collapsed hours between two shown rows (FR-SLEEP-5) */
const GAP_PX = 14
/** A touch that moves further than this (px) is a scroll, not a tap */
const TOUCH_SLOP = 8
/** The undo line stays this long (ms) */
const UNDO_MS = 8000
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** A run of hours in one day column; end is exclusive */
interface Range { day: number; start: number; end: number }
interface Cell { day: number; hour: number }
interface Press { pointerId: number; pointerType: string; x: number; y: number; cell: Cell; block: Range | null; dragging: boolean }
interface Undo { text: string; templateId: string; slots: string[] }

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)

// Sleep (FR-SLEEP-3 to 5): while hidden it reads as empty, is not counted, and its rows collapse. The real slots stay the undo's source
const { showSleep, setShowSleep } = useShowSleep()
const sleepId = computed(() => sleepActivityId(planner.$state))
const sleepHidden = computed(() => !!sleepId.value && !showSleep.value)
const slots = computed(() => activeTemplate.value?.slots ?? [])
const shownSlots = computed(() => (sleepHidden.value ? slots.value.map(holder => (holder === sleepId.value ? '' : holder)) : slots.value))
const hourly = computed(() => isHourlyTemplate(activeTemplate.value))
const templateName = computed(() => activeTemplate.value?.name ?? 'no week type')
const plannedHours = computed(() => shownSlots.value.filter(Boolean).length)
const metaText = computed(() => (sleepHidden.value ? `${plannedHours.value} h planned, sleep hidden` : `${plannedHours.value} of 168 h planned`))
const hoursPerDay = computed(() => DAYS.map((_, day) => shownSlots.value.slice(day * 24, day * 24 + 24).filter(Boolean).length))
const blocksByDay = computed(() => DAYS.map((_, day) => slotsToBlocks(shownSlots.value, day)))
const menuActivities = computed(() => planner.activities.filter(activity => showSleep.value || !isSleepActivity(activity)))
const activityMap = computed(() => new Map(planner.activities.map(activity => [activity.id, activity])))
const activityHours = computed(() => (activeTemplate.value ? aggregateTemplate(activeTemplate.value, planner.activities) : new Map<string, number>()))
const hoursText = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1))

/**
 * Hours that are sleep on all seven days while sleep is hidden: their rows collapse, so the grid is shorter (FR-SLEEP-5).
 * Never all 24: with nothing shown there would be no grid to edit
 */
const collapsed = computed<boolean[]>(() => {
  const none = HOURS.map(() => false)
  if (!sleepHidden.value) return none

  const hidden = HOURS.map(hour => DAYS.every((_, day) => slots.value[day * 24 + hour] === sleepId.value))
  return hidden.every(Boolean) ? none : hidden
})
const isCollapsed = (hour: number) => collapsed.value[hour] === true
const shownHours = computed(() => HOURS.filter(hour => !isCollapsed(hour)))
const firstShown = computed(() => shownHours.value[0] ?? 0)
const lastShown = computed(() => shownHours.value[shownHours.value.length - 1] ?? 23)

/** The rows of the grid in order: each shown hour, and one thin band for each run of collapsed hours between shown ones. The leading and trailing runs sit in the bands above and below */
type FlowRow = { kind: 'hour'; hour: number } | { kind: 'gap'; from: number; to: number }
const flow = computed<FlowRow[]>(() => {
  const rows: FlowRow[] = []

  for (const hour of HOURS) {
    if (!isCollapsed(hour)) {
      rows.push({ kind: 'hour', hour })
      continue
    }

    const last = rows[rows.length - 1]
    if (!last) continue

    if (last.kind === 'gap') last.to = hour + 1
    else rows.push({ kind: 'gap', from: hour, to: hour + 1 })
  }

  if (rows[rows.length - 1]?.kind === 'gap') rows.pop()
  return rows
})

/** Top of each shown hour inside the day columns, in px; collapsed hours have none */
const hourTop = computed<number[]>(() => {
  const tops: number[] = []
  let y = 0

  for (const row of flow.value) {
    if (row.kind === 'hour') {
      tops[row.hour] = y
      y += HOUR_PX
    } else {
      y += GAP_PX
    }
  }

  return tops
})

/** The run of shown hours that holds an hour: a selection, a drag and an edge never cross a collapsed run */
const bandOf = (hour: number) => {
  let start = hour
  while (start > 0 && !isCollapsed(start - 1)) start -= 1

  let end = hour + 1
  while (end < 24 && !isCollapsed(end)) end += 1

  return { start, end }
}

/** The shown hour at a y offset in the day columns; a gap maps to the hour above it; null above the first row */
const hourAtY = (y: number): number | null => {
  let found: number | null = null

  for (const hour of HOURS) {
    const top = hourTop.value[hour]
    if (top !== undefined && top <= y) found = hour
  }

  return found
}

/** The shown hour nearest to an hour (a collapsed hour moves to a shown neighbour) */
const nearestShown = (hour: number) => shownHours.value.reduce((best, item) => (Math.abs(item - hour) < Math.abs(best - hour) ? item : best), firstShown.value)

/** The next shown hour one step up or down, or the same hour at the grid's edge */
const stepHour = (hour: number, direction: -1 | 1): number => {
  let next = hour + direction
  while (next >= 0 && next < 24 && isCollapsed(next)) next += direction

  return next >= 0 && next < 24 ? next : hour
}

// The bands above and below the rows say which hours are collapsed; clicking one shows sleep
const topBand = computed(() => (firstShown.value > 0 ? `${clockLabel(0)} to ${clockLabel(firstShown.value)}` : ''))
const bottomBand = computed(() => (lastShown.value < 23 ? `${clockLabel(lastShown.value + 1)} to ${clockLabel(24)}` : ''))

/** The cells a clear takes out: while sleep is hidden its hours stay (sleep is edited in its own editor) */
const clearableCells = (range: Range) => cellsOf(range).filter(index => showSleep.value || slots.value[index] !== sleepId.value)

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
const undo = ref<Undo | null>(null)
// Keyboard: the focused hour, and the start of a Shift-arrow selection
const cursor = ref<Cell>({ day: 0, hour: 8 })
const anchor = ref<Cell | null>(null)
const gridEl = ref<HTMLElement | null>(null)
const barEl = ref<HTMLElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)

let press: Press | null = null
let undoTimer: ReturnType<typeof setTimeout> | undefined
let resizeDay: HTMLElement | null = null
let resizeSide: 'top' | 'bottom' | null = null

const cellsOf = (range: Range) => Array.from({ length: range.end - range.start }, (_, offset) => range.day * 24 + range.start + offset)
const rangeLabel = (range: Range) => `${DAYS[range.day]} ${formatHour(range.start)} – ${formatHour(range.end)}`
const selectionHasActivity = computed(() => !!selection.value && cellsOf(selection.value).some(index => shownSlots.value[index]))
const firstActivityIn = (range: Range) => cellsOf(range).map(index => shownSlots.value[index]).find(Boolean) ?? null
const blockAt = (cell: Cell): Range | null => {
  const block = blocksByDay.value[cell.day]?.find((item: TimeBlock) => cell.hour >= item.start && cell.hour < item.end)
  return block ? { day: cell.day, start: block.start, end: block.end } : null
}
const singleCell = (cell: Cell): Range => ({ day: cell.day, start: cell.hour, end: cell.hour + 1 })
const { fill } = usePlannerFill()
const blockColor = (block: TimeBlock) => fill(activityMap.value.get(block.activityId)?.color ?? '#999999')
/** A block prints the activity's short code (1 to 3 letters), so no name is cut off; the full name is in the block's title */
const blockCode = (block: TimeBlock) => activityMap.value.get(block.activityId)?.shortCode ?? ''
const isCursor = (day: number, hour: number) => cursor.value.day === day && cursor.value.hour === hour
const setCursor = (cell: Cell) => {
  cursor.value = { day: cell.day, hour: cell.hour }
}

// Undo: one step back for the last change; the line dismisses itself
const dismissUndo = () => {
  undo.value = null
  clearTimeout(undoTimer)
}

const restartUndoTimer = () => {
  clearTimeout(undoTimer)
  undoTimer = setTimeout(dismissUndo, UNDO_MS)
}

/** Runs a change to the active template as one undoable step. Nothing is recorded when no hour changed */
const commit = (text: string, change: () => void) => {
  const template = activeTemplate.value
  if (!template) return

  const before = [...template.slots]
  change()

  if (!template.slots.some((holder, index) => holder !== before[index])) return

  undo.value = { text: `${text}.`, templateId: template.id, slots: before }
  restartUndoTimer()
}

const undoLast = () => {
  const last = undo.value
  if (!last) return

  // Undo leaves an open edit first, then restores the week from before the change
  if (editing.value) closeAll()
  planner.restoreSlots(last.templateId, last.slots)
  dismissUndo()
}

const focusCursor = () => {
  nextTick(() => gridEl.value?.querySelector<HTMLElement>(`.wk-slot[data-day="${cursor.value.day}"][data-hour="${cursor.value.hour}"]`)?.focus())
}

// Popups open beside the release point, or at the bottom on phones
const placePopup = (x: number, y: number) => {
  const small = window.innerWidth <= 480
  barPos.value = small
    ? { x: 16, y: window.innerHeight - 160 }
    : { x: Math.min(x + 16, window.innerWidth - 276), y: Math.max(16, Math.min(y - 10, window.innerHeight - 200)) }
}

const openBar = () => {
  menuOpen.value = false
  barOpen.value = true
  nextTick(() => barEl.value?.querySelector<HTMLButtonElement>('button')?.focus())
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
  const menu = menuEl.value
  if (!menu) return

  const height = menu.getBoundingClientRect().height
  barPos.value = { ...barPos.value, y: Math.max(8, Math.min(barPos.value.y, window.innerHeight - height - 8)) }
}

const pickFromBar = () => {
  barOpen.value = false
  menuOpen.value = true
  nextTick(() => {
    fitMenu()
    menuEl.value?.querySelector<HTMLButtonElement>('button')?.focus()
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
  commit(`${name} set on ${rangeLabel(range)}${replacedSleep ? `. Replaced ${replacedSleep} h of Sleep` : ''}`, () => {
    planner.paintCells(template.id, cellsOf(range), activityId)
  })

  if (!changes) {
    closeAll()
    return
  }

  // The new block opens in edit mode at once, so its start and end change without selecting it again (FR-PLAN-23).
  // Its undo step waits for the edit: Save extends it, Cancel and Escape keep the block as applied
  clearTimeout(undoTimer)
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

  commit(`Cleared ${rangeLabel(range)}`, () => {
    planner.paintCells(template.id, clearableCells(range), null)
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
      planner.paintCells(template.id, clearableCells(snapshot), null)
      if (activityId) planner.paintCells(template.id, cellsOf(range), activityId)
    }

    if (editFromApply.value && undo.value) {
      // The Apply's step still restores the week from before the Apply, so a move extends that step instead of adding one
      if (moved) {
        move()
        undo.value = { ...undo.value, text: `Moved to ${rangeLabel(range)}.` }
      }
    } else {
      commit(`Moved to ${rangeLabel(range)}`, move)
    }
  }

  closeAll()
}

/** Moves one edge of the selection to an hour line (0 to 24); the run keeps at least one hour and stays in its shown run (FR-SLEEP-5) */
const setEdge = (side: 'top' | 'bottom', hour: number) => {
  const range = selection.value
  if (!range) return

  const band = bandOf(range.start)

  selection.value = side === 'top'
    ? { ...range, start: Math.max(band.start, Math.min(hour, range.end - 1)) }
    : { ...range, end: Math.min(band.end, Math.max(hour, range.start + 1)) }
}

/** The hour line of one edge nearest to a y offset in the day columns, among the lines its shown run allows */
const edgeHourAt = (side: 'top' | 'bottom', y: number, range: Range): number => {
  const band = bandOf(range.start)
  const lines = side === 'top'
    ? Array.from({ length: range.end - band.start }, (_, offset) => band.start + offset).map(hour => ({ hour, px: hourTop.value[hour] ?? 0 }))
    : Array.from({ length: band.end - range.start }, (_, offset) => range.start + 1 + offset).map(hour => ({ hour, px: (hourTop.value[hour - 1] ?? 0) + HOUR_PX }))

  let best = side === 'top' ? range.start : range.end
  let bestDistance = Infinity

  for (const line of lines) {
    const distance = Math.abs(y - line.px)
    if (distance < bestDistance) {
      bestDistance = distance
      best = line.hour
    }
  }

  return best
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

  const y = event.clientY - resizeDay.getBoundingClientRect().top
  setEdge(resizeSide, edgeHourAt(resizeSide, y, selection.value))
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

  setEdge(side, (side === 'top' ? range.start : range.end) + (event.key === 'ArrowUp' ? -1 : 1))
}

// Pointer: press on an hour, drag down the same day column, release to open the bar.
// A click or tap on a block selects the whole block; a tap on an empty hour selects that hour. Touch only taps, so the page still scrolls
const cellAt = (x: number, y: number): { cell: Cell; block: Range | null } | null => {
  const column = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.wk-day')
  if (!column) return null

  const rect = column.getBoundingClientRect()
  const hour = hourAtY(y - rect.top)
  if (hour === null) return null

  const cell = { day: Number(column.dataset.day), hour }
  return { cell, block: blockAt(cell) }
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
  const band = bandOf(press.cell.hour)
  const start = Math.max(band.start, Math.min(press.cell.hour, hit.cell.hour))
  const end = Math.min(band.end, Math.max(press.cell.hour, hit.cell.hour) + 1)

  if (!selection.value || selection.value.start !== start || selection.value.end !== end) {
    selection.value = { day: press.cell.day, start, end }
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
const stepFor = (key: string, cell: Cell): Cell | null => {
  switch (key) {
    case 'ArrowLeft': return { day: Math.max(0, cell.day - 1), hour: cell.hour }
    case 'ArrowRight': return { day: Math.min(6, cell.day + 1), hour: cell.hour }
    case 'ArrowUp': return { day: cell.day, hour: stepHour(cell.hour, -1) }
    case 'ArrowDown': return { day: cell.day, hour: stepHour(cell.hour, 1) }
    default: return null
  }
}

const onKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement
  if (!hourly.value || editing.value || !target.dataset.hour) return

  const step = stepFor(event.key, cursor.value)

  if (step) {
    event.preventDefault()
    const from = event.shiftKey ? (anchor.value ?? cursor.value) : null
    anchor.value = from ? { ...from } : null
    selection.value = from && from.day === step.day && bandOf(from.hour).start === bandOf(step.hour).start
      ? { day: step.day, start: Math.min(from.hour, step.hour), end: Math.max(from.hour, step.hour) + 1 }
      : null
    setCursor(step)
    focusCursor()
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selection.value = selection.value ?? blockAt(cursor.value) ?? singleCell(cursor.value)
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
  if (isCollapsed(cursor.value.hour)) setCursor({ day: cursor.value.day, hour: nearestShown(cursor.value.hour) })

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
  clearTimeout(undoTimer)
})
</script>

<template>
  <section class="section wk-section" aria-labelledby="week-title">
    <!-- Collapsible like the Year section (open by default, in memory only); the Show sleep button sits beside the summary, not in it -->
    <div class="wk-head-line">
      <details class="wk-details" :open="weekOpen" @toggle="weekOpen = ($event.currentTarget as HTMLDetailsElement).open">
        <summary class="section-summary wk-summary">
          <h2 id="week-title" class="section-title">Week</h2>
          <p class="wk-meta">{{ templateName }} · {{ metaText }}</p>
        </summary>

        <p v-if="!hourly" class="wk-helper">This week type has 30-minute slots, and this grid edits hourly week types only.</p>

        <template v-else>
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
              <button v-if="topBand" type="button" class="wk-band is-top" @click="setShowSleep(true)">
                <span>Sleep hidden: {{ topBand }}</span>
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

                <div v-for="(day, dayIndex) in DAYS" :key="day" class="wk-day" :data-day="dayIndex">
                  <!-- Slots: the interaction layer, one focus stop at a time; a collapsed run is a thin band between them -->
                  <template v-for="row in flow" :key="row.kind === 'hour' ? `h${row.hour}` : `g${row.from}`">
                    <div
                      v-if="row.kind === 'gap'"
                      class="wk-gap"
                      :title="`Sleep hidden: ${clockLabel(row.from)} to ${clockLabel(row.to)}`"
                    />
                    <div
                      v-else
                      class="wk-slot"
                      :class="{ 'is-major': row.hour % 3 === 0 }"
                      role="button"
                      :tabindex="isCursor(dayIndex, row.hour) ? 0 : -1"
                      :data-day="dayIndex"
                      :data-hour="row.hour"
                      :aria-label="`${DAY_NAMES[dayIndex]} ${formatHour(row.hour)}, ${shownSlots[dayIndex * 24 + row.hour] ? activityMap.get(shownSlots[dayIndex * 24 + row.hour]!)?.name : 'free'}`"
                      @focus="setCursor({ day: dayIndex, hour: row.hour })"
                    />
                  </template>

                  <!-- Blocks: the painted hours, drawn over the slots; hover shows the delete button -->
                  <div
                    v-for="block in blocksByDay[dayIndex]"
                    :key="`${block.start}-${block.activityId}`"
                    class="wk-block"
                    :class="{ 'is-short': block.end - block.start === 1 }"
                    :style="{
                      top: `${hourTop[block.start] ?? 0}px`,
                      height: `${(block.end - block.start) * HOUR_PX - 2}px`,
                      background: blockColor(block),
                      color: inkOn(blockColor(block)),
                    }"
                  >
                    <span class="wk-block-name" :title="activityMap.get(block.activityId)?.name">{{ blockCode(block) }}</span>
                    <span class="wk-block-time">{{ formatHour(block.start) }}–{{ formatHour(block.end) }}</span>
                    <button
                      type="button"
                      class="wk-block-del"
                      title="Clear these hours"
                      :aria-label="`Clear ${activityMap.get(block.activityId)?.name ?? 'hours'}, ${DAY_NAMES[dayIndex]} ${formatHour(block.start)} to ${formatHour(block.end)}`"
                      @click="clearRange({ day: dayIndex, start: block.start, end: block.end })"
                    >✕</button>
                  </div>

                  <!-- Selection: the highlighted run; in edit mode it carries the resize handles -->
                  <div
                    v-if="selection && selection.day === dayIndex"
                    class="wk-sel"
                    :style="{
                      top: `${hourTop[selection.start] ?? 0}px`,
                      height: `${(selection.end - selection.start) * HOUR_PX}px`,
                    }"
                  >
                    <template v-if="editing">
                      <button
                        type="button"
                        class="wk-handle is-top"
                        aria-label="Change start: drag, or Up and Down arrows"
                        @pointerdown="startResize('top', $event)"
                        @keydown="onHandleKey('top', $event)"
                      ><span /></button>
                      <button
                        type="button"
                        class="wk-handle is-bottom"
                        aria-label="Change end: drag, or Up and Down arrows"
                        @pointerdown="startResize('bottom', $event)"
                        @keydown="onHandleKey('bottom', $event)"
                      ><span /></button>
                    </template>
                    <span class="wk-dur">{{ selection.end - selection.start }}h</span>
                    <div v-if="editing" class="wk-confirm">
                      <button
                        type="button"
                        class="wk-round is-cancel"
                        title="Cancel change"
                        aria-label="Cancel change"
                        @click="cancelEdit"
                      >✕</button>
                      <button
                        type="button"
                        class="wk-round is-ok"
                        title="Save change"
                        aria-label="Save change"
                        @click="saveEdit"
                      >✓</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- The band below the rows: the trailing run of collapsed hours -->
          <button v-if="bottomBand" type="button" class="wk-band is-bottom" @click="setShowSleep(true)">
            <span>Sleep hidden: {{ bottomBand }}</span>
            <span class="wk-band-action">Show sleep</span>
          </button>

          <p v-if="undo" class="wk-undo" role="status">
            <span>{{ undo.text }}</span>
            <button type="button" class="btn btn-xs btn-outline" @click="undoLast">Undo</button>
          </p>
        </template>
      </details>

      <SleepToggle v-if="sleepId" />
    </div>

    <Teleport to="body">
      <!-- Closes on pointerdown, not click: the click that follows a tap would otherwise land on the overlay that the tap just opened -->
      <div v-if="barOpen || menuOpen" class="wk-overlay" @pointerdown="closeAll" @contextmenu.prevent="closeAll" />

      <div
        v-if="barOpen && selection"
        ref="barEl"
        class="wk-pop wk-bar"
        role="group"
        :aria-label="`Selected ${rangeLabel(selection)}`"
        :style="{ left: `${barPos.x}px`, top: `${barPos.y}px` }"
        @click.stop
      >
        <div class="wk-pop-head">
          <span class="wk-pop-day">{{ DAYS[selection.day] }}</span>
          <span class="wk-pop-range">{{ formatHour(selection.start) }} – {{ formatHour(selection.end) }}</span>
          <span class="wk-pop-dur">{{ selection.end - selection.start }}h</span>
        </div>
        <div class="wk-pop-actions">
          <button type="button" class="btn btn-sm btn-primary" @click="pickFromBar">
            {{ selectionHasActivity ? 'Change…' : 'Apply…' }}
          </button>
          <EditButton label="Edit range" :disabled="!selectionHasActivity" @click="startEdit" />
          <button v-if="selectionHasActivity" type="button" class="btn btn-sm btn-danger" @click="clearSelection">Delete</button>
          <button type="button" class="btn btn-sm btn-ghost" @click="closeAll">Cancel</button>
        </div>
      </div>

      <div
        v-if="menuOpen && selection"
        ref="menuEl"
        class="wk-pop wk-menu"
        role="group"
        :aria-label="`Activities for ${rangeLabel(selection)}`"
        :style="{ left: `${barPos.x}px`, top: `${barPos.y}px` }"
        @click.stop
      >
        <div class="wk-pop-head">
          <span class="wk-pop-day">{{ DAYS[selection.day] }}</span>
          <span class="wk-pop-range">{{ formatHour(selection.start) }} – {{ formatHour(selection.end) }}</span>
          <span class="wk-pop-dur">{{ selection.end - selection.start }}h</span>
        </div>
        <div class="wk-menu-list">
          <button
            v-for="activity in menuActivities"
            :key="activity.id"
            type="button"
            class="wk-menu-item"
            @click="applyActivity(activity.id)"
          >
            <span class="dot" :style="{ background: activity.color }" />
            <span class="wk-menu-name">{{ activity.name }}</span>
            <span class="wk-menu-hrs">{{ hoursText(activityHours.get(activity.id) ?? 0) }}h</span>
          </button>
          <p v-if="!planner.activities.length" class="wk-menu-empty">No activities yet. Add one below the week.</p>
          <div class="wk-menu-divider" />
          <button type="button" class="wk-menu-item is-clear" @click="clearSelection">
            <span class="dot wk-dot-clear" />
            <span class="wk-menu-name">Clear these hours</span>
          </button>
        </div>
      </div>
    </Teleport>
  </section>
</template>
