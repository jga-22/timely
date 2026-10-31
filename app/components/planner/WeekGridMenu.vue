<script setup lang="ts">
import type { Activity } from '~/types/planner'
import { DAYS, formatHour } from '~/utils/planner'
import { rangeLabel, type Range } from '~/utils/weekGrid'

/**
 * The Apply menu of the week grid (FR-PLAN-23): the activities with the hours each takes in the week, then Clear these hours.
 * It opens where the action bar was. The parent measures it through el to keep it on screen.
 */
defineProps<{ selection: Range; pos: { x: number; y: number }; activities: Activity[]; hours: Map<string, number>; hasAny: boolean }>()
defineEmits<{ apply: [activityId: string]; clear: [] }>()

const el = ref<HTMLElement | null>(null)
defineExpose({ el })

const hoursText = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1))
</script>

<template>
  <div
    ref="el"
    class="wk-pop wk-menu"
    role="group"
    :aria-label="`Activities for ${rangeLabel(selection)}`"
    :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    @click.stop
  >
    <div class="wk-pop-head">
      <span class="wk-pop-day">{{ DAYS[selection.day] }}</span>
      <span class="wk-pop-range">{{ formatHour(selection.start) }} – {{ formatHour(selection.end) }}</span>
      <span class="wk-pop-dur">{{ selection.end - selection.start }}h</span>
    </div>
    <div class="wk-menu-list">
      <button
        v-for="activity in activities"
        :key="activity.id"
        type="button"
        class="wk-menu-item"
        @click="$emit('apply', activity.id)"
      >
        <span class="dot" :style="{ background: activity.color }" />
        <span class="wk-menu-name">{{ activity.name }}</span>
        <span class="wk-menu-hrs">{{ hoursText(hours.get(activity.id) ?? 0) }}h</span>
      </button>
      <p v-if="!hasAny" class="wk-menu-empty">No activities yet. Add one under the week grid.</p>
      <div class="wk-menu-divider" />
      <button type="button" class="wk-menu-item is-clear" @click="$emit('clear')">
        <span class="dot wk-dot-clear" />
        <span class="wk-menu-name">Clear these hours</span>
      </button>
    </div>
  </div>
</template>
