<script setup lang="ts">
/**
 * A ring that shows a percentage (value 0 to 100, or null for none yet). Without `label` it is decorative and the figure
 * is said in text beside it; with `label` it is an image. `done` turns the centre into a check. The default slot is the
 * centre text. Under lively motion the arc draws in (Calm shows it at once).
 */
const props = withDefaults(defineProps<{
  value: number | null
  size?: number
  label?: string
  done?: boolean
  tone?: 'accent' | 'ok'
}>(), { size: 28, label: undefined, done: false, tone: 'accent' })

const share = computed(() => (props.value === null ? 0 : Math.min(100, Math.max(0, props.value))))
</script>

<template>
  <span
    class="ring"
    :class="[`is-${tone}`, { 'is-done': done }]"
    :style="{ width: `${size}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <svg class="ring-svg" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <circle class="ring-track" cx="18" cy="18" r="16" pathLength="100" />
      <circle
        v-if="value !== null"
        class="ring-arc"
        cx="18"
        cy="18"
        r="16"
        pathLength="100"
        :stroke-dasharray="`${share} 100`"
      />
    </svg>
    <span class="ring-centre"><slot /></span>
  </span>
</template>
