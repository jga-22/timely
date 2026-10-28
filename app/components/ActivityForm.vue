<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { DAYS, DESIGN_COLORS, formatHour, isHourlyTemplate } from '~/utils/planner'
import {
  DURATION_OPTIONS,
  blockHours,
  entryDraftOf,
  newEntryDraft,
  removalImpact,
  scheduleChanged,
  type EntryDraft,
  type EntryErrors
} from '~/utils/entries'
import { focusEditField } from '~/utils/focus'
import { shortCodeFor } from '~/utils/onboarding'

/**
 * The one form for an entry (FR-ITEM-3): a habit, its linked activity, or an activity no habit links to. The Week tab and a life
 * area in Goals open it, to add or to edit (inline, one at a time). Save applies the whole draft in one step through the store
 * (saveEntry). It emits `saved` with the inline result and its undo when hours were painted, and `close` when it leaves
 * (Save, Cancel, Escape, or a removal), so the caller returns focus.
 */
const props = defineProps<{
  /** The entry's habit and activity ids; both null for a new entry */
  habitId: string | null
  activityId: string | null
  /** The life area of a new entry (the first one when missing) */
  categoryId?: string
}>()

const emit = defineEmits<{
  saved: [result: { text?: string; undo?: Array<{ templateId: string; slots: string[] }> }]
  close: []
}>()

const planner = usePlannerStore()
const uid = useId()
const isNew = !props.habitId && !props.activityId

const categories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))
const hourlyTemplates = computed(() => planner.templates.filter(template => isHourlyTemplate(template)))
const durationChoices = computed(() => (DURATION_OPTIONS.includes(draft.durationMinutes)
  ? DURATION_OPTIONS
  : [...DURATION_OPTIONS, draft.durationMinutes].sort((a, b) => a - b)))
const startChoices = Array.from({ length: 24 }, (_, hour) => hour)

// The saved entry, to tell what this draft changes: the repaint note, the removal confirmation
const saved: EntryDraft = isNew
  ? newEntryDraft(planner.$state, props.categoryId ?? '')
  : entryDraftOf(planner.$state, props.habitId, props.activityId)

const draft = reactive<EntryDraft>(isNew
  ? newEntryDraft(planner.$state, props.categoryId ?? categories.value[0]?.id ?? '')
  : entryDraftOf(planner.$state, props.habitId, props.activityId))

const errors = ref<EntryErrors>({})
const confirmingRemoval = ref(false)
const confirmingDelete = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const nameEl = ref<HTMLInputElement | null>(null)

// Errors belong to the draft they were checked against: a change clears them
watch(draft, () => {
  errors.value = {}
}, { deep: true })

onMounted(() => {
  nextTick(() => focusEditField(nameEl.value, rootEl.value))
})

const plural = (count: number, singular: string, pluralForm: string) => `${count} ${count === 1 ? singular : pluralForm}`
const timed = computed(() => draft.durationMinutes > 0)
const hours = computed(() => blockHours(draft.durationMinutes))
const durationLabel = (minutes: number) => {
  if (minutes === 0) return 'No time (habit)'
  if (minutes < 60) return `${minutes} min`
  return Number.isInteger(minutes / 60) ? `${minutes / 60} h` : `${minutes} min`
}

/** A snapshot of the draft as plain data, for the store */
const snapshot = (): EntryDraft => ({
  ...draft,
  days: [...draft.days],
  templateIds: [...draft.templateIds],
  alsoCategoryIds: [...draft.alsoCategoryIds]
})

// Repaint: a timed entry whose schedule changed repaints its hours on Save (never a name, colour, code or life-area change alone)
const repaints = computed(() => !isNew && timed.value && scheduleChanged(snapshot(), saved))
// Switching to No time removes the activity: Save asks first
const removesActivity = computed(() => !isNew && !!saved.activityId && !timed.value)

const removalText = computed(() => {
  const impact = removalImpact(planner.$state, saved.activityId ?? '', saved.habitId)
  if (impact.keepsActivity) return 'This unlinks it from the habit. Its activity stays, because another habit uses it.'
  if (impact.hours) return `This clears its hours in ${plural(impact.templateCount, 'week type', 'week types')} and removes its activity.`
  return 'This removes its activity.'
})

const deleteText = computed(() => {
  if (saved.habitId) {
    return saved.activityId
      ? `Remove the habit ${saved.name}? Its activity stays in the list as its own entry. This cannot be undone.`
      : `Remove the habit ${saved.name}? This cannot be undone.`
  }

  const impact = removalImpact(planner.$state, saved.activityId ?? '', null)
  return impact.hours
    ? `Delete ${saved.name}? It clears its hours in ${plural(impact.templateCount, 'week type', 'week types')}. This cannot be undone.`
    : `Delete ${saved.name}? This cannot be undone.`
})

const toggleDay = (day: number) => {
  draft.days = draft.days.includes(day) ? draft.days.filter(item => item !== day) : [...draft.days, day].sort((a, b) => a - b)
}

const toggleTemplate = (templateId: string, checked: boolean) => {
  draft.templateIds = checked
    ? [...draft.templateIds, templateId]
    : draft.templateIds.filter(id => id !== templateId)
}

function save(confirmed = false) {
  if (removesActivity.value && !confirmed) {
    confirmingRemoval.value = true
    return
  }

  const result = planner.saveEntry(snapshot())

  if (Object.keys(result.errors).length) {
    errors.value = result.errors
    return
  }

  emit('saved', { text: result.text, undo: result.undo })
  emit('close')
}

