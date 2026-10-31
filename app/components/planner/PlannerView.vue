<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { DESIGN_COLORS } from '~/utils/planner'
import { focusEditField } from '~/utils/focus'

const planner = usePlannerStore()
const { activeTemplate, templates } = storeToRefs(planner)
const { item, edit, setSelection } = useNav()
const { fill } = usePlannerFill()

// ── Template switcher ──
const renamingId = ref<string | null>(null)
const templateEditOpen = ref(false)
const templateEditButton = ref<{ focus: () => void } | null>(null)
const colorPickerFor = ref<string | null>(null)
const newTemplateOpen = ref(false)
const newTemplateTrigger = ref<HTMLButtonElement | null>(null)
const yearPainter = ref<{ openFor: (templateId: string) => void } | null>(null)

// ── Computed ──
// The paint colour of a template: the same fill on the year grid, in the paint tools and in the switcher
const templateFill = (t: typeof templates.value[0]) => fill(t.color ?? '#5d6b7a')

// ── Template management ──
// Done and Escape close the week type edit panel; focus returns to its Edit button (FR-UX-2)
function closeTemplateEdit() {
  templateEditOpen.value = false
  nextTick(() => templateEditButton.value?.focus())
}

// One item in edit mode per screen (PRD 11.2): opening the week type editor leaves an open activity editor
watch(templateEditOpen, (open) => {
  if (open && edit.value) setSelection({ item: item.value ?? undefined }, true)
})

function openNewTemplate() {
  newTemplateOpen.value = true
}

// Double-click renames a week type; the name field takes focus on a desktop, a phone keeps the keyboard down
function startRename(templateId: string) {
  renamingId.value = templateId
  nextTick(() => focusEditField(document.querySelector<HTMLElement>('.pill-input'), null))
}

function closeNewTemplate() {
  newTemplateOpen.value = false
  nextTick(() => newTemplateTrigger.value?.focus())
}

// The week type is made: the panel closes, and a time-off one opens the year with it chosen
function onTemplateCreated(templateId: string, kind?: 'break') {
  newTemplateOpen.value = false
  if (kind === 'break') yearPainter.value?.openFor(templateId)
}

</script>

<template>
  <div class="view" @click="colorPickerFor = null">
    <!-- Page header -->
    <header class="page-head">
      <h1 class="page-title">Week</h1>
    </header>

    <!-- Template switcher -->
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

      <EditButton v-if="activeTemplate" ref="templateEditButton" label="Edit week type" :expanded="templateEditOpen" @click="templateEditOpen = !templateEditOpen" />
    </div>

    <PlannerNewWeekTypePanel v-if="newTemplateOpen" @close="closeNewTemplate" @created="onTemplateCreated" />

    <PlannerWeekTypeEditPanel :open="templateEditOpen" @close="closeTemplateEdit" />

    <!-- Week grid: the original range-select grid, with its action bar and menu teleported to the body -->
    <!-- Client only: the grid is state-driven, and server HTML would keep the seed cells after hydration -->
    <ClientOnly>
      <PlannerActivityGrid />
    </ClientOnly>

    <PlannerEntryList @form-open="templateEditOpen = false" />

    <YearPainter ref="yearPainter" />
  </div>
</template>
