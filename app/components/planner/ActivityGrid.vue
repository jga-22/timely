<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import {
  DAYS,
  cellAtIndex,
  cellIndex,
  formatHour,
  isHourlyTemplate,
  paintModeFor,
  rectangleCells,
  type GridCell,
  type HourConflict
} from '~/utils/planner'
import type { Activity } from '~/types/planner'

/** Hour rows of the grid, 12AM to 11PM */
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const props = defineProps<{ activity: Activity | null; editing: boolean }>()
const emit = defineEmits<{ select: [activityId: string]; edit: [] }>()

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)

const activityMap = computed(() => new Map(planner.activities.map(activity => [activity.id, activity])))
const templateName = computed(() => activeTemplate.value?.name ?? 'no template')
const hourly = computed(() => isHourlyTemplate(activeTemplate.value))
// Painting needs the selected activity in edit mode (FR-PLAN-17, PRD 11.6); otherwise the grid is read-only
const editable = computed(() => props.editing && !!props.activity && hourly.value)
const slots = computed(() => activeTemplate.value?.slots ?? [])

const hoursPerDay = computed(() =>
  DAYS.map((_, day) => slots.value.slice(day * 24, day * 24 + 24).filter(Boolean).length)
)

// Pointer and keyboard share one cursor (roving focus) and one optional range (drag or Shift + arrows)
const cursor = ref<GridCell>({ day: 0, hour: 8 })
const range = ref<{ from: GridCell; to: GridCell } | null>(null)
const dragging = ref(false)
// A range that takes hours from other activities waits here for Reassign or Cancel
const pending = ref<{ cells: number[]; conflicts: HourConflict[]; returnTo: GridCell } | null>(null)

const gridEl = ref<HTMLElement | null>(null)
const confirmEl = ref<HTMLElement | null>(null)

const sameCell = (a: GridCell, b: GridCell) => a.day === b.day && a.hour === b.hour
const isCursor = (cell: GridCell) => sameCell(cell, cursor.value)
const setCursor = (cell: GridCell) => {
  cursor.value = { day: cell.day, hour: cell.hour }
}

// Each activity starts from its first hour, so the keyboard lands on something meaningful
watch(
  () => [props.activity?.id ?? null, props.editing, activeTemplate.value?.id ?? null] as const,
  ([activityId]) => {
    range.value = null
    dragging.value = false
    pending.value = null

    if (activityId) {
      const first = slots.value.indexOf(activityId)
      if (first >= 0) setCursor(cellAtIndex(first))
    }
  }
)

interface CellView extends GridCell {
  index: number
  holder: Activity | undefined
  /** own: the selected activity (or any holder in the overview); other: another activity while one is selected; free */
  tone: 'own' | 'other' | 'free'
  label: string
}

const rows = computed(() =>
  HOURS.map(hour =>
    DAYS.map((_, day): CellView => {
      const index = day * 24 + hour
      const holderId = slots.value[index]
      const holder = holderId ? activityMap.value.get(holderId) : undefined
      const tone = !holder ? 'free' : props.activity && holder.id !== props.activity.id ? 'other' : 'own'

      return {
        day,
        hour,
        index,
        holder,
        tone,
        label: `${DAY_NAMES[day]} ${formatHour(hour)}, ${holder?.name ?? 'free'}`
      }
    })
  )
)

const rangeIndexes = computed(() => new Set(range.value ? rectangleCells(range.value.from, range.value.to) : []))
const pendingIndexes = computed(() => new Set(pending.value?.cells ?? []))

