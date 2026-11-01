<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { isHourlyTemplate } from '~/utils/planner/templates'
import {
  clockLabel,
  nightHours,
  nightLabel,
  readSleep,
  sleepActivityId,
  sleepGroupsOf,
  sleepHoursPerWeek,
  sleepWindowError,
  DEFAULT_SLEEP,
  type SleepWindow
} from '~/utils/sleep'

/**
 * The Sleep editor (FR-SLEEP-2, 5): the bedtime and wake-up of the Sleep activity in the active week type, for every night or
 * for weekday and weekend nights. The form that holds it (ActivityForm) calls apply() on Save and shows the result line and its
 * Undo. The current values are read back from the painted hours of the active week type.
 */
const planner = usePlannerStore()
const uid = useId()
const hours = Array.from({ length: 24 }, (_, hour) => hour)

const sleepId = computed(() => sleepActivityId(planner.$state))
const template = computed(() => planner.activeTemplate)
const hourly = computed(() => isHourlyTemplate(template.value))

// Weekday nights (or every night) and weekend nights; a single row when they are the same
const split = ref(false)
const weekdays = reactive<SleepWindow>({ ...DEFAULT_SLEEP })
const weekend = reactive<SleepWindow>({ ...DEFAULT_SLEEP })

/** The editor starts from the active week type's painted nights */
const load = () => {
  if (!template.value || !sleepId.value) return

  const reading = readSleep(template.value.slots, sleepId.value)
  const every = reading.weekdays ?? DEFAULT_SLEEP

  split.value = reading.split
  Object.assign(weekdays, reading.weekdays ?? DEFAULT_SLEEP)
  Object.assign(weekend, reading.split ? reading.weekend ?? DEFAULT_SLEEP : every)
}

onMounted(load)
watch(() => template.value?.id, load)

// Splitting starts both rows from the one window; joining keeps the weekday window for every night
const setSplit = (value: boolean) => {
  if (value) Object.assign(weekend, weekdays)
  split.value = value
}

const groups = computed(() => sleepGroupsOf(split.value, { ...weekdays }, { ...weekend }))
const refusal = computed(() => groups.value.map(group => sleepWindowError(group.window)).find(Boolean) ?? null)
const totalText = computed(() => {
  const week = sleepHoursPerWeek(groups.value)

  return split.value
    ? `${nightHours(weekdays)} h on weekday nights and ${nightHours(weekend)} h at weekends, ${week} h a week`
    : `${nightHours(weekdays)} h a night, ${week} h a week`
})
const allocation = computed(() => (split.value
  ? [`Mon-Fri nights: ${nightLabel(0, weekdays)}`, `Sat-Sun nights: ${nightLabel(5, weekend)}`]
  : [`Every night: ${nightLabel(0, weekdays)}`]))

/** Save is refused while a window has equal bedtime and wake-up, or when the week type has 30-minute slots */
const isValid = () => !refusal.value && hourly.value && !!sleepId.value

/** Paints the nights in the active week type (FR-SLEEP-5); null when refused. The form keeps open then */
const apply = () => {
  if (!isValid() || !template.value) return null

  return planner.setSleep(template.value.id, groups.value)
}

defineExpose({ isValid, apply })
</script>

<template>
  <fieldset class="sched-days sleep-editor">
    <legend class="field-label">Sleep in {{ template?.name ?? 'this week type' }}</legend>

    <div class="segmented" role="group" aria-label="Which nights">
      <button type="button" :data-active="!split" :aria-pressed="!split" @click="setSplit(false)">Same every night</button>
      <button type="button" :data-active="split" :aria-pressed="split" @click="setSplit(true)">Weekdays and weekend</button>
    </div>

    <div class="sleep-rows">
      <div class="sleep-row-item">
        <span class="field-label">{{ split ? 'Mon-Fri nights' : 'Every night' }}</span>
        <div class="form-row">
          <div class="field">
            <label class="field-label" :for="`${uid}-bed-a`">Bedtime</label>
            <select :id="`${uid}-bed-a`" v-model.number="weekdays.bedtime" class="timely-select">
              <option v-for="hour in hours" :key="hour" :value="hour">{{ clockLabel(hour) }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" :for="`${uid}-wake-a`">Wake-up</label>
            <select :id="`${uid}-wake-a`" v-model.number="weekdays.wake" class="timely-select">
              <option v-for="hour in hours" :key="hour" :value="hour">{{ clockLabel(hour) }}</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="split" class="sleep-row-item">
        <span class="field-label">Sat-Sun nights</span>
        <div class="form-row">
          <div class="field">
            <label class="field-label" :for="`${uid}-bed-b`">Bedtime</label>
            <select :id="`${uid}-bed-b`" v-model.number="weekend.bedtime" class="timely-select">
              <option v-for="hour in hours" :key="hour" :value="hour">{{ clockLabel(hour) }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" :for="`${uid}-wake-b`">Wake-up</label>
            <select :id="`${uid}-wake-b`" v-model.number="weekend.wake" class="timely-select">
              <option v-for="hour in hours" :key="hour" :value="hour">{{ clockLabel(hour) }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <p class="form-hint">{{ totalText }}</p>
    <p v-for="line in allocation" :key="line" class="form-hint">{{ line }}</p>
    <p v-if="refusal" class="field-error" role="alert">{{ refusal }}</p>
    <p v-else-if="!hourly" class="form-hint">This week type has 30-minute slots, so Sleep cannot be painted in it.</p>
  </fieldset>
</template>

<style scoped>
.sleep-editor .form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.sleep-editor .form-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--ink-3);
}

.sleep-row-item + .sleep-row-item {
  margin-top: var(--space-3);
}

.sleep-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
