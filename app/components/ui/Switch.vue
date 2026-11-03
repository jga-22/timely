<script setup lang="ts">
/**
 * An on or off switch: a button with role="switch" and aria-checked (v-model). The slot is the visible label; without a
 * slot, `label` names it for screen readers only. The knob slides under lively motion (Calm shows the new state at once).
 * The caller saves the value (a preference): bind it with :model-value and an update handler, not a plain v-model on a store ref.
 */
const checked = defineModel<boolean>({ default: false })
withDefaults(defineProps<{ label?: string }>(), { label: undefined })

const toggle = () => {
  checked.value = !checked.value
}
</script>

<template>
  <button type="button" class="switch" role="switch" :aria-checked="checked ? 'true' : 'false'" @click="toggle">
    <span v-if="$slots.default" class="switch-label"><slot /></span>
    <span v-else class="sr-only">{{ label }}</span>
    <span class="switch-track" aria-hidden="true"><span class="switch-knob" /></span>
  </button>
</template>
