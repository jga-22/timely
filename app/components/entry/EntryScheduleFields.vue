<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { toggleDayIn, toggleTemplateIn } from '~/utils/entries/form'
import type { EntryDraft, EntryErrors } from '~/utils/entries/draft'
import { DAYS, formatHour } from '~/utils/planner/format'
import { isHourlyTemplate } from '~/utils/planner/templates'

/**
 * The schedule of the one form (FR-ITEM-3): the days of an entry, its times a week or month when it has no day, and for a timed entry
 * its start and week types. It edits the form's draft in place; the errors and the repaint note come from the form (useEntryDraft).
 */
const props = defineProps<{
  /** The form's id prefix, so the field ids stay the form's */
  uid: string
  draft: EntryDraft
  errors: EntryErrors
  isNew: boolean
  isSleep: boolean
  /** Saving repaints the hours of this entry */
  repaints: boolean
}>()

const planner = usePlannerStore()
const hourlyTemplates = computed(() => planner.templates.filter(template => isHourlyTemplate(template)))
const timed = computed(() => props.draft.durationMinutes > 0)
const startChoices = Array.from({ length: 24 }, (_, hour) => hour)

function toggleDay(day: number) {
  props.draft.days = toggleDayIn(props.draft.days, day)
}

function toggleTemplate(templateId: string, checked: boolean) {
  props.draft.templateIds = toggleTemplateIn(props.draft.templateIds, templateId, checked)
}
</script>

<template>
  <fieldset v-if="!isSleep" class="sched-days">
    <legend class="field-label">Days</legend>
    <div class="sched-day-row">
      <button
        v-for="(day, index) in DAYS"
        :key="day"
        type="button"
        class="chip"
        :data-active="draft.days.includes(index)"
        :aria-pressed="draft.days.includes(index)"
        @click="toggleDay(index)"
      >{{ day }}</button>
    </div>
    <p v-if="errors.days" class="field-error" role="alert">{{ errors.days }}</p>
  </fieldset>

  <!-- Times a week or a month: only for a habit with no day chosen (its frequency); a timed entry takes its frequency from its days -->
  <div v-if="!isSleep && !draft.days.length && !timed" class="form-row">
    <div class="field">
      <label class="field-label" :for="`${uid}-count`">Or: times</label>
      <input
        :id="`${uid}-count`"
        v-model.number="draft.orCount"
        class="timely-input"
        type="number"
        min="1"
        inputmode="numeric"
        :aria-invalid="!!errors.frequency"
      />
    </div>
    <div class="field">
      <label class="field-label" :for="`${uid}-period`">a</label>
      <select :id="`${uid}-period`" v-model="draft.orPeriod" class="timely-select">
        <option value="week">week</option>
        <option value="month">month</option>
      </select>
    </div>
    <p v-if="errors.frequency" class="field-error" role="alert">{{ errors.frequency }}</p>
  </div>

  <!-- Start and week types: only for a timed entry, painted from the start for its whole hours -->
  <template v-if="timed && !isSleep">
    <div class="field">
      <label class="field-label" :for="`${uid}-start`">Start</label>
      <select :id="`${uid}-start`" v-model.number="draft.start" class="timely-select" :aria-invalid="!!errors.start">
        <option v-for="hour in startChoices" :key="hour" :value="hour">{{ formatHour(hour) }}</option>
      </select>
      <p v-if="errors.start" class="field-error" role="alert">{{ errors.start }}</p>
    </div>

    <fieldset class="sched-days">
      <legend class="field-label">Week types</legend>
      <div class="check-row">
        <label v-for="template in hourlyTemplates" :key="template.id" class="check">
          <input
            type="checkbox"
            :checked="draft.templateIds.includes(template.id)"
            @change="toggleTemplate(template.id, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ template.name }}</span>
        </label>
      </div>
      <p v-if="!hourlyTemplates.length" class="form-hint">No week type can hold hours yet. Hours are painted in hourly week types only.</p>
      <p v-if="errors.weekTypes" class="field-error" role="alert">{{ errors.weekTypes }}</p>
      <p v-if="!isNew && !draft.templateIds.length" class="form-hint">No week type is checked: saving takes it out of the week.</p>
    </fieldset>

    <p v-if="repaints" class="form-hint">Saving repaints this item in the checked week types.</p>
  </template>
</template>

<style scoped>
.entry-form .form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.entry-form .form-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--ink-3);
}
</style>
