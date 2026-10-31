<script setup lang="ts">
import type { AdherenceReport } from '~/utils/adherence'

// The adherence ring (PRD FR-INS-P6, FR-HOME-19): a donut of the percent done of planned. Decorative, so the figure is said in
// text next to it. The arc is the accent for planned blocks and the ok colour for the habits basis. Size is the largest width in px.
withDefaults(defineProps<{
  percent: number | null
  basis?: AdherenceReport['basis']
  size?: number
  showValue?: boolean
}>(), { basis: null, size: 240, showValue: true })
</script>

<template>
  <div class="adh-ring" :style="{ width: `min(${size}px, 100%)` }" aria-hidden="true">
    <svg viewBox="0 0 200 200" class="adh-ring-svg">
      <circle class="adh-ring-track" cx="100" cy="100" r="70" />
      <circle
        v-if="percent !== null"
        class="adh-ring-arc"
        :class="{ 'is-habits': basis === 'habits' }"
        cx="100"
        cy="100"
        r="70"
        pathLength="100"
        :stroke-dasharray="`${percent} 100`"
      />
    </svg>
    <span v-if="showValue" class="adh-ring-value">{{ percent === null ? '-' : `${percent}%` }}</span>
  </div>
</template>
