<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { isSleepActivity } from '~/utils/sleep'
import { focusEditById } from '~/utils/focus'

// The detail of one life area (Goals): its name and mode, the view of its goal and target, and the edit mode's pieces. The form, the
// entry list and the footer are their own components; this shell holds the selection and the mode
const props = defineProps<{ categoryId: string; editing: boolean }>()
const emit = defineEmits<{ back: [] }>()

const planner = usePlannerStore()
const { categories } = storeToRefs(planner)
const { setSelection } = useNav()

const sortedCategories = computed(() => [...categories.value].sort((a, b) => a.order - b.order))
const category = computed(() => categories.value.find(entry => entry.id === props.categoryId))
const position = computed(() => sortedCategories.value.findIndex(entry => entry.id === props.categoryId))
const isFirst = computed(() => position.value <= 0)
const isLast = computed(() => position.value === sortedCategories.value.length - 1)
const otherCategories = computed(() => sortedCategories.value.filter(entry => entry.id !== props.categoryId))

// Sleep is not shown in a life area's lists or counts (FR-SLEEP-6)
const activityCount = computed(() => planner.activities.filter(activity => activity.categoryId === props.categoryId && !isSleepActivity(activity)).length)
const habitCount = computed(() => planner.habits.filter(habit => habit.categoryId === props.categoryId).length)

// ── Mode changes live in the URL (FR-UX-5); Done replaces the entry and returns focus to Edit
const editButton = ref<HTMLButtonElement | null>(null)
const manage = ref<{ closeConfirm: () => boolean; reset: () => void } | null>(null)

function startEdit() {
  setSelection({ item: props.categoryId, edit: true }).then(() => nextTick(() => focusEditById('cat-edit-name', 'cat-detail')))
}

function finishEdit() {
  manage.value?.reset()
  setSelection({ item: props.categoryId }, true).then(() => nextTick(() => editButton.value?.focus()))
}

// Escape closes a removal confirmation first, otherwise leaves edit mode
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return

  if (manage.value?.closeConfirm()) {
    event.stopPropagation()
  } else if (props.editing) {
    event.stopPropagation()
    finishEdit()
  }
}

function onRemoved() {
  setSelection({}, true)
}
</script>

<template>
  <div v-if="category" id="cat-detail" class="detail" tabindex="-1" @keydown="onKeydown">
    <div class="detail-head">
      <button type="button" class="btn btn-sm detail-back" @click="emit('back')">
        <svg class="detail-back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back to life areas
      </button>
      <div class="detail-title">
        <h3 class="detail-name">
          <span class="dot dot-lg" :style="{ background: category.color ?? '#888' }" aria-hidden="true" />
          {{ category.name }}
        </h3>
        <EditButton v-if="!editing" ref="editButton" :label="`Edit ${category.name}`" @click="startEdit" />
        <button v-else type="button" class="btn btn-sm btn-primary" @click="finishEdit">Done</button>
      </div>
    </div>

    <!-- View mode: read-only. The 5-year goal and the 1-year target, then the entries -->
    <template v-if="!editing">
      <section class="detail-block">
        <h4 class="detail-label">5-year goal</h4>
        <p class="detail-text" :class="{ 'is-empty': !category.goal5y }">{{ category.goal5y || 'Not written yet.' }}</p>
      </section>

      <section class="detail-block">
        <h4 class="detail-label">1-year target</h4>
        <p v-if="category.targetTbd" class="detail-flag">To define</p>
        <p class="detail-text" :class="{ 'is-empty': !category.target1y }">{{ category.target1y || 'Not written yet.' }}</p>
      </section>
    </template>

    <!-- Edit mode: fields apply at once; Done leaves. The list below is the same in both modes -->
    <HaradaCategoryEditFields v-else :category="category" />

    <HaradaCategoryEntryList :category-id="category.id" :editing="editing" />

    <HaradaCategoryManage
      v-if="editing"
      ref="manage"
      :category-id="category.id"
      :name="category.name"
      :is-first="isFirst"
      :is-last="isLast"
      :activity-count="activityCount"
      :habit-count="habitCount"
      :other-categories="otherCategories"
      @removed="onRemoved"
    />
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

.detail-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

/* Back to categories sits on its own line above the title at every size (FR-GOALS-16, FR-UX-8) */
.detail-back-icon {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  width: 100%;
  min-width: 0;
}

.detail-name {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: 600;
  line-height: 1.3;
}

.detail-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.detail-label {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--ink-2);
}

.detail-text {
  margin: 0;
  font-size: var(--fs-md);
  line-height: 1.6;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.detail-text.is-empty {
  color: var(--ink-3);
}

.detail-flag {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--warn);
}

.row-confirm {
  display: inline-flex;
  gap: var(--space-2);
}
</style>
