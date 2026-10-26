<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import {
  DAYS,
  cellAtIndex,
  cellIndex,
  formatHour,
  isHourlyTemplate,
  rectangleCells,
  type GridCell,
  type HourConflict
} from '~/utils/planner'
import type { Activity } from '~/types/planner'

/** Hour rows of the grid, 12AM to 11PM */
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
/** The undo notice stays for this long (ms) */
const NOTICE_MS = 8000

// The brush is the selected activity (paints it) or Erase (clears hours). With neither, the grid is an overview
const props = defineProps<{ activity: Activity | null; erasing: boolean }>()
const emit = defineEmits<{ select: [activityId: string] }>()

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)

const activityMap = computed(() => new Map(planner.activities.map(activity => [activity.id, activity])))
const templateName = computed(() => activeTemplate.value?.name ?? 'no template')
const hourly = computed(() => isHourlyTemplate(activeTemplate.value))
const painting = computed(() => hourly.value && (!!props.activity || props.erasing))
const slots = computed(() => activeTemplate.value?.slots ?? [])
const plannedHours = computed(() => slots.value.filter(Boolean).length)

const hoursPerDay = computed(() =>
  DAYS.map((_, day) => slots.value.slice(day * 24, day * 24 + 24).filter(Boolean).length)
)

// Pointer and keyboard share one cursor (roving focus) and one optional range (drag or Shift + arrows)
const cursor = ref<GridCell>({ day: 0, hour: 8 })
const range = ref<{ from: GridCell; to: GridCell } | null>(null)
const dragging = ref(false)

// Single-step undo of the last paint that replaced other hours or erased some (auto-dismissed)
const notice = ref<{ text: string; templateId: string; slots: string[] } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined

const gridEl = ref<HTMLElement | null>(null)

const sameCell = (a: GridCell, b: GridCell) => a.day === b.day && a.hour === b.hour
const isCursor = (cell: GridCell) => sameCell(cell, cursor.value)
const setCursor = (cell: GridCell) => {
  cursor.value = { day: cell.day, hour: cell.hour }
}

// Each activity starts from its first hour, so the keyboard lands on something meaningful
watch(
  () => [props.activity?.id ?? null, props.erasing, activeTemplate.value?.id ?? null] as const,
  ([activityId]) => {
    range.value = null
    dragging.value = false

    if (activityId) {
      const first = slots.value.indexOf(activityId)
      if (first >= 0) setCursor(cellAtIndex(first))
    }
  }
)

interface CellView extends GridCell {
  index: number
  holder: Activity | undefined
  /** own: the selected activity (or any holder in the overview or Erase); other: another activity while one is selected; free */
  tone: 'own' | 'other' | 'free'
  /** The short code is printed only on the first hour of a block */
  code: string
  label: string
}

const rows = computed(() =>
  HOURS.map(hour =>
    DAYS.map((_, day): CellView => {
      const index = day * 24 + hour
      const holderId = slots.value[index]
      const holder = holderId ? activityMap.value.get(holderId) : undefined
      const tone = !holder ? 'free' : props.activity && holder.id !== props.activity.id ? 'other' : 'own'
      const startsBlock = hour === 0 || slots.value[index - 1] !== holderId

      return {
        day,
        hour,
        index,
        holder,
        tone,
        code: holder && startsBlock ? holder.shortCode : '',
        label: `${DAY_NAMES[day]} ${formatHour(hour)}, ${holder?.name ?? 'free'}`
      }
    })
  )
)

const rangeIndexes = computed(() => new Set(range.value ? rectangleCells(range.value.from, range.value.to) : []))

