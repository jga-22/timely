<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { removeLifeAreaText } from '~/utils/goals'
import type { Category } from '~/types/planner'

// The edit mode footer of a life area (HaradaCategoryDetail): move up or down, and remove with an inline confirmation that names the impact.
// Contents move first (FR-UX-7, FR-GOALS-17)
const props = defineProps<{
  categoryId: string
  name: string
  isFirst: boolean
  isLast: boolean
  activityCount: number
  habitCount: number
  otherCategories: Category[]
}>()
const emit = defineEmits<{ removed: [] }>()

const planner = usePlannerStore()

const removing = ref(false)
const moveToId = ref('')
const removeTrigger = ref<HTMLButtonElement | null>(null)
const cancelRemoveButton = ref<HTMLButtonElement | null>(null)

const hasContent = computed(() => props.activityCount > 0 || props.habitCount > 0)

const removeText = computed(() => removeLifeAreaText({
  name: props.name,
  activities: props.activityCount,
  habits: props.habitCount,
  otherCount: props.otherCategories.length
}))

function askRemove() {
  moveToId.value = props.otherCategories[0]?.id ?? ''
  removing.value = true
  nextTick(() => cancelRemoveButton.value?.focus())
}

function cancelRemove() {
  removing.value = false
  nextTick(() => removeTrigger.value?.focus())
}

function confirmRemove() {
  const target = hasContent.value ? moveToId.value : undefined
  if (!planner.removeCategory(props.categoryId, target)) return

  removing.value = false
  emit('removed')
}

// Escape closes an open confirmation; returns whether it did
function closeConfirm(): boolean {
  if (!removing.value) return false

  cancelRemove()
  return true
}

// Done leaves edit mode at once, so an open confirmation closes with it
function reset() {
  removing.value = false
}

defineExpose({ closeConfirm, reset })
</script>

<template>
  <section class="detail-block detail-manage">
    <div class="form-actions">
      <button type="button" class="btn btn-sm" :disabled="isFirst" @click="planner.moveCategory(categoryId, -1)">Move up</button>
      <button type="button" class="btn btn-sm" :disabled="isLast" @click="planner.moveCategory(categoryId, 1)">Move down</button>
    </div>

    <button v-if="!removing" ref="removeTrigger" type="button" class="btn btn-sm btn-danger detail-remove" @click="askRemove">
      Remove life area
    </button>

    <div v-else class="inline-confirm" role="group" aria-label="Confirm remove life area">
      <p class="inline-confirm-text">{{ removeText }}</p>
      <div class="form-actions">
        <template v-if="!hasContent || otherCategories.length">
          <select
            v-if="hasContent"
            v-model="moveToId"
            class="timely-select"
            aria-label="Move contents to"
          >
            <option v-for="other in otherCategories" :key="other.id" :value="other.id">{{ other.name }}</option>
          </select>
          <button type="button" class="btn btn-sm btn-danger" :disabled="hasContent && !moveToId" @click="confirmRemove">
            {{ hasContent ? 'Move and remove' : 'Remove' }}
          </button>
        </template>
        <button ref="cancelRemoveButton" type="button" class="btn btn-sm" @click="cancelRemove">Cancel</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.detail-manage {
  padding-top: var(--space-5);
  border-top: 1px solid var(--rule-2);
}

.detail-remove {
  align-self: flex-start;
}
</style>
