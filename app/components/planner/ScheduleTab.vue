<script setup lang="ts">
import type { WeekStatus } from '~/types/planner'
import { formatWeekRange, generateWeekDates, getMondayDate } from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'

const planner = usePlannerStore()

const WEEK_COUNT = 16

const currentMonday = getMondayDate(new Date())

const weekDates = computed(() => generateWeekDates(currentMonday, WEEK_COUNT))

const weekMap = computed(() =>
  new Map(planner.appliedWeeks.map(week => [week.startDate, week]))
)

const templateOptions = computed(() =>
  planner.templates.map(t => ({ id: t.id, name: t.name }))
)

const statusOptions: Array<{ value: WeekStatus, label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'off', label: 'Off' }
]

const applyWeek = (startDate: string) => {
  const templateId = planner.activeTemplate?.id ?? planner.templates[0]?.id ?? ''
  planner.applyWeek(startDate, templateId)
}

const updateStatus = (weekId: string, status: WeekStatus) => {
  planner.updateWeek(weekId, { status })
}

const updateTemplate = (weekId: string, templateId: string) => {
  planner.updateWeek(weekId, { templateId })
}

const statusLabel = (status: WeekStatus) =>
  statusOptions.find(opt => opt.value === status)?.label ?? status

const today = new Date().toISOString().slice(0, 10)
const isCurrentWeek = (startDate: string) => {
  const monday = getMondayDate(new Date())
  return startDate === monday
}
const isPast = (startDate: string) => startDate < today && !isCurrentWeek(startDate)
</script>

<template>
  <section class="schedule-section">
    <div class="panel schedule-panel">
      <div class="schedule-header">
        <div>
          <p class="eyebrow">Planning</p>
          <h2>Week schedule</h2>
          <p class="subtitle">Mark exceptions to your routine — vacation weeks and off weeks are excluded from projections.</p>
        </div>
      </div>

      <div class="week-list">
        <div
          v-for="startDate in weekDates"
          :key="startDate"
          class="week-row"
          :class="{
            'is-current': isCurrentWeek(startDate),
            'is-past': isPast(startDate),
            'is-exception': !!weekMap.get(startDate) && weekMap.get(startDate)!.status !== 'normal'
          }"
        >
          <div class="week-date">
            <span v-if="isCurrentWeek(startDate)" class="current-badge">This week</span>
            <strong>{{ formatWeekRange(startDate) }}</strong>
          </div>

          <template v-if="weekMap.get(startDate) as any">
            <div class="week-controls">
              <select
                :value="weekMap.get(startDate)!.templateId"
                class="template-select"
                @change="updateTemplate(weekMap.get(startDate)!.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="opt in templateOptions" :key="opt.id" :value="opt.id">
                  {{ opt.name }}
                </option>
              </select>

              <div class="status-group">
                <button
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  class="status-btn"
                  :class="{ active: weekMap.get(startDate)!.status === opt.value, [`status-${opt.value}`]: true }"
                  type="button"
                  @click="updateStatus(weekMap.get(startDate)!.id, opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>

              <button
                class="remove-btn"
                type="button"
                title="Remove override"
                @click="planner.removeWeek(weekMap.get(startDate)!.id)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          </template>

          <template v-else>
            <div class="week-default">
              <span class="default-label">Active template</span>
              <button class="assign-btn" type="button" @click="applyWeek(startDate)">
                Mark as exception
              </button>
            </div>
          </template>
        </div>
      </div>

      <div v-if="planner.appliedWeeks.length > 0" class="past-section">
        <p class="past-heading">All configured weeks</p>
        <div class="past-list">
          <div
            v-for="week in planner.appliedWeeks.slice().sort((a, b) => b.startDate.localeCompare(a.startDate))"
            :key="week.id"
            class="past-row"
            :class="`status-bg-${week.status}`"
          >
            <div class="past-date">
              <strong>{{ formatWeekRange(week.startDate) }}</strong>
              <span class="status-pill" :class="`pill-${week.status}`">{{ statusLabel(week.status) }}</span>
            </div>
            <span class="past-template">
              {{ planner.templates.find(t => t.id === week.templateId)?.name ?? '—' }}
            </span>
          </div>
        </div>
      </div>
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

.schedule-section {
  display: grid;
}

.schedule-panel {
  padding: 1.5rem;
}

.schedule-header {
  margin-bottom: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-soft);
}

.schedule-header h2 {
  margin: 0 0 0.35rem;
  font-size: 1.2rem;
}

.subtitle {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.875rem;
}

.week-list {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.week-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  background: var(--surface-strong);
  transition: border-color 0.1s;
}

.week-row.is-current {
  border-color: var(--accent);
  background: rgba(15, 118, 110, 0.04);
}

.week-row.is-past {
  opacity: 0.55;
}

.week-row.is-exception {
  border-color: rgba(180, 83, 9, 0.3);
  background: rgba(180, 83, 9, 0.04);
}

.week-date {
  flex: none;
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.week-date strong {
  font-size: 0.9rem;
}

.current-badge {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  font-weight: 700;
}

.week-controls {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.template-select {
  flex: 1;
  min-width: 140px;
  max-width: 220px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--panel-bg);
  color: var(--text-main);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.status-group {
  display: flex;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  overflow: hidden;
  background: var(--panel-bg);
}

.status-btn {
  padding: 0.4rem 0.75rem;
  font: inherit;
  font-size: 0.8rem;
  background: transparent;
  border: none;
  color: var(--text-soft);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}

.status-btn:not(:first-child) {
  border-left: 1px solid var(--panel-border);
}

.status-btn.active.status-normal {
  background: var(--accent);
  color: white;
}

.status-btn.active.status-vacation {
  background: var(--warning);
  color: white;
}

.status-btn.active.status-off {
  background: #475569;
  color: white;
}

.remove-btn {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
}

.remove-btn:hover {
  background: rgba(190, 18, 60, 0.08);
  border-color: rgba(190, 18, 60, 0.3);
  color: #be123c;
}

.remove-btn svg {
  width: 0.85rem;
  height: 0.85rem;
}

.week-default {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.default-label {
  font-size: 0.85rem;
  color: var(--text-soft);
}

.assign-btn {
  padding: 0.4rem 0.85rem;
  border: 1px dashed var(--panel-border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-soft);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.1s, color 0.1s;
}

.assign-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  border-style: solid;
}

/* Past/all weeks section */

.past-section {
  border-top: 1px solid var(--panel-border);
  padding-top: 1.5rem;
}

.past-heading {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-soft);
}

.past-list {
  display: grid;
  gap: 0.4rem;
}

.past-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--panel-border);
  font-size: 0.875rem;
}

.past-date {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.past-template {
  color: var(--text-soft);
  font-size: 0.8rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: capitalize;
}

.pill-normal {
  background: rgba(15, 118, 110, 0.1);
  color: var(--accent);
}

.pill-vacation {
  background: rgba(180, 83, 9, 0.12);
  color: var(--warning);
}

.pill-off {
  background: rgba(71, 85, 105, 0.12);
  color: #475569;
}

@media (max-width: 780px) {
  .week-row {
    flex-direction: column;
    align-items: stretch;
  }

  .week-date {
    width: auto;
  }

  .week-default {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
