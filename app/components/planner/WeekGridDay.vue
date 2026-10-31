<script setup lang="ts">
import { usePlannerFill } from '~/composables/usePlannerFill'
import { inkOn } from '~/utils/palette'
import type { Activity } from '~/types/planner'
import { formatHour, type TimeBlock } from '~/utils/planner'
import { clockLabel } from '~/utils/sleep'
import { HOUR_PX, type Cell, type FlowRow, type Range } from '~/utils/weekGrid'

/**
 * One day column of the Week grid (PlannerWeekGridDay): its hour slots, its painted blocks, and the selection with its edit handles.
 * The grid's pointer and key handlers sit on the body around the columns, so this component only lays out and emits
 */
const props = defineProps<{
  /** Day index, 0 (Monday) to 6 */
  day: number
  /** Day name for the labels, e.g. Tuesday */
  name: string
  /** The rows of the grid: shown hours and the thin bands between them */
  flow: FlowRow[]
  /** Top of each shown hour in px */
  tops: number[]
  /** The shown slots of the week, 24 per day (sleep reads as empty while hidden) */
  shownSlots: string[]
  /** Activities by id, for the colour, short code and name */
  activities: Map<string, Activity>
  /** The painted blocks of this day */
  blocks: TimeBlock[]
  /** The keyboard cursor */
  cursor: Cell
  /** The selected run, if it is in this day */
  selection: Range | null
  /** Edit mode: the selection carries its handles and Save and Cancel */
  editing: boolean
}>()

const emit = defineEmits<{
  'focus-cell': [cell: Cell]
  clear: [range: Range]
  resize: [side: 'top' | 'bottom', event: PointerEvent]
  'handle-key': [side: 'top' | 'bottom', event: KeyboardEvent]
  cancel: []
  save: []
}>()

const { fill } = usePlannerFill()
const blockColor = (block: TimeBlock) => fill(props.activities.get(block.activityId)?.color ?? '#999999')
/** A block prints the activity's short code (1 to 3 letters), so no name is cut off; the full name is in the block's title */
const blockCode = (block: TimeBlock) => props.activities.get(block.activityId)?.shortCode ?? ''
const isCursor = (hour: number) => props.cursor.day === props.day && props.cursor.hour === hour
</script>

<template>
  <div class="wk-day" :data-day="day">
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
        :tabindex="isCursor(row.hour) ? 0 : -1"
        :data-day="day"
        :data-hour="row.hour"
        :aria-label="`${name} ${formatHour(row.hour)}, ${shownSlots[day * 24 + row.hour] ? activities.get(shownSlots[day * 24 + row.hour]!)?.name : 'free'}`"
        @focus="emit('focus-cell', { day, hour: row.hour })"
      />
    </template>

    <!-- Blocks: the painted hours, drawn over the slots; hover shows the delete button -->
    <div
      v-for="block in blocks"
      :key="`${block.start}-${block.activityId}`"
      class="wk-block"
      :class="{ 'is-short': block.end - block.start === 1 }"
      :style="{
        top: `${tops[block.start] ?? 0}px`,
        height: `${(block.end - block.start) * HOUR_PX - 2}px`,
        background: blockColor(block),
        color: inkOn(blockColor(block)),
      }"
    >
      <span class="wk-block-name" :title="activities.get(block.activityId)?.name">{{ blockCode(block) }}</span>
      <span class="wk-block-time">{{ formatHour(block.start) }}–{{ formatHour(block.end) }}</span>
      <button
        type="button"
        class="wk-block-del"
        title="Clear these hours"
        :aria-label="`Clear ${activities.get(block.activityId)?.name ?? 'hours'}, ${name} ${formatHour(block.start)} to ${formatHour(block.end)}`"
        @click="emit('clear', { day, start: block.start, end: block.end })"
      >✕</button>
    </div>

    <!-- Selection: the highlighted run; in edit mode it carries the resize handles -->
    <div
      v-if="selection && selection.day === day"
      class="wk-sel"
      :style="{
        top: `${tops[selection.start] ?? 0}px`,
        height: `${(selection.end - selection.start) * HOUR_PX}px`,
      }"
    >
      <template v-if="editing">
        <button
          type="button"
          class="wk-handle is-top"
          aria-label="Change start: drag, or Up and Down arrows"
          @pointerdown="emit('resize', 'top', $event)"
          @keydown="emit('handle-key', 'top', $event)"
        ><span /></button>
        <button
          type="button"
          class="wk-handle is-bottom"
          aria-label="Change end: drag, or Up and Down arrows"
          @pointerdown="emit('resize', 'bottom', $event)"
          @keydown="emit('handle-key', 'bottom', $event)"
        ><span /></button>
      </template>
      <span class="wk-dur">{{ selection.end - selection.start }}h</span>
      <div v-if="editing" class="wk-confirm">
        <button
          type="button"
          class="wk-round is-cancel"
          title="Cancel change"
          aria-label="Cancel change"
          @click="emit('cancel')"
        >✕</button>
        <button
          type="button"
          class="wk-round is-ok"
          title="Save change"
          aria-label="Save change"
          @click="emit('save')"
        >✓</button>
      </div>
    </div>
  </div>
</template>
