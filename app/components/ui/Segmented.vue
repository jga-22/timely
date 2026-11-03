<script setup lang="ts" generic="T extends string">
/**
 * A row of choices where one is pressed: a labelled group of buttons with aria-pressed (v-model is the value of the pressed
 * choice). Used for Motion, the Goals List or Grid switch, the Insights and Year range controls and the sleep nights.
 */
const model = defineModel<T>({ required: true })
defineProps<{ options: { value: T; label: string }[]; label: string }>()
</script>

<template>
  <div class="seg" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value ? 'true' : 'false'"
      @click="model = option.value"
    >{{ option.label }}</button>
  </div>
</template>
