<script setup lang="ts">
import { alignmentStatus, hoursLabel, type AlignmentStatus } from '~/utils/planner'

/**
 * One life area's time against its need over the period shown (FR-INS-P4), under its share bar in the Life areas list: the needed time as
 * an outlined bar and the planned time as a filled bar, each with a small caption to its left ("Needed", "Planned"), both on one scale
 * (the larger of the two); then one line of text with a status icon ("43 h over", "74 h planned of 80 h needed", "Needs 32 h more").
 * The status is never colour only: the icon shape and the words say it. Nothing shows when the habits ask for no time.
 * The bars are decoration (aria-hidden); the text is the reading.
 */
const props = withDefaults(defineProps<{
  /** Minutes the habits ask for over the period */
  neededMinutes: number
  /** Minutes planned over the period */
  plannedMinutes: number
  /** The life area colour; the planned bar uses the planned fill of it (one palette rule). Without one, the accent */
  color?: string
  /** Formats minutes for the text and the unit shown; hours when not given */
  format?: (minutes: number) => string
}>(), { color: undefined, format: undefined })

const { fill } = usePlannerFill()

const status = computed<AlignmentStatus>(() => alignmentStatus(props.neededMinutes, props.plannedMinutes))
const scale = computed(() => Math.max(props.neededMinutes, props.plannedMinutes))
const share = (minutes: number) => (scale.value > 0 ? `${(minutes / scale.value) * 100}%` : '0%')
const plannedColor = computed(() => (props.color ? fill(props.color) : 'var(--accent)'))
const amount = (minutes: number) => (props.format ? props.format(minutes) : hoursLabel(minutes))

const text = computed(() => {
  if (status.value === 'under') return `Needs ${amount(props.neededMinutes - props.plannedMinutes)} more`
  if (status.value === 'over') return `${amount(props.plannedMinutes - props.neededMinutes)} over`
  if (status.value === 'ok') return `${amount(props.plannedMinutes)} planned of ${amount(props.neededMinutes)} needed`

  return ''
})
</script>

<template>
  <div v-if="neededMinutes > 0" class="plan-cmp" :data-status="status">
    <div class="plan-cmp-bars" aria-hidden="true">
      <span class="plan-cmp-line">
        <span class="plan-cmp-cap">Needed</span>
        <span class="plan-cmp-row">
          <span v-if="neededMinutes > 0" class="plan-cmp-bar is-needed" :style="{ width: share(neededMinutes) }" />
        </span>
      </span>
      <span class="plan-cmp-line">
        <span class="plan-cmp-cap">Planned</span>
        <span class="plan-cmp-row">
          <span v-if="plannedMinutes > 0" class="plan-cmp-bar is-planned" :style="{ width: share(plannedMinutes), background: plannedColor }" />
        </span>
      </span>
    </div>

    <p v-if="text" class="plan-cmp-text">
      <!-- A check on target, a plus when time is missing, a minus when it is over -->
      <svg class="plan-cmp-icon" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
        <template v-if="status === 'ok'">
          <circle cx="8" cy="8" r="7" class="plan-cmp-fill" />
          <path d="M4.8 8.2 L7 10.3 L11.2 5.9" class="plan-cmp-mark" />
        </template>
        <template v-else-if="status === 'under'">
          <circle cx="8" cy="8" r="6.5" class="plan-cmp-ring" />
          <path d="M8 4.8 V11.2 M4.8 8 H11.2" class="plan-cmp-stroke" />
        </template>
        <template v-else>
          <circle cx="8" cy="8" r="6.5" class="plan-cmp-ring" />
          <path d="M4.8 8 H11.2" class="plan-cmp-stroke" />
        </template>
      </svg>
      <span>{{ text }}</span>
    </p>
  </div>
</template>

<style scoped>
.plan-cmp {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  max-width: 100%;
}

/* One scale: each row is the full scale, the bar inside it is its value. Each bar has a small caption to its left */
.plan-cmp-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.plan-cmp-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.plan-cmp-cap {
  flex: none;
  width: 48px;
  font-size: var(--fs-xs);
  line-height: 1.2;
  color: var(--ink-3);
}
.plan-cmp-row {
  position: relative;
  display: block;
  flex: 1;
  min-width: 0;
  height: 8px;
  border-radius: 3px;
  background: var(--bg-3);
}
.plan-cmp-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  border-radius: 3px;
}
/* Needed: an outline, the target as a frame. Planned: a solid fill in the life area's planned colour */
.plan-cmp-bar.is-needed {
  box-sizing: border-box;
  border: 1.5px solid var(--control-border);
}
.plan-cmp-bar.is-planned {
  background: var(--accent);
}

.plan-cmp-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--fs-sm);
  line-height: 1.35;
  color: var(--ink-2);
}
.plan-cmp[data-status="under"] .plan-cmp-text,
.plan-cmp[data-status="over"] .plan-cmp-text { color: var(--warn); }

.plan-cmp-icon {
  flex: none;
  width: 16px;
  height: 16px;
}
.plan-cmp-fill { fill: var(--ok); }
.plan-cmp-mark { fill: none; stroke: var(--bg); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.plan-cmp-ring { fill: none; stroke: currentColor; stroke-width: 1.5; }
.plan-cmp-stroke { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.plan-cmp[data-status="under"] .plan-cmp-icon,
.plan-cmp[data-status="over"] .plan-cmp-icon { color: var(--warn); }
.plan-cmp[data-status="ok"] .plan-cmp-icon { color: var(--ok); }
</style>
