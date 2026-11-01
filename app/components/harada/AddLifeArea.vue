<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { focusEditField } from '~/utils/focus'
import { DESIGN_COLORS } from '~/utils/planner/templates'

/**
 * Add a life area: progressive disclosure under the list (FR-GOALS-19). The form opens in place of "+ Add life area";
 * Cancel and Escape return focus to it. A created life area is reported (created), and the parent opens it in edit mode (FR-GOALS-20)
 */
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [id: string] }>()

const planner = usePlannerStore()
const addName = ref('')
const addColor = ref(DESIGN_COLORS[0]!.bg)
const addError = ref('')
const addTrigger = ref<HTMLButtonElement | null>(null)
const addNameInput = ref<HTMLInputElement | null>(null)
const addPanel = ref<HTMLFormElement | null>(null)

function openAdd() {
  addName.value = ''
  addColor.value = DESIGN_COLORS[0]!.bg
  addError.value = ''
  open.value = true
  nextTick(() => focusEditField(addNameInput.value, addPanel.value))
}

function closeAdd() {
  open.value = false
  nextTick(() => addTrigger.value?.focus())
}

function submitAdd() {
  if (!addName.value.trim()) {
    addError.value = 'Name can\'t be empty'
    return
  }

  const id = planner.addCategory(addName.value, addColor.value)
  if (!id) return

  open.value = false
  emit('created', id)
}
</script>

<template>
  <div class="add-category">
    <button v-if="!open" ref="addTrigger" type="button" class="chip-add" @click="openAdd">+ Add life area</button>

    <form v-else ref="addPanel" class="form-stack" tabindex="-1" @submit.prevent="submitAdd" @keydown.escape="closeAdd">
      <div class="field">
        <label class="field-label" for="new-category-name">Name</label>
        <input
          id="new-category-name"
          ref="addNameInput"
          v-model="addName"
          class="timely-input"
          placeholder="e.g. Wellness"
          :aria-invalid="!!addError"
          aria-describedby="new-category-error"
          @input="addError = ''"
        />
        <p v-if="addError" id="new-category-error" class="field-error">{{ addError }}</p>
      </div>

      <div class="field">
        <span class="field-label">Colour</span>
        <div class="color-pop color-pop-inline">
          <button
            v-for="dc in DESIGN_COLORS"
            :key="dc.id"
            type="button"
            :style="{ background: dc.bg }"
            :data-active="addColor === dc.bg"
            :aria-label="`Colour ${dc.id}`"
            @click="addColor = dc.bg"
          />
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-sm btn-primary">Add life area</button>
        <button type="button" class="btn btn-sm" @click="closeAdd">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.add-category {
  margin-top: var(--space-4);
}

.add-category .form-stack {
  padding-top: var(--space-2);
}
</style>
