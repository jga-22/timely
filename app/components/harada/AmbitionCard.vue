<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { horizonText } from '~/utils/goals'

/**
 * The ambition at the top of Goals (FR-GOALS-13): the only place it is edited. Without one, the prompt writes the first one
 * (Start empty); with one, the view takes over: Edit applies at once, Done leaves. Edit mode is local: one field, one edit at a time.
 * Done and Escape return focus to Edit. `editing` is the parent's flag: the parent ends a life area edit when this one opens
 */
const planner = usePlannerStore()
const { ambition } = storeToRefs(planner)
const horizon = computed(() => horizonText(ambition.value))
const editing = defineModel<boolean>('editing', { default: false })

// A new user has no ambition yet (Start empty): the prompt writes the first one, and the view takes over once it exists
const newAmbition = ref('')

function saveNewAmbition() {
  planner.setAmbition(newAmbition.value)
  newAmbition.value = ''
}

const visionEditButton = ref<HTMLButtonElement | null>(null)

function startVisionEdit() {
  editing.value = true
}

function finishVisionEdit() {
  editing.value = false
  nextTick(() => visionEditButton.value?.focus())
}

function onVisionKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !editing.value) return

  event.stopPropagation()
  finishVisionEdit()
}
</script>

<template>
  <section v-if="!ambition" class="vision vision-new">
    <div class="vision-head">
      <h2 class="section-title">Ambition, {{ horizon }}</h2>
    </div>

    <form class="vision-form" @submit.prevent="saveNewAmbition">
      <AutoTextarea
        v-model="newAmbition"
        label="Write your 5-year ambition"
        placeholder="For example, be a present father and run a half marathon"
        class="vision-input"
      />
      <div class="vision-actions">
        <button type="submit" class="btn btn-sm btn-primary" :disabled="!newAmbition.trim()">Save ambition</button>
      </div>
    </form>
  </section>

  <section v-else class="vision" @keydown="onVisionKeydown">
    <div class="vision-head">
      <h2 class="section-title">Ambition, {{ horizon }}</h2>
      <EditButton v-if="!editing" ref="visionEditButton" label="Edit ambition" @click="startVisionEdit" />
      <button v-else type="button" class="btn btn-sm btn-primary" @click="finishVisionEdit">Done</button>
    </div>

    <p v-if="!editing" class="vision-statement" :class="{ 'is-empty': !ambition.statement }">
      {{ ambition.statement || 'No ambition written yet.' }}
    </p>
    <AutoTextarea
      v-else
      :model-value="ambition.statement"
      label="Ambition statement"
      class="vision-input"
      @update:model-value="planner.updateAmbition({ statement: $event })"
    />
  </section>
</template>

<style scoped>
.vision-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.vision-head .section-title {
  margin: 0;
}

.vision-statement {
  max-width: 44em;
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: 500;
  line-height: 1.45;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.vision-statement.is-empty {
  font-weight: 400;
  color: var(--ink-3);
}

.vision-input {
  max-width: 720px;
}

.vision-actions {
  margin-top: var(--space-3);
}
</style>
