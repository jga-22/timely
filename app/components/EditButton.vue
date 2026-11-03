<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/**
 * The one Edit control of the app: a pencil icon with its name in aria-label and title (FR-UX-2).
 * With `to` it links into the screen that owns the item; without it, it is a button. `focus()` is exposed for focus return.
 */
defineProps<{ label: string; to?: RouteLocationRaw; expanded?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ click: [] }>()

const root = ref<HTMLElement | null>(null)
defineExpose({ focus: () => root.value?.focus() })
</script>

<template>
  <NuxtLink v-if="to" ref="root" :to="to" class="btn btn-icon edit-btn" :aria-label="label" :title="label">
    <UiIcon name="pencil" size="sm" />
  </NuxtLink>
  <button
    v-else
    ref="root"
    type="button"
    class="btn btn-icon edit-btn"
    :aria-label="label"
    :title="label"
    :aria-expanded="expanded"
    :disabled="disabled"
    @click="emit('click')"
  >
    <UiIcon name="pencil" size="sm" />
  </button>
</template>
