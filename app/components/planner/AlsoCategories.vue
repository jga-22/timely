<script setup lang="ts">
import type { Category } from '~/types/planner'

/**
 * Secondary categories of an activity (PRD FR-PLAN-20): the activity is also listed under these in Goals.
 * The primary category is never offered here; it is chosen in the Category select above.
 */
const props = defineProps<{ modelValue: string[]; categories: Category[]; primaryId: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const options = computed(() => props.categories.filter(category => category.id !== props.primaryId))

const toggle = (categoryId: string, checked: boolean) => {
  emit('update:modelValue', checked
    ? [...props.modelValue, categoryId]
    : props.modelValue.filter(id => id !== categoryId))
}
</script>

<template>
  <fieldset v-if="options.length" class="also-field">
    <legend class="field-label">Also counts toward</legend>
    <div class="check-row">
      <label v-for="category in options" :key="category.id" class="check">
        <input
          type="checkbox"
          :checked="modelValue.includes(category.id)"
          @change="toggle(category.id, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ category.name }}</span>
      </label>
    </div>
  </fieldset>
</template>
