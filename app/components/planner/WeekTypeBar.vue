<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { DESIGN_COLORS } from '~/utils/planner'
import { focusEditField } from '~/utils/focus'
import type { WeekTemplate } from '~/types/planner'

/**
 * The week type bar of the Week tab: the switcher chips (click to select, double-click to rename, the dot opens a colour pop),
 * "+ New week type" and the Edit week type button. It hosts the New week type panel and the Edit panel. editOpen is the Edit panel's
 * open state (v-model:editOpen); created reports a new week type, and opened that the New week type panel opened.
 */
const editOpen = defineModel<boolean>('editOpen', { required: true })
const emit = defineEmits<{ created: [templateId: string], opened: [] }>()

const planner = usePlannerStore()
const { activeTemplate, templates } = storeToRefs(planner)
const { fill } = usePlannerFill()

const renamingId = ref<string | null>(null)
const colorPickerFor = ref<string | null>(null)
const newTemplateOpen = ref(false)
const newTemplateTrigger = ref<HTMLButtonElement | null>(null)
const templateEditButton = ref<{ focus: () => void } | null>(null)

// The paint colour of a template: the same fill on the year grid, in the paint tools and in the switcher
const templateFill = (t: WeekTemplate) => fill(t.color ?? '#5d6b7a')

// A click anywhere else closes an open colour pop. The dot and the pop stop their own clicks, so only the other clicks reach this
const closeColorPop = () => {
  colorPickerFor.value = null
}
onMounted(() => document.addEventListener('click', closeColorPop))
onBeforeUnmount(() => document.removeEventListener('click', closeColorPop))

// Double-click renames a week type; the name field takes focus on a desktop, a phone keeps the keyboard down
function startRename(templateId: string) {
  renamingId.value = templateId
  nextTick(() => focusEditField(document.querySelector<HTMLElement>('.pill-input'), null))
}

function openNewTemplate() {
  newTemplateOpen.value = true
  emit('opened')
}

function closeNewTemplate() {
  newTemplateOpen.value = false
  nextTick(() => newTemplateTrigger.value?.focus())
}

function onTemplateCreated(templateId: string) {
  newTemplateOpen.value = false
  emit('created', templateId)
}

// Done and Escape close the week type edit panel; focus returns to its Edit button (FR-UX-2)
function closeEdit() {
  editOpen.value = false
  nextTick(() => templateEditButton.value?.focus())
}
</script>

<template>
  <div class="template-switch">
    <span class="field-label">Week type</span>

    <div v-for="t in templates" :key="t.id" class="template-chip-wrap">
      <input
        v-if="renamingId === t.id"
        class="pill-input"
        :value="t.name"
        @blur="(e) => { planner.renameActiveTemplate((e.target as HTMLInputElement).value.trim() || t.name); renamingId = null }"
        @keydown.enter="(e) => { planner.renameActiveTemplate((e.target as HTMLInputElement).value.trim() || t.name); renamingId = null }"
        @keydown.escape="renamingId = null"
      />
      <button
        v-else
        class="chip"
        :data-active="t.id === activeTemplate?.id"
        title="Click to select, double-click to rename"
        @click="planner.selectTemplate(t.id)"
        @dblclick="startRename(t.id)"
      >
        <span
          class="dot dot-action"
          :style="{ background: templateFill(t) }"
          title="Change colour"
          @click.stop="colorPickerFor = colorPickerFor === t.id ? null : t.id"
        />
        <span class="t-name">{{ t.name }}</span>
        <span class="pill-count">{{ t.slots.filter(Boolean).length }}h</span>
      </button>

      <div v-if="colorPickerFor === t.id" class="color-pop" @click.stop>
        <button
          v-for="col in DESIGN_COLORS"
          :key="col.id"
          :style="{ background: col.bg }"
          :data-active="t.color === col.bg"
          :aria-label="`Colour ${col.id}`"
          @click="planner.setTemplateColor(t.id, col.bg); colorPickerFor = null"
        />
      </div>
    </div>

    <button v-if="!newTemplateOpen" ref="newTemplateTrigger" class="chip-add" @click="openNewTemplate">+ New week type</button>

    <EditButton v-if="activeTemplate" ref="templateEditButton" label="Edit week type" :expanded="editOpen" @click="editOpen = !editOpen" />
  </div>

  <!-- New week type: a name and a Start from choice (empty, a copy, or a preset with its role mapping) -->
  <PlannerNewWeekTypePanel v-if="newTemplateOpen" @close="closeNewTemplate" @created="onTemplateCreated" />

  <!-- Template edit: name, colour and delete for the active template; changes apply at once (FR-UX-2) -->
  <PlannerWeekTypeEditPanel :open="editOpen" @close="closeEdit" />
</template>
