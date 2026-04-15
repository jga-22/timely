<script setup lang="ts">
import type { WeekTemplate } from '~/types/planner'

const props = defineProps<{
  activeTemplate: WeekTemplate | null | undefined
  templateOptions: Array<{ id: string, name: string }>
}>()

const emit = defineEmits<{
  selectTemplate: [templateId: string]
  createTemplate: []
  duplicateTemplate: []
  clearTemplate: []
  saveTemplateMeta: [payload: { name: string, description: string }]
}>()

const templateNameDraft = ref('')
const templateDescriptionDraft = ref('')

watch(() => props.activeTemplate, (template) => {
  templateNameDraft.value = template?.name ?? ''
  templateDescriptionDraft.value = template?.description ?? ''
}, { immediate: true })

const saveMeta = () => {
  emit('saveTemplateMeta', {
    name: templateNameDraft.value,
    description: templateDescriptionDraft.value
  })
}
</script>

<template>
  <div>
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Planner</p>
        <h2>Edit weekly template</h2>
        <p>Use recurring blocks for fast setup, then refine individual slots in the grid.</p>
      </div>

      <div class="inline-actions">
        <button class="button button-secondary" type="button" @click="emit('createTemplate')">New Template</button>
        <button class="button button-secondary" type="button" @click="emit('duplicateTemplate')">Duplicate</button>
        <button class="button button-secondary" type="button" @click="emit('clearTemplate')">Clear Week</button>
      </div>
    </div>

    <div class="template-toolbar">
      <label class="field">
        <span>Template</span>
        <select :value="activeTemplate?.id" @change="emit('selectTemplate', ($event.target as HTMLSelectElement).value)">
          <option v-for="template in templateOptions" :key="template.id" :value="template.id">
            {{ template.name }}
          </option>
        </select>
      </label>

      <label class="field field-wide">
        <span>Name</span>
        <input v-model="templateNameDraft" type="text" placeholder="Standard Week">
      </label>

      <label class="field field-wide">
        <span>Description</span>
        <input v-model="templateDescriptionDraft" type="text" placeholder="Describe this scenario">
      </label>

      <button class="button button-primary" type="button" @click="saveMeta()">Save Template Meta</button>
    </div>
  </div>
</template>

<style scoped>
.panel-heading,
.inline-actions,
.template-toolbar {
  display: flex;
  gap: 0.75rem;
}

.panel-heading {
  align-items: start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.inline-actions,
.template-toolbar {
  flex-wrap: wrap;
}

.template-toolbar {
  align-items: end;
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  color: var(--accent-strong);
}

h2,
p {
  margin-top: 0;
}

h2 {
  font-size: 1.3rem;
  margin-bottom: 0.3rem;
}

.panel-heading p,
.field span {
  color: var(--text-soft);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 150px;
}

.field-wide {
  flex: 1 1 220px;
}

.field span {
  font-size: 0.8rem;
}

.field input,
.field select {
  min-height: 2.75rem;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--surface-strong);
  padding: 0.7rem 0.85rem;
  color: var(--text-main);
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.8rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
}

.button-primary {
  background: var(--accent);
  color: white;
}

.button-secondary {
  background: var(--surface-strong);
  border-color: var(--panel-border);
  color: var(--text-main);
}
</style>
