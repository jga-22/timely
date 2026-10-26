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
  <NuxtLink v-if="to" ref="root" :to="to" class="edit-btn" :aria-label="label" :title="label">
    <svg class="edit-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  </NuxtLink>
  <button
    v-else
    ref="root"
    type="button"
    class="edit-btn"
    :aria-label="label"
    :title="label"
    :aria-expanded="expanded"
    :disabled="disabled"
    @click="emit('click')"
  >
    <svg class="edit-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  </button>
</template>
