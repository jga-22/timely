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

/** Height of one hour row in px, as in the original week grid */
const HOUR_PX = 28
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

const slots = computed(() => activeTemplate.value?.slots ?? [])
const hourly = computed(() => isHourlyTemplate(activeTemplate.value))
const templateName = computed(() => activeTemplate.value?.name ?? 'no template')
const plannedHours = computed(() => slots.value.filter(Boolean).length)
const hoursPerDay = computed(() => DAYS.map((_, day) => slots.value.slice(day * 24, day * 24 + 24).filter(Boolean).length))
const blocksByDay = computed(() => DAYS.map((_, day) => slotsToBlocks(slots.value, day)))
const activityMap = computed(() => new Map(planner.activities.map(activity => [activity.id, activity])))
const activityHours = computed(() => (activeTemplate.value ? aggregateTemplate(activeTemplate.value, planner.activities) : new Map<string, number>()))
const hoursText = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1))

// Selection: one run of hours in one day column, set by drag, click, tap or the keyboard
const selection = ref<Range | null>(null)
const barOpen = ref(false)
const barPos = ref({ x: 0, y: 0 })
const menuOpen = ref(false)
// Edit mode resizes the selection with its handles; Save applies the new range, Cancel restores the old one
const editing = ref(false)
const editSnapshot = ref<Range | null>(null)
const editActivityId = ref<string | null>(null)
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
const selectionHasActivity = computed(() => !!selection.value && cellsOf(selection.value).some(index => slots.value[index]))
const firstActivityIn = (range: Range) => cellsOf(range).map(index => slots.value[index]).find(Boolean) ?? null
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

/** Runs a change to the active template as one undoable step. Nothing is recorded when no hour changed */
const commit = (text: string, change: () => void) => {
  const template = activeTemplate.value
  if (!template) return

  const before = [...template.slots]
  change()

  if (!template.slots.some((holder, index) => holder !== before[index])) return

  undo.value = { text: `${text}.`, templateId: template.id, slots: before }
  clearTimeout(undoTimer)
  undoTimer = setTimeout(dismissUndo, UNDO_MS)
}

const undoLast = () => {
  const last = undo.value
  if (!last) return

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
  barOpen.value = false
  menuOpen.value = false
  editing.value = false
  editSnapshot.value = null
  editActivityId.value = null
  selection.value = null
  anchor.value = null
  focusCursor()
}

const pickFromBar = () => {
  barOpen.value = false
  menuOpen.value = true
  nextTick(() => menuEl.value?.querySelector<HTMLButtonElement>('button')?.focus())
}

const applyActivity = (activityId: string) => {
  const range = selection.value
  const template = activeTemplate.value
  if (!range || !template) return

  const name = activityMap.value.get(activityId)?.name ?? 'Activity'
  commit(`${name} set on ${rangeLabel(range)}`, () => {
    planner.paintCells(template.id, cellsOf(range), activityId)
  })
  closeAll()
}

