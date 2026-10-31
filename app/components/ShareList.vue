<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// The Life areas list of Insights: one row per life area (its hours and its share of the available time; the name links
// to Goals when the row has a target) and the not planned rest. With selectable (the donut view) a row click selects its slice;
// a link inside a row still goes to Goals.
type ShareRow = { key: string, label: string, color: string, value: string, pct: number, to?: RouteLocationRaw }

const props = withDefaults(defineProps<{
  rows: ShareRow[]
  rest: { key: string, value: string, pct: number }
  selectable?: boolean
  selected: string | null
}>(), { selectable: false })
const emit = defineEmits<{ select: [key: string | null] }>()

// Selects the row's slice, or clears the selection when it is the selected one
const onRowClick = (event: MouseEvent, key: string) => {
  if (!props.selectable || (event.target as HTMLElement).closest('a')) return
  emit('select', props.selected === key ? null : key)
}
</script>

<template>
  <ul class="share-list">
    <li
      v-for="row in rows"
      :key="row.key"
      class="share-row"
      :class="{ 'is-selected': selected === row.key, 'is-clickable': selectable }"
      @click="onRowClick($event, row.key)"
    >
      <span class="share-name">
        <span class="dot" :style="{ background: row.color }" aria-hidden="true" />
        <NuxtLink v-if="row.to" class="share-link" :to="row.to">{{ row.label }}</NuxtLink>
        <span v-else>{{ row.label }}</span>
      </span>
      <span class="share-value">{{ row.value }}</span>
      <span class="share-pct">{{ row.pct }}%</span>
    </li>
    <li
      class="share-row share-row-free"
      :class="{ 'is-selected': selected === rest.key, 'is-clickable': selectable }"
      @click="onRowClick($event, rest.key)"
    >
      <span class="share-name">
        <span class="dot dot-free" aria-hidden="true" />
        <span class="share-free">Not planned</span>
      </span>
      <span class="share-value">{{ rest.value }}</span>
      <span class="share-pct">{{ rest.pct }}%</span>
    </li>
  </ul>
</template>
