<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { DESIGN_COLORS } from '~/utils/planner/templates'

/**
 * The Edit week type panel (FR-UX-2): name, colour, time off, and the delete of the active week type, with changes applied at once.
 * Delete asks first in an inline confirmation (FR-TPL-5, FR-UX-7). The switcher keeps this component mounted, so a confirmation that is
 * open stays open when the panel closes, as before. Done and Escape emit close; the parent returns focus to the Edit button.
 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const planner = usePlannerStore()
const { activeTemplate, templates, appliedWeeks } = storeToRefs(planner)

// Inline confirmation (FR-TPL-5, FR-UX-7): nothing is deleted before the second button
const deletingTemplate = ref(false)
const deleteTemplateTrigger = ref<HTMLButtonElement | null>(null)
const cancelTemplateDeleteButton = ref<HTMLButtonElement | null>(null)

const templateDeleteText = computed(() => {
  const template = activeTemplate.value
  if (!template) return ''

  const weeksUsing = appliedWeeks.value.filter(week => week.templateId === template.id).length
  const weekText = weeksUsing
    ? `${weeksUsing === 1 ? '1 assigned week becomes' : `${weeksUsing} assigned weeks become`} unassigned.`
    : 'No week uses it.'

  return `Delete "${template.name}"? ${weekText} This cannot be undone.`
})

watch(() => activeTemplate.value?.id, () => {
  deletingTemplate.value = false
})

function askDeleteTemplate() {
  deletingTemplate.value = true
  nextTick(() => cancelTemplateDeleteButton.value?.focus())
}

function cancelDeleteTemplate() {
  deletingTemplate.value = false
  nextTick(() => deleteTemplateTrigger.value?.focus())
}

function confirmDeleteActiveTemplate() {
  const template = activeTemplate.value
  if (!template || templates.value.length <= 1) return
  planner.deleteTemplate(template.id)
  deletingTemplate.value = false
}
</script>

<template>
  <div v-if="props.open && activeTemplate" class="act-panel template-edit" @keydown.escape.stop="emit('close')">
    <div class="act-panel-head">
      <h3 class="act-panel-title">Edit week type</h3>
      <button type="button" class="btn btn-sm btn-primary" @click="emit('close')">Done</button>
    </div>
    <div class="form-stack">
      <div class="field">
        <label class="field-label" for="template-edit-name">Name</label>
        <input
          id="template-edit-name"
          class="timely-input"
          :value="activeTemplate.name"
          @change="planner.renameTemplate(activeTemplate.id, ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="field">
        <span class="field-label">Colour</span>
        <div class="color-pop color-pop-inline">
          <button
            v-for="col in DESIGN_COLORS"
            :key="col.id"
            type="button"
            :style="{ background: col.bg }"
            :data-active="activeTemplate.color === col.bg"
            :aria-label="`Colour ${col.id}`"
            @click="planner.setTemplateColor(activeTemplate.id, col.bg)"
          />
        </div>
      </div>
      <div class="field">
        <label class="check">
          <input
            type="checkbox"
            :checked="activeTemplate.kind === 'break'"
            @change="planner.setTemplateKind(activeTemplate.id, ($event.target as HTMLInputElement).checked ? 'break' : undefined)"
          />
          Time off: Goals reads its hours from a working week type
        </label>
      </div>
      <div v-if="templates.length > 1" class="form-actions">
        <button ref="deleteTemplateTrigger" type="button" class="btn btn-sm btn-danger" @click="askDeleteTemplate">Delete week type</button>
      </div>
    </div>
  </div>

  <div
    v-if="deletingTemplate"
    class="act-confirm template-confirm"
    role="group"
    aria-labelledby="template-delete-text"
    @keydown.escape.stop="cancelDeleteTemplate"
  >
    <p id="template-delete-text" class="act-confirm-text">{{ templateDeleteText }}</p>
    <div class="act-actions">
      <button type="button" class="btn btn-sm btn-danger" @click="confirmDeleteActiveTemplate">Delete week type</button>
      <button ref="cancelTemplateDeleteButton" type="button" class="btn btn-sm" @click="cancelDeleteTemplate">Cancel</button>
    </div>
  </div>
</template>
