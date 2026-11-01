<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { DESIGN_COLORS } from '~/utils/planner/templates'
import type { Category } from '~/types/planner'

// The edit form of a life area (edit mode of HaradaCategoryDetail): name, colour, 5-year goal, 1-year target. Edits apply at once (FR-UX-6)
const props = defineProps<{ category: Category }>()

const planner = usePlannerStore()

// ── Name draft: an empty name is refused and its message stays until a valid one; leaving it restores the stored name
const nameDraft = ref(props.category.name)
const nameError = ref('')

function onNameInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  nameDraft.value = value

  if (value.trim()) {
    planner.updateCategory(props.category.id, { name: value.trim() })
    nameError.value = ''
  } else {
    nameError.value = 'Name can\'t be empty'
  }
}

function onNameBlur() {
  nameDraft.value = props.category.name
}
</script>

<template>
  <section class="detail-block">
    <div class="form-stack">
      <div class="field">
        <label class="field-label" for="cat-edit-name">Name</label>
        <input
          id="cat-edit-name"
          class="timely-input"
          :value="nameDraft"
          :aria-invalid="!!nameError"
          aria-describedby="cat-edit-name-error"
          @input="onNameInput"
          @blur="onNameBlur"
        />
        <p v-if="nameError" id="cat-edit-name-error" class="field-error">{{ nameError }}</p>
      </div>

      <div class="field">
        <span class="field-label">Colour</span>
        <div class="color-pop color-pop-inline">
          <button
            v-for="dc in DESIGN_COLORS"
            :key="dc.id"
            type="button"
            :style="{ background: dc.bg }"
            :data-active="category.color === dc.bg"
            :aria-label="`Colour ${dc.id}`"
            @click="planner.setCategoryColor(category.id, dc.bg)"
          />
        </div>
      </div>
    </div>
  </section>

  <section class="detail-block">
    <div class="form-stack">
      <AutoTextarea
        :model-value="category.goal5y ?? ''"
        label="5-year goal"
        @update:model-value="planner.updateCategory(category.id, { goal5y: $event })"
      />

      <AutoTextarea
        :model-value="category.target1y ?? ''"
        label="1-year target"
        @update:model-value="planner.updateCategory(category.id, { target1y: $event })"
      />

      <label class="check">
        <input
          type="checkbox"
          :checked="!!category.targetTbd"
          @change="planner.updateCategory(category.id, { targetTbd: ($event.target as HTMLInputElement).checked })"
        />
        Target still to be defined
      </label>
    </div>
  </section>
</template>

<style scoped>
.detail-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 24px;
  font-size: var(--fs-sm);
  color: var(--ink-2);
  cursor: pointer;
}

.check input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--accent);
}
</style>
