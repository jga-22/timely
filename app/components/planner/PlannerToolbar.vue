<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'

type TabId = 'planner' | 'insights' | 'schedule' | 'setup'

const activeTab = defineModel<TabId>('activeTab', { required: true })

const planner = usePlannerStore()

const tabs: Array<{ id: TabId, label: string }> = [
  { id: 'planner', label: 'Planner' },
  { id: 'insights', label: 'Insights' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'setup', label: 'Legend' }
]

const templateOptions = computed(() =>
  planner.templates.map(template => ({ id: template.id, name: template.name }))
)
</script>

<template>
  <section class="toolbar panel">
    <div class="tab-row">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        type="button"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="template-row">
      <select
        :value="planner.activeTemplate?.id ?? ''"
        @change="planner.selectTemplate(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in templateOptions" :key="option.id" :value="option.id">
          {{ option.name }}
        </option>
      </select>
      <button type="button" @click="planner.createTemplate()">New</button>
      <button type="button" @click="planner.duplicateTemplate(planner.activeTemplate?.id ?? '')">Duplicate</button>
      <button type="button" @click="planner.clearActiveTemplate()">Clear</button>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.toolbar {
  display: grid;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

.tab-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.template-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-button,
.template-row button,
.template-row select {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.6rem 1rem;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--surface-strong);
  color: var(--text-main);
  cursor: pointer;
  font: inherit;
  white-space: nowrap;
}

.tab-button.active {
  background: var(--accent);
  border-color: transparent;
  color: white;
}

.template-row select {
  min-width: 200px;
  padding-right: 1.5rem;
}

@media (max-width: 780px) {
  .tab-row,
  .template-row {
    flex-direction: column;
    align-items: stretch;
  }

  .template-row select {
    min-width: unset;
  }
}
</style>
