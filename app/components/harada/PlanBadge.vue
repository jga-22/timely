<script setup lang="ts">
import { alignmentStatus, hoursLabel, type AlignmentStatus } from '~/utils/planner'

/**
 * A life area's time against its need for a period (FR-GOALS-16, moved to Insights): a small badge, an icon and a short text
 * ("On track this year", "Short by 12 h this year"). Nothing shows when the habits ask for no time. The status is never colour only:
 * the icon shape and the words say it. The full comparison is in Insights.
 */
const props = defineProps<{
  neededMinutes: number
  plannedMinutes: number
  /** The period the figures cover, as the text reads it: "this year", "in 2027" */
  period: string
}>()

const status = computed<AlignmentStatus>(() => alignmentStatus(props.neededMinutes, props.plannedMinutes))

const text = computed(() => {
  if (status.value === 'under') return `Short by ${hoursLabel(props.neededMinutes - props.plannedMinutes)} ${props.period}`
  if (status.value === 'over') return `Over by ${hoursLabel(props.plannedMinutes - props.neededMinutes)} ${props.period}`
  if (status.value === 'ok') return `On track ${props.period}`

  return ''
})
</script>

<template>
  <span v-if="text" class="plan-badge" :data-status="status">
    <!-- A check on track, a plus when time is missing, a minus when it is over -->
    <svg class="plan-badge-icon" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
      <template v-if="status === 'ok'">
        <circle cx="8" cy="8" r="7" class="plan-badge-fill" />
        <path d="M4.8 8.2 L7 10.3 L11.2 5.9" class="plan-badge-mark" />
      </template>
      <template v-else-if="status === 'under'">
        <circle cx="8" cy="8" r="6.5" class="plan-badge-ring" />
        <path d="M8 4.8 V11.2 M4.8 8 H11.2" class="plan-badge-stroke" />
      </template>
      <template v-else>
        <circle cx="8" cy="8" r="6.5" class="plan-badge-ring" />
        <path d="M4.8 8 H11.2" class="plan-badge-stroke" />
      </template>
    </svg>
    <span>{{ text }}</span>
  </span>
</template>

<style scoped>
.plan-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
  font-size: var(--fs-sm);
  line-height: 1.35;
  color: var(--ink-2);
}
.plan-badge[data-status="under"],
.plan-badge[data-status="over"] { color: var(--warn); }

.plan-badge-icon {
  flex: none;
  width: 16px;
  height: 16px;
}
.plan-badge-fill { fill: var(--ok); }
.plan-badge-mark { fill: none; stroke: var(--bg); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.plan-badge-ring { fill: none; stroke: currentColor; stroke-width: 1.5; }
.plan-badge-stroke { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.plan-badge[data-status="ok"] .plan-badge-icon { color: var(--ok); }
.plan-badge[data-status="under"] .plan-badge-icon,
.plan-badge[data-status="over"] .plan-badge-icon { color: var(--warn); }
</style>
