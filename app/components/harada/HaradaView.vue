<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Category } from '~/types/planner'
import { usePlannerStore } from '~/stores/planner'
import { focusEditById } from '~/utils/focus'
import { mapCells } from '~/utils/goals'

const planner = usePlannerStore()
const { ambition, categories } = storeToRefs(planner)
const { item, edit, setSelection } = useNav()

const sortedCategories = computed(() => [...categories.value].sort((a, b) => a.order - b.order))
const cells = computed(() => mapCells(categories.value))

// The category named in the URL; an id that does not exist selects nothing (FR-UX-5).
// Nothing selected shows the list alone on phones and a placeholder beside it on desktop; Close returns to that state
const selected = computed<Category | null>(() => sortedCategories.value.find(category => category.id === item.value) ?? null)
const editing = computed(() => !!selected.value && edit.value)

// ── List or Grid (FR-GOALS-26): the Harada map is an opt-in view from 1100px; the list is the default and the only view below it.
// The choice lasts for the session (useState), not the saved state
const view = useState<'list' | 'grid'>('goals-view', () => 'list')
const gridView = computed(() => view.value === 'grid')

// ── Ambition (HaradaAmbitionCard) and its edit flag. Only one item is in edit mode: the ambition opening ends a life area edit
const visionEditing = ref(false)

watch(visionEditing, (value) => {
  if (value && editing.value && selected.value) setSelection({ item: selected.value.id }, true)
})

watch(edit, (value) => {
  if (value) visionEditing.value = false
})

watch(item, () => {
  visionEditing.value = false
})

// ── Selection: the map and the list share one selected category (FR-GOALS-14, FR-GOALS-15)
let listScroll = 0
let lastOpened: string | null = null

// Selecting keeps the list position, so Back to list returns to it (FR-UX-8)
function openCategory(categoryId: string) {
  lastOpened = categoryId
  listScroll = window.scrollY
  setSelection({ item: categoryId })
}

// "Add a goal" on an empty life area opens its detail in edit mode, with the name field focused (as Edit does)
function addGoal(categoryId: string) {
  lastOpened = categoryId
  listScroll = window.scrollY
  setSelection({ item: categoryId, edit: true }).then(() => nextTick(() => focusEditById('cat-edit-name', 'cat-detail')))
}

// The list is laid out after the route changes, so the scroll waits for the next frame
function backToList() {
  setSelection({}).then(() => nextTick(() => requestAnimationFrame(() => {
    window.scrollTo({ top: listScroll })
    document.querySelector<HTMLElement>(`[data-category-id="${lastOpened}"], [data-map-id="${lastOpened}"]`)?.focus({ preventScroll: true })
  })))
}

// ── Add life area (HaradaAddLifeArea): its open flag is here, for the Escape handler below
const addOpen = ref(false)

// The new life area opens selected in edit mode, with its name field focused
function onCreated(id: string) {
  setSelection({ item: id, edit: true }).then(() => nextTick(() => focusEditById('cat-edit-name', 'cat-detail')))
}

// Escape closes the open category. Inside a field, the ambition editor, the add form or edit mode it belongs to them
// (edit mode: Escape leaves edit mode first, see CategoryDetail)
function onWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !selected.value || editing.value || visionEditing.value || addOpen.value) return
  if ((event.target as HTMLElement | null)?.closest('input, textarea, select')) return

  backToList()
}

onMounted(() => window.addEventListener('keydown', onWindowKeydown))
onUnmounted(() => window.removeEventListener('keydown', onWindowKeydown))
</script>

<template>
  <div class="view harada-view" :data-selected="selected ? 'true' : 'false'">
    <header class="page-head">
      <h1 class="page-title">Goals</h1>
    </header>

    <div class="goals-top">
      <HaradaAmbitionCard v-model:editing="visionEditing" />

      <!-- List or Grid: the toggle shows from 1100px only; below it the list is the only view -->
      <div v-if="categories.length" class="goals-view-toggle">
        <div class="segmented" role="group" aria-label="Life areas view">
          <button type="button" :data-active="!gridView" :aria-pressed="!gridView" @click="view = 'list'">List</button>
          <button type="button" :data-active="gridView" :aria-pressed="gridView" @click="view = 'grid'">Grid</button>
        </div>
      </div>

      <HaradaMap
        v-if="categories.length && gridView"
        :cells="cells"
        :selected-id="selected?.id"
        :ambition="ambition"
        @select="openCategory"
      />
    </div>

    <div v-if="!categories.length" class="empty-state">
      <p>No goals yet. Start from the starter grid and adapt it.</p>
      <button type="button" class="btn btn-primary" @click="planner.seedHaradaGoals()">Load starter grid</button>
    </div>

    <!-- Categories: list on the left, the selected category's detail beside it (stacked on phones) -->
    <section v-else class="section browse" :class="{ 'is-grid': gridView }">
      <div class="browse-list">
        <HaradaLifeAreaList
          :categories="sortedCategories"
          :selected-id="selected?.id"
          @open="openCategory"
          @add-goal="addGoal"
        />

        <HaradaAddLifeArea v-model:open="addOpen" @created="onCreated" />
      </div>

      <div class="browse-detail">
        <HaradaCategoryDetail
          v-if="selected"
          :key="selected.id"
          :category-id="selected.id"
          :editing="editing"
          @back="backToList"
        />
        <p v-else class="browse-placeholder">Select a life area to see its goals, activities and habits.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Grid view: the map above, the selected life area's detail below it, the list hidden (the list stays below 1100px) */
.goals-view-toggle {
  display: none;
  margin: var(--space-4) 0;
}

@media (min-width: 1100px) {
  .goals-view-toggle { display: flex; }

  .browse.is-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .browse.is-grid .cat-list {
    display: none;
  }

  .browse.is-grid .browse-detail {
    padding-left: 0;
    border-left: none;
  }
}

/* Categories: list and detail side by side */
.browse {
  display: grid;
  grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
  gap: var(--space-7);
  align-items: start;
}

.browse-detail {
  min-width: 0;
  padding-left: var(--space-6);
  border-left: 1px solid var(--rule-2);
}

.browse-placeholder {
  margin: 0;
  font-size: var(--fs-md);
  color: var(--ink-3);
}

@media (max-width: 768px) {
  .browse {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
  }

  .browse-detail {
    padding-left: 0;
    border-left: none;
  }

  /* Phones: a selected category replaces the map and the list, with Back to list */
  .harada-view[data-selected="true"] .goals-top,
  .harada-view[data-selected="true"] .browse-list {
    display: none;
  }

  .harada-view[data-selected="false"] .browse-detail {
    display: none;
  }

}
</style>