const joinNames = (parts: string[]) =>
  parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`

const confirmText = computed(() => {
  if (!pending.value || !props.activity) return ''

  const parts = pending.value.conflicts.map(conflict =>
    `${conflict.hours} h from ${activityMap.value.get(conflict.activityId)?.name ?? 'another activity'}`
  )

  return `Reassign ${joinNames(parts)} to ${props.activity.name}?`
})

const helperText = computed(() => {
  if (!planner.activities.length) return 'Add an activity above to plan its hours.'
  if (!props.activity) return 'Select an activity to see its hours here.'
  if (!editable.value) return 'Edit this activity to change when it happens.'

  return `Start on an hour that is already ${props.activity.name} to clear the range, or on any other hour to add it. Release to apply.`
})

const hintText = computed(() => editable.value
  ? 'Arrows move. Shift with arrows selects a range. Space or Enter paints. Escape cancels.'
  : 'Arrows move. Space or Enter selects the activity in that hour.'
)

const cellFrom = (node: EventTarget | Element | null): GridCell | null => {
  const el = node instanceof Element ? node.closest<HTMLElement>('[data-day][data-hour]') : null
  return el ? { day: Number(el.dataset.day), hour: Number(el.dataset.hour) } : null
}

const focusCell = (cell: GridCell) => {
  nextTick(() => gridEl.value?.querySelector<HTMLElement>(`[data-day="${cell.day}"][data-hour="${cell.hour}"]`)?.focus())
}

/** Applies a range to the selected activity. Clearing never touches other activities; adding asks first when it takes their hours */
const paint = (from: GridCell, to: GridCell) => {
  const template = activeTemplate.value
  const activity = props.activity

  if (!template || !activity) return

  const cells = rectangleCells(from, to)

  if (paintModeFor(template.slots, cellIndex(from), activity.id) === 'clear') {
    planner.setActivitySlots(template.id, activity.id, cells, 'clear')
    return
  }

  const conflicts = planner.setActivitySlots(template.id, activity.id, cells, 'add')

  if (conflicts.length) {
    pending.value = { cells, conflicts, returnTo: to }
    nextTick(() => confirmEl.value?.focus())
  }
}

const resolvePending = (reassign: boolean) => {
  const current = pending.value
  const activity = props.activity
  const template = activeTemplate.value

  pending.value = null

  if (current && reassign && activity && template) {
    planner.setActivitySlots(template.id, activity.id, current.cells, 'add', true)
  }

  if (current) focusCell(current.returnTo)
}

const reassignPending = () => resolvePending(true)
const cancelPending = () => resolvePending(false)

// Pointer: press on a cell, drag across days and hours, release to apply. Touch uses the same path (touch-action: none)
const onPointerDown = (event: PointerEvent) => {
  const cell = cellFrom(event.target)

  if (!cell || event.button !== 0) return

  setCursor(cell)
  focusCell(cell)

  // Not editing: a click selects the activity in that hour (see onCellClick)
  if (!editable.value) return

  pending.value = null
  range.value = { from: cell, to: cell }
  dragging.value = true
  gridEl.value?.setPointerCapture(event.pointerId)
  event.preventDefault()
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragging.value || !range.value) return

  const cell = cellFrom(document.elementFromPoint(event.clientX, event.clientY))

  if (!cell || sameCell(cell, range.value.to)) return

  range.value = { from: range.value.from, to: cell }
  setCursor(cell)
  focusCell(cell)
}

const endGesture = () => {
  const current = range.value

  dragging.value = false
  range.value = null
  return current
}

const onPointerUp = () => {
  if (!dragging.value) return

  const current = endGesture()

  if (current) paint(current.from, current.to)
}

const onPointerCancel = () => {
  endGesture()
}

const onCellClick = (cell: CellView) => {
  if (!editable.value && cell.holder) emit('select', cell.holder.id)
}

// Keyboard: Home and End jump to the first and last day of the row; PageUp and PageDown to the first and last hour of the column
const stepFor = (key: string, cell: GridCell): GridCell | null => {
  switch (key) {
    case 'ArrowLeft': return { day: Math.max(0, cell.day - 1), hour: cell.hour }
    case 'ArrowRight': return { day: Math.min(6, cell.day + 1), hour: cell.hour }
    case 'ArrowUp': return { day: cell.day, hour: Math.max(0, cell.hour - 1) }
    case 'ArrowDown': return { day: cell.day, hour: Math.min(23, cell.hour + 1) }
    case 'Home': return { day: 0, hour: cell.hour }
    case 'End': return { day: 6, hour: cell.hour }
    case 'PageUp': return { day: cell.day, hour: 0 }
    case 'PageDown': return { day: cell.day, hour: 23 }
    default: return null
  }
}

const onKeydown = (event: KeyboardEvent) => {
  const cell = cursor.value

  if (event.key === 'Escape') {
    if (pending.value) {
      event.preventDefault()
      cancelPending()
    } else if (range.value) {
      event.preventDefault()
      range.value = null
    }
    return
  }

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()

    if (!editable.value) {
      const holderId = slots.value[cellIndex(cell)]
      if (holderId) emit('select', holderId)
      return
    }

    const current = range.value ?? { from: cell, to: cell }
    range.value = null
    paint(current.from, current.to)
    return
  }

  const next = stepFor(event.key, cell)

  if (!next) return

  event.preventDefault()

  range.value = event.shiftKey && editable.value ? { from: range.value?.from ?? cell, to: next } : null
  setCursor(next)
  focusCell(next)
}
</script>

<template>
  <section class="section" aria-labelledby="schedule-title">
    <h2 id="schedule-title" class="section-title">Schedule</h2>
    <p class="section-lede">
      <template v-if="!hourly">This template uses 30-minute slots, which this grid does not edit. Choose an hourly template above.</template>
      <template v-else-if="editable">Painting hours for <strong>{{ activity!.name }}</strong> in <strong>{{ templateName }}</strong>.</template>
      <template v-else-if="activity">Hours of <strong>{{ activity.name }}</strong> in <strong>{{ templateName }}</strong> are highlighted; other activities are muted. Read-only.</template>
      <template v-else>Overview of <strong>{{ templateName }}</strong>, read-only. Every activity in its colour; free hours stay empty.</template>
    </p>

    <template v-if="hourly">
      <div
        v-if="pending"
        ref="confirmEl"
        class="ag-confirm"
        role="group"
        aria-labelledby="ag-confirm-text"
        tabindex="-1"
        @keydown.escape.stop.prevent="cancelPending"
      >
        <p id="ag-confirm-text" class="ag-confirm-text">{{ confirmText }}</p>
        <div class="act-actions">
          <button type="button" class="btn btn-sm btn-primary" @click="reassignPending">Reassign</button>
          <button type="button" class="btn btn-sm" @click="cancelPending">Cancel</button>
        </div>
      </div>

      <div class="ag-scroll">
        <div
          ref="gridEl"
          class="ag-grid"
          role="grid"
          :aria-label="`Hours of ${templateName}`"
          :aria-readonly="editable ? undefined : 'true'"
          :data-editable="editable ? 'true' : 'false'"
          @keydown="onKeydown"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <div class="ag-row ag-head" role="row">
            <div class="ag-corner" role="presentation" />
            <div
              v-for="(day, index) in DAYS"
              :key="day"
              class="ag-day"
              role="columnheader"
              :aria-label="`${DAY_NAMES[index]}, ${hoursPerDay[index]} hours planned`"
            >
              <span class="ag-day-name">{{ day }}</span>
              <span class="ag-day-hours">{{ hoursPerDay[index] }} h</span>
            </div>
          </div>

          <div v-for="(row, hour) in rows" :key="hour" class="ag-row" role="row">
            <div class="ag-hour" role="rowheader">{{ formatHour(hour) }}</div>
            <div
              v-for="cell in row"
              :key="cell.index"
              role="gridcell"
              class="ag-cell"
              :class="{ 'is-range': rangeIndexes.has(cell.index), 'is-pending': pendingIndexes.has(cell.index) }"
              :data-day="cell.day"
              :data-hour="cell.hour"
              :data-tone="cell.tone"
              :style="cell.holder ? { '--c': cell.holder.color } : undefined"
              :tabindex="isCursor(cell) ? 0 : -1"
              :aria-label="cell.label"
              :title="cell.label"
              @focus="setCursor(cell)"
              @click="onCellClick(cell)"
            >{{ cell.holder?.shortCode }}</div>
          </div>
        </div>
      </div>

      <p class="ag-helper">
        {{ helperText }}
        <button
          v-if="activity && !editable"
          type="button"
          class="btn btn-sm btn-outline ag-helper-action"
          :aria-label="`Edit hours of ${activity.name}`"
          @click="emit('edit')"
        >Edit hours</button>
      </p>
      <p class="ag-hint">{{ hintText }}</p>
    </template>
  </section>
</template>