const clearRange = (range: Range) => {
  const template = activeTemplate.value
  if (!template) return

  commit(`Cleared ${rangeLabel(range)}`, () => {
    planner.paintCells(template.id, cellsOf(range), null)
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
    commit(`Moved to ${rangeLabel(range)}`, () => {
      planner.paintCells(template.id, cellsOf(snapshot), null)
      if (activityId) planner.paintCells(template.id, cellsOf(range), activityId)
    })
  }

  closeAll()
}

const startResize = (side: 'top' | 'bottom', event: PointerEvent) => {
  event.stopPropagation()
  event.preventDefault()
  resizeSide = side
  resizeDay = (event.currentTarget as HTMLElement).closest<HTMLElement>('.wk-day')
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', endResize, { once: true })
}

const onResizeMove = (event: PointerEvent) => {
  const range = selection.value
  if (!resizeDay || !resizeSide || !range) return

  const hour = Math.max(0, Math.min(24, Math.round((event.clientY - resizeDay.getBoundingClientRect().top) / HOUR_PX)))

  selection.value = resizeSide === 'top'
    ? { ...range, start: Math.max(0, Math.min(hour, range.end - 1)) }
    : { ...range, end: Math.min(24, Math.max(hour, range.start + 1)) }
}

const endResize = () => {
  window.removeEventListener('pointermove', onResizeMove)
  resizeDay = null
  resizeSide = null
}

// Pointer: press on an hour, drag down the same day column, release to open the bar.
// A click or tap on a block selects the whole block; a tap on an empty hour selects that hour. Touch only taps, so the page still scrolls
const cellAt = (x: number, y: number): { cell: Cell; block: Range | null } | null => {
  const column = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.wk-day')
  if (!column) return null

  const rect = column.getBoundingClientRect()
  const cell = { day: Number(column.dataset.day), hour: Math.min(23, Math.max(0, Math.floor((y - rect.top) / HOUR_PX))) }
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

  const start = Math.min(press.cell.hour, hit.cell.hour)
  const end = Math.max(press.cell.hour, hit.cell.hour) + 1

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
    case 'ArrowUp': return { day: cell.day, hour: Math.max(0, cell.hour - 1) }
    case 'ArrowDown': return { day: cell.day, hour: Math.min(23, cell.hour + 1) }
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
    selection.value = from && from.day === step.day
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
    <div class="wk-head-line">
      <h2 id="week-title" class="section-title">Week</h2>
      <p class="wk-meta">{{ templateName }} · {{ plannedHours }} of 168 h planned</p>
    </div>

    <p v-if="!hourly" class="wk-helper">This template has 30-minute slots, and this grid edits hourly templates only.</p>

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

          <div
            ref="gridEl"
            class="wk-body"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @keydown="onKeydown"
          >
            <div class="wk-hours" aria-hidden="true">
              <div v-for="hour in HOURS" :key="hour" class="wk-hour" :class="{ 'is-major': hour % 3 === 0 }">{{ hour % 3 === 0 ? formatHour(hour) : '' }}</div>
            </div>

            <div v-for="(day, dayIndex) in DAYS" :key="day" class="wk-day" :data-day="dayIndex">
              <!-- Slots: the interaction layer, one focus stop at a time -->
              <div
                v-for="hour in HOURS"
                :key="hour"
                class="wk-slot"
                :class="{ 'is-major': hour % 3 === 0 }"
                role="button"
                :tabindex="isCursor(dayIndex, hour) ? 0 : -1"
                :data-day="dayIndex"
                :data-hour="hour"
                :aria-label="`${DAY_NAMES[dayIndex]} ${formatHour(hour)}, ${slots[dayIndex * 24 + hour] ? activityMap.get(slots[dayIndex * 24 + hour]!)?.name : 'free'}`"
                @focus="setCursor({ day: dayIndex, hour })"
              />

              <!-- Blocks: the painted hours, drawn over the slots; hover shows the delete button -->
              <div
                v-for="block in blocksByDay[dayIndex]"
                :key="`${block.start}-${block.activityId}`"
                class="wk-block"
                :class="{ 'is-short': block.end - block.start === 1 }"
                :style="{
                  top: `${block.start * HOUR_PX}px`,
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
                  top: `${selection.start * HOUR_PX}px`,
                  height: `${(selection.end - selection.start) * HOUR_PX}px`,
                }"
              >
                <template v-if="editing">
                  <button
                    type="button"
                    class="wk-handle is-top"
                    aria-label="Drag to change start"
                    @pointerdown="startResize('top', $event)"
                  ><span /></button>
                  <button
                    type="button"
                    class="wk-handle is-bottom"
                    aria-label="Drag to change end"
                    @pointerdown="startResize('bottom', $event)"
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

      <p v-if="undo" class="wk-undo" role="status">
        <span>{{ undo.text }}</span>
        <button type="button" class="btn btn-xs btn-outline" @click="undoLast">Undo</button>
      </p>
    </template>

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
            v-for="activity in planner.activities"
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