function remove() {
  planner.removeEntry(saved.habitId, saved.activityId)
  emit('close')
}

// Escape closes the innermost open thing: a confirmation first, then the form
function onEscape(event: KeyboardEvent) {
  event.stopPropagation()

  if (confirmingRemoval.value) confirmingRemoval.value = false
  else if (confirmingDelete.value) confirmingDelete.value = false
  else emit('close')
}
</script>

<template>
  <div :id="`${uid}-panel`" ref="rootEl" class="act-panel entry-form" tabindex="-1" @keydown.esc="onEscape">
    <div class="act-panel-head">
      <h3 class="act-panel-title">{{ isNew ? 'New activity or habit' : `Edit ${saved.name}` }}</h3>
    </div>

    <div class="form-stack">
      <div class="field">
        <label class="field-label" :for="`${uid}-name`">Name</label>
        <input
          :id="`${uid}-name`"
          ref="nameEl"
          v-model="draft.name"
          class="timely-input"
          placeholder="e.g. Run or Read"
          :aria-invalid="!!errors.name"
          :aria-describedby="errors.name ? `${uid}-name-error` : undefined"
          @keydown.enter.prevent="save()"
        />
        <p v-if="errors.name" :id="`${uid}-name-error`" class="field-error" role="alert">{{ errors.name }}</p>
      </div>

      <div class="form-row">
        <div class="field">
          <label class="field-label" :for="`${uid}-area`">Life area</label>
          <select :id="`${uid}-area`" v-model="draft.categoryId" class="timely-select" :aria-invalid="!!errors.categoryId">
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
          <p v-if="errors.categoryId" class="field-error" role="alert">{{ errors.categoryId }}</p>
        </div>

        <div class="field">
          <label class="field-label" :for="`${uid}-duration`">Duration</label>
          <select
            :id="`${uid}-duration`"
            class="timely-select"
            :value="draft.durationMinutes"
            @change="draft.durationMinutes = Number(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="minutes in durationChoices" :key="minutes" :value="minutes">{{ durationLabel(minutes) }}</option>
          </select>
        </div>
      </div>

      <p v-if="timed && draft.durationMinutes % 60" class="form-hint">
        Hours are painted whole: {{ draft.durationMinutes }} min takes {{ hours }} h in each week type.
      </p>

      <fieldset class="sched-days">
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
      <div v-if="!draft.days.length && !timed" class="form-row">
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
      <template v-if="timed">
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

      <details class="entry-more">
        <summary class="btn btn-sm">More options</summary>
        <div class="form-stack entry-more-body">
          <template v-if="timed">
            <div class="field">
              <label class="field-label" :for="`${uid}-code`">Short code</label>
              <input
                :id="`${uid}-code`"
                v-model="draft.shortCode"
                class="timely-input"
                maxlength="3"
                :placeholder="draft.name.trim() ? shortCodeFor(draft.name) : 'ABC'"
                :aria-invalid="!!errors.shortCode"
                :aria-describedby="errors.shortCode ? `${uid}-code-error` : undefined"
                @keydown.enter.prevent="save()"
              />
              <p v-if="errors.shortCode" :id="`${uid}-code-error`" class="field-error" role="alert">{{ errors.shortCode }}</p>
            </div>

            <div class="field">
              <span class="field-label">Colour</span>
              <div class="color-pop color-pop-inline">
                <button
                  v-for="dc in DESIGN_COLORS"
                  :key="dc.id"
                  type="button"
                  :style="{ background: dc.bg }"
                  :data-active="draft.color === dc.bg"
                  :aria-label="`Colour ${dc.id}`"
                  @click="draft.color = dc.bg"
                />
              </div>
            </div>

            <PlannerAlsoCategories v-model="draft.alsoCategoryIds" :categories="categories" :primary-id="draft.categoryId" />
          </template>
          <p v-else class="form-hint">The short code, colour and "also counts toward" belong to a timed item.</p>
        </div>
      </details>
    </div>

    <div v-if="confirmingRemoval" class="act-confirm" role="group" aria-label="Confirm no time">
      <p class="act-confirm-text">{{ removalText }}</p>
      <div class="act-actions">
        <button type="button" class="btn btn-sm btn-danger" @click="save(true)">Save without time</button>
        <button type="button" class="btn btn-sm" @click="confirmingRemoval = false">Keep its time</button>
      </div>
    </div>

    <div class="act-actions">
      <button type="button" class="btn btn-sm btn-primary" @click="save()">Save</button>
      <button type="button" class="btn btn-sm" @click="emit('close')">Cancel</button>
    </div>

    <div v-if="!isNew" class="act-delete">
      <button v-if="!confirmingDelete" type="button" class="btn btn-sm btn-danger" @click="confirmingDelete = true">Delete</button>
      <div v-else class="act-confirm" role="group" aria-label="Confirm delete">
        <p class="act-confirm-text">{{ deleteText }}</p>
        <div class="act-actions">
          <button type="button" class="btn btn-sm btn-danger" @click="remove">Delete</button>
          <button type="button" class="btn btn-sm" @click="confirmingDelete = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
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

.entry-more summary {
  align-self: flex-start;
  margin-top: var(--space-2);
  cursor: pointer;
  list-style: none;
}

.entry-more summary::-webkit-details-marker {
  display: none;
}

.entry-more-body {
  margin-top: var(--space-3);
}
</style>
