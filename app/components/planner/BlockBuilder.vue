<script setup lang="ts">
import type { Activity, Category } from '~/types/planner'
import { DAYS } from '~/utils/planner'

const props = defineProps<{
  groups: Array<{ category: Category, activities: Activity[] }>
  selectedActivityId: string
}>()

const emit = defineEmits<{
  applyRange: [payload: { activityId: string, dayIndexes: number[], startHour: number, endHour: number }]
  clearRange: [payload: { dayIndexes: number[], startHour: number, endHour: number }]
}>()

const localActivityId = ref(props.selectedActivityId)
const startHour = ref(8)
const endHour = ref(12)
const selectedDays = ref<number[]>([0, 1, 2, 3, 4])

watch(() => props.selectedActivityId, (value) => {
  localActivityId.value = value
})

const hourOptions = Array.from({ length: 25 }, (_, hour) => hour)

const toggleDay = (dayIndex: number) => {
  if (selectedDays.value.includes(dayIndex)) {
    selectedDays.value = selectedDays.value.filter(index => index !== dayIndex)
    return
  }

  selectedDays.value = [...selectedDays.value, dayIndex].sort((left, right) => left - right)
}

const apply = () => {
  if (!localActivityId.value || selectedDays.value.length === 0) {
    return
  }

  emit('applyRange', {
    activityId: localActivityId.value,
    dayIndexes: selectedDays.value,
    startHour: startHour.value,
    endHour: endHour.value
  })
}

const clear = () => {
  if (selectedDays.value.length === 0) {
    return
  }

  emit('clearRange', {
    dayIndexes: selectedDays.value,
    startHour: startHour.value,
    endHour: endHour.value
  })
}
</script>

<template>
  <section class="panel-surface">
    <div class="header">
      <div>
        <p class="eyebrow">Primary Authoring</p>
        <h3>Recurring block builder</h3>
        <p>Select one activity, a time range, and the days where it applies.</p>
      </div>
    </div>

    <div class="form-grid">
      <label class="field field-wide">
        <span>Activity</span>
        <select v-model="localActivityId">
          <optgroup v-for="group in groups" :key="group.category.id" :label="group.category.name">
            <option v-for="activity in group.activities" :key="activity.id" :value="activity.id">
              {{ activity.name }}
            </option>
          </optgroup>
        </select>
      </label>

      <label class="field">
        <span>Start</span>
        <select v-model.number="startHour">
          <option v-for="hour in hourOptions.slice(0, -1)" :key="`start-${hour}`" :value="hour">
            {{ String(hour).padStart(2, '0') }}:00
          </option>
        </select>
      </label>

      <label class="field">
        <span>End</span>
        <select v-model.number="endHour">
          <option v-for="hour in hourOptions.slice(1)" :key="`end-${hour}`" :value="hour">
            {{ String(hour).padStart(2, '0') }}:00
          </option>
        </select>
      </label>
    </div>

    <div class="day-chips">
      <button
        v-for="(day, dayIndex) in DAYS"
        :key="day"
        class="chip"
        :class="{ active: selectedDays.includes(dayIndex) }"
        type="button"
        @click="toggleDay(dayIndex)"
      >
        {{ day }}
      </button>
    </div>

    <div class="quick-actions">
      <button class="button button-secondary" type="button" @click="selectedDays = [0, 1, 2, 3, 4]">Weekdays</button>
      <button class="button button-secondary" type="button" @click="selectedDays = [5, 6]">Weekend</button>
      <button class="button button-secondary" type="button" @click="selectedDays = [0, 1, 2, 3, 4, 5, 6]">All week</button>
    </div>

    <div class="actions">
      <button class="button button-primary" type="button" @click="apply()">Apply Block</button>
      <button class="button button-secondary" type="button" @click="clear()">Clear Block</button>
    </div>
  </section>
</template>

<style scoped>
.panel-surface {
  background: rgba(255, 250, 243, 0.78);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.header,
.form-grid,
.quick-actions,
.actions {
  display: flex;
  gap: 0.75rem;
}

.form-grid,
.quick-actions,
.actions {
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  color: var(--accent-strong);
}

h3,
p {
  margin-top: 0;
}

.header p,
.field span {
  color: var(--text-soft);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 130px;
}

.field-wide {
  flex: 1 1 240px;
}

.field span {
  font-size: 0.8rem;
}

.field select {
  min-height: 2.75rem;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--surface-strong);
  padding: 0.7rem 0.85rem;
  color: var(--text-main);
}

.day-chips {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin: 1rem 0;
}

.chip,
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.7rem 0.95rem;
  border-radius: 999px;
  border: 1px solid var(--panel-border);
  background: var(--surface-strong);
  color: var(--text-main);
  cursor: pointer;
}

.chip.active {
  border-color: var(--accent);
  background: rgba(15, 118, 110, 0.12);
}

.button-primary {
  background: var(--accent);
  border-color: transparent;
  color: white;
}
</style>
