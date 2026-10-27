<script setup lang="ts">
import { alignmentStatus, hoursLabel, type AlignmentStatus } from '~/utils/planner'

/**
 * One category's time against its need, in hours a week (FR-GOALS-16): the needed time as an outlined bar and the planned time as a
 * filled bar, both on one scale (the larger of the two), then one line of text with a status icon. The status is never colour only:
 * the icon shape and the words say it. Shown in the Goals list rows and the category detail. The bars are decoration (aria-hidden),
 * the text is the reading.
 */
const props = withDefaults(defineProps<{
  neededMinutes: number
  plannedMinutes: number
  /** The category colour; the planned bar uses the planned fill of it (one palette rule). Without one, the accent */
  color?: string
}>(), { color: undefined })

const { fill } = usePlannerFill()

const status = computed<AlignmentStatus>(() => alignmentStatus(props.neededMinutes, props.plannedMinutes))
const scale = computed(() => Math.max(props.neededMinutes, props.plannedMinutes))
const share = (minutes: number) => (scale.value > 0 ? `${(minutes / scale.value) * 100}%` : '0%')
const plannedColor = computed(() => (props.color ? fill(props.color) : 'var(--accent)'))

const text = computed(() => {
  if (status.value === 'none') return 'No time target yet'
  if (status.value === 'under') return `Needs ${hoursLabel(props.neededMinutes - props.plannedMinutes)} more`
  if (status.value === 'over') return `${hoursLabel(props.plannedMinutes - props.neededMinutes)} over`

  return `${hoursLabel(props.plannedMinutes)} planned of ${hoursLabel(props.neededMinutes)} needed`
})
</script>

<template>
  <div class="nbp" :data-status="status">
    <div class="nbp-bars" aria-hidden="true">
      <span class="nbp-row">
        <span v-if="neededMinutes > 0" class="nbp-bar is-needed" :style="{ width: share(neededMinutes) }" />
      </span>
      <span class="nbp-row">
        <span v-if="plannedMinutes > 0" class="nbp-bar is-planned" :style="{ width: share(plannedMinutes), background: plannedColor }" />
      </span>
    </div>

    <p class="nbp-text">
      <!-- The icon: a check on target, a plus when time is missing, a minus when it is over, a dashed ring with no target -->
      <svg class="nbp-icon" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
        <template v-if="status === 'ok'">
          <circle cx="8" cy="8" r="7" class="nbp-icon-fill" />
          <path d="M4.8 8.2 L7 10.3 L11.2 5.9" class="nbp-icon-mark" />
        </template>
        <template v-else-if="status === 'under'">
          <circle cx="8" cy="8" r="6.5" class="nbp-icon-ring" />
          <path d="M8 4.8 V11.2 M4.8 8 H11.2" class="nbp-icon-stroke" />
        </template>
        <template v-else-if="status === 'over'">
          <circle cx="8" cy="8" r="6.5" class="nbp-icon-ring" />
          <path d="M4.8 8 H11.2" class="nbp-icon-stroke" />
        </template>
        <circle v-else cx="8" cy="8" r="6.5" class="nbp-icon-dash" />
      </svg>
      <span>{{ text }}</span>
    </p>
  </div>
</template>

<style scoped>
.nbp {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  max-width: 100%;
}

/* One scale: each row is the full scale, the bar inside it is its value */
.nbp-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nbp-row {
  position: relative;
  display: block;
  height: 8px;
  border-radius: 3px;
  background: var(--bg-3);
}
.nbp-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  border-radius: 3px;
}
/* Needed: an outline, the target as a frame. Planned: a solid fill in the category's planned colour */
.nbp-bar.is-needed {
  box-sizing: border-box;
  border: 1.5px solid var(--control-border);
}
.nbp-bar.is-planned {
  background: var(--accent);
}

.nbp-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--fs-sm);
  line-height: 1.35;
  color: var(--ink-2);
}
.nbp[data-status="under"] .nbp-text,
.nbp[data-status="over"] .nbp-text { color: var(--warn); }
.nbp[data-status="none"] .nbp-text { color: var(--ink-3); }

.nbp-icon {
  flex: none;
  width: 16px;
  height: 16px;
}
.nbp-icon-fill { fill: var(--ok); }
.nbp-icon-mark { fill: none; stroke: var(--bg); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.nbp-icon-ring { fill: none; stroke: currentColor; stroke-width: 1.5; }
.nbp-icon-stroke { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.nbp-icon-dash { fill: none; stroke: var(--ink-3); stroke-width: 1.2; stroke-dasharray: 2 2; }
.nbp[data-status="under"] .nbp-icon,
.nbp[data-status="over"] .nbp-icon { color: var(--warn); }
.nbp[data-status="ok"] .nbp-icon { color: var(--ok); }
.nbp[data-status="ok"] .nbp-text { color: var(--ink-2); }
</style>