const joinNames = (parts: string[]) =>
  parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`

const helperText = computed(() => {
  if (!hourly.value) return ''
  if (props.erasing) return 'Erasing. Drag across hours, or press Space, to clear them.'
  if (props.activity) return `Painting ${props.activity.name}. Drag across hours to fill them; hours of other activities are replaced.`
  if (!planner.activities.length) return 'Add an activity to start painting its hours.'

  return 'Select an activity or Erase, then paint hours on the week. A click on a coloured hour selects its activity.'
})

const hintText = computed(() => painting.value
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

const dismissNotice = () => {
  notice.value = null
  clearTimeout(noticeTimer)
}

const showNotice = (value: { text: string; templateId: string; slots: string[] }) => {
  notice.value = value
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(dismissNotice, NOTICE_MS)
}

/** Paints the range with the brush (replacing other activities' hours) or erases it. One gesture is one undo step */
const paint = (from: GridCell, to: GridCell) => {
  const template = activeTemplate.value
  if (!template || !painting.value) return

  const activity = props.activity
  const before = [...template.slots]
  const taken: HourConflict[] = planner.paintCells(template.id, rectangleCells(from, to), activity ? activity.id : null)
  const after = activeTemplate.value?.slots ?? []

  if (!after.some((holder, index) => holder !== before[index])) return

  const hours = taken.reduce((sum, entry) => sum + entry.hours, 0)

  if (activity && taken.length) {
    const names = taken.map(entry => `${entry.hours} h of ${activityMap.value.get(entry.activityId)?.name ?? 'another activity'}`)
    showNotice({ text: `Replaced ${joinNames(names)}.`, templateId: template.id, slots: before })
  } else if (!activity && hours) {
    showNotice({ text: `Erased ${hours} h.`, templateId: template.id, slots: before })
  } else {
    dismissNotice()
  }
}

const undo = () => {
  const current = notice.value
  if (!current) return

  planner.restoreSlots(current.templateId, current.slots)
  dismissNotice()
}

onBeforeUnmount(() => clearTimeout(noticeTimer))

// Pointer: press on a cell, drag across days and hours, release to paint. Touch uses the same path (touch-action: none)
const onPointerDown = (event: PointerEvent) => {
  const cell = cellFrom(event.target)

  if (!cell || event.button !== 0) return

  setCursor(cell)
  focusCell(cell)

  // Nothing to paint with: a click selects the activity in that hour (see onCellClick)
  if (!painting.value) return

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

const onPointerUp = () => {
  if (!dragging.value) return

  const current = range.value
  dragging.value = false
  range.value = null

  if (current) paint(current.from, current.to)
}

const onPointerCancel = () => {
  dragging.value = false
  range.value = null
}

const onCellClick = (cell: CellView) => {
  if (!painting.value && cell.holder) emit('select', cell.holder.id)
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
    if (range.value) {
      event.preventDefault()
      range.value = null
    }
    return
  }

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()

    if (!painting.value) {
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

  range.value = event.shiftKey && painting.value ? { from: range.value?.from ?? cell, to: next } : null
  setCursor(next)
  focusCell(next)
}
</script>

<template>
  <section class="section ag-section" aria-labelledby="schedule-title">
    <div class="ag-head-line">
      <h2 id="schedule-title" class="section-title">Week</h2>
      <p class="ag-meta">{{ templateName }} · {{ plannedHours }} of 168 h planned</p>
    </div>

    <p v-if="!hourly" class="ag-helper">This template uses 30-minute slots, which this grid does not edit. Choose an hourly template above.</p>

    <template v-else>
      <div class="ag-scroll">
        <div
          ref="gridEl"
          class="ag-grid"
          role="grid"
          :aria-label="`Hours of ${templateName}`"
          :aria-readonly="painting ? undefined : 'true'"
          :data-painting="painting ? 'true' : 'false'"
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
              :class="{ 'is-range': rangeIndexes.has(cell.index) }"
              :data-day="cell.day"
              :data-hour="cell.hour"
              :data-tone="cell.tone"
              :style="cell.holder ? { '--c': cell.holder.color } : undefined"
              :tabindex="isCursor(cell) ? 0 : -1"
              :aria-label="cell.label"
              :title="cell.label"
              @focus="setCursor(cell)"
              @click="onCellClick(cell)"
            >{{ cell.code }}</div>
          </div>
        </div>
      </div>

      <p v-if="notice" class="ag-notice" role="status">
        <span>{{ notice.text }}</span>
        <button type="button" class="btn btn-xs btn-outline" @click="undo">Undo</button>
      </p>
      <p v-else class="ag-helper">{{ helperText }}</p>
      <p class="ag-hint">{{ hintText }}</p>
    </template>
  </section>
</template>
