<script setup lang="ts">
import type { Category } from '~/types/planner'
import { usePlannerStore } from '~/stores/planner'
import { categoryEntryCounts, categoryEntryText } from '~/utils/entries'
import { hasContentArea, targetStatus } from '~/utils/goals'

/**
 * The life areas list of Goals (FR-GOALS-25, FR-GOALS-15): every life area is listed, empty or not. A row shows whether its
 * 1-year target is set and its entries as the detail lists them. An area with nothing in it yet also offers "Add a goal",
 * which opens the detail in edit mode (the parent does that). Arrow keys move between rows. Selecting keeps the list position (FR-UX-8)
 */
defineProps<{ categories: Category[]; selectedId: string | null | undefined }>()
const emit = defineEmits<{ open: [id: string]; 'add-goal': [id: string] }>()

const planner = usePlannerStore()
const listEl = ref<HTMLUListElement | null>(null)

const entryStatus = (category: Category) => categoryEntryText(categoryEntryCounts(planner.$state, category.id))

function onListKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

  const rows = [...(listEl.value?.querySelectorAll<HTMLButtonElement>('.cat-row') ?? [])]
  const index = rows.indexOf(event.target as HTMLButtonElement)
  if (index === -1) return

  event.preventDefault()
  rows[event.key === 'ArrowDown' ? index + 1 : index - 1]?.focus()
}
</script>

<template>
  <ul ref="listEl" class="cat-list" @keydown="onListKeydown">
    <li v-for="category in categories" :key="category.id">
      <div class="cat-item">
        <button
          type="button"
          class="cat-row"
          :data-category-id="category.id"
          :aria-current="selectedId === category.id ? 'true' : undefined"
          @click="emit('open', category.id)"
        >
          <span class="dot dot-lg" :style="{ background: category.color ?? '#888' }" aria-hidden="true" />
          <span class="cat-main">
            <span class="cat-row-name">{{ category.name }}</span>
            <span class="cat-meta">
              <span :class="{ 'is-warn': targetStatus(category).warn }">{{ targetStatus(category).text }}</span>
              <span aria-hidden="true"> · </span>
              <span>{{ entryStatus(category) }}</span>
            </span>
          </span>
        </button>

        <!-- An area with nothing in it yet: a quiet way to add its goal, which opens the detail in edit mode -->
        <button
          v-if="!hasContentArea(planner.$state, category)"
          type="button"
          class="chip-add cat-add-goal"
          :aria-label="`Add a goal to ${category.name}`"
          @click="emit('add-goal', category.id)"
        >Add a goal</button>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.cat-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.cat-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--rule-2);
  color: var(--ink);
  text-align: left;
  transition: background 0.12s;
}

.cat-row:hover {
  background: var(--bg-3);
}

.cat-row[aria-current="true"] {
  background: var(--bg-4);
  box-shadow: inset 3px 0 0 var(--accent);
}

/* The dot sits on the first line of the name, whatever the height of the row */
.cat-row > .dot { margin-top: 3px; }

.cat-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

/* One row per life area: the name row and, for an area with nothing in it yet, the quiet Add a goal control share one hairline */
.cat-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-bottom: 1px solid var(--rule-2);
}

.cat-item > .cat-row {
  flex: 1;
  min-width: 0;
  border-bottom: none;
}

.cat-add-goal {
  flex-shrink: 0;
  margin-right: var(--space-3);
}

/* Names, statuses and entry counts wrap: the list row grows with its text, nothing is cut off */
.cat-row-name {
  overflow-wrap: anywhere;
  font-size: var(--fs-md);
  font-weight: 500;
}

.cat-meta {
  font-size: var(--fs-xs);
  color: var(--ink-3);
  overflow-wrap: anywhere;
}

.cat-meta.is-warn {
  color: var(--warn);
}

/* On the tinted selected row, secondary text uses --ink-2 (contrast on bg-4) */
.cat-row[aria-current="true"] .cat-meta {
  color: var(--ink-2);
}
</style>
