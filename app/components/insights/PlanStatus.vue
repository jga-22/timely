<script setup lang="ts">
import { alignmentStatus, hoursLabel, type AlignmentStatus } from '~/utils/planner'

/**
 * One compact line under a life area's share in Insights (FR-INS-P4): the status icon and its text in the unit shown, e.g. "43 h over",
 * "74 h planned of 80 h needed", "Needs 32 h more". Nothing shows when the habits ask for no time. The status is never colour only:
 * the icon shape and the words say it.
 */
const props = defineProps<{
  /** Minutes the habits ask for over the period */
  neededMinutes: number
  /** Minutes planned over the period */
  plannedMinutes: number
  /** Formats minutes for the text (the unit shown); hours when not given */
  format?: (minutes: number) => string
}>()

const status = computed<AlignmentStatus>(() => alignmentStatus(props.neededMinutes, props.plannedMinutes))
const amount = (minutes: number) => (props.format ? props.format(minutes) : hoursLabel(minutes))

const text = computed(() => {
  if (status.value === 'under') return `Needs ${amount(props.neededMinutes - props.plannedMinutes)} more`
  if (status.value === 'over') return `${amount(props.plannedMinutes - props.neededMinutes)} over`
  if (status.value === 'ok') return `${amount(props.plannedMinutes)} planned of ${amount(props.neededMinutes)} needed`

  return ''
})
</script>

<template>
  <p v-if="text" class="plan-status" :data-status="status">
    <!-- A check on target, a plus when time is missing, a minus when it is over -->
    <svg class="plan-status-icon" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
      <template v-if="status === 'ok'">
        <circle cx="8" cy="8" r="7" class="plan-status-fill" />
        <path d="M4.8 8.2 L7 10.3 L11.2 5.9" class="plan-status-mark" />
      </template>
      <template v-else-if="status === 'under'">
        <circle cx="8" cy="8" r="6.5" class="plan-status-ring" />
        <path d="M8 4.8 V11.2 M4.8 8 H11.2" class="plan-status-stroke" />
      </template>
      <template v-else>
        <circle cx="8" cy="8" r="6.5" class="plan-status-ring" />
        <path d="M4.8 8 H11.2" class="plan-status-stroke" />
      </template>
    </svg>
    <span>{{ text }}</span>
  </p>
</template>

<style scoped>
.plan-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--fs-sm);
  line-height: 1.35;
  color: var(--ink-2);
}
.plan-status[data-status="under"],
.plan-status[data-status="over"] { color: var(--warn); }

.plan-status-icon {
  flex: none;
  width: 16px;
  height: 16px;
}
.plan-status-fill { fill: var(--ok); }
.plan-status-mark { fill: none; stroke: var(--bg); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.plan-status-ring { fill: none; stroke: currentColor; stroke-width: 1.5; }
.plan-status-stroke { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.plan-status[data-status="ok"] .plan-status-icon { color: var(--ok); }
.plan-status[data-status="under"] .plan-status-icon,
.plan-status[data-status="over"] .plan-status-icon { color: var(--warn); }
</style>
