<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import {
  DAYS,
  DESIGN_COLORS,
  aggregateTemplate,
  formatHour,
  isHourlyTemplate,
  validateActivityFields,
  type ActivityFieldErrors
} from '~/utils/planner'
import { inkOn } from '~/utils/palette'
import { shortCodeFor } from '~/utils/onboarding'
import type { Activity } from '~/types/planner'

const planner = usePlannerStore()
const { activeTemplate, templates, appliedWeeks } = storeToRefs(planner)
const { year, weeks, currentWeekIndex } = usePlannerYear()
const { item, edit, add, category, setSelection } = useNav()
const { categoryMap } = usePlannerMaps()
const { fill } = usePlannerFill()

// ── Template switcher ──
const renamingId = ref<string | null>(null)
const templateEditOpen = ref(false)
const colorPickerFor = ref<string | null>(null)
const newTemplateOpen = ref(false)
const newTemplateName = ref('')
const paintTool = ref(templates.value[0]?.id ?? '')

// ── Computed ──
// The paint colour of a template: the same fill on the year grid, in the paint tools and in the switcher
const templateFill = (t: typeof templates.value[0]) => fill(t.color ?? '#5d6b7a')

// ── Year painter ──
const isYearPainting = ref(false)
const hoverWeek = ref<number | null>(null)
const yearOpen = ref(false)
const appliedByDate = computed(() => {
  const m = new Map<string, string>()
  for (const w of appliedWeeks.value) m.set(w.startDate, w.templateId)
  return m
})
const assignedInYear = computed(() => weeks.value.filter(startDate => appliedByDate.value.has(startDate)).length)
/** With one week type: every week uses it when all are assigned to it; otherwise unassigned weeks use the active one (named generically) */
const yearLine = computed(() => {
  const only = templates.value[0]
  if (!only) return ''

  const uses = assignedInYear.value === weeks.value.length ? only.name : 'the active week type'
  return `Every week of ${year.value} uses ${uses}.`
})
const templateById = computed(() => new Map(templates.value.map(t => [t.id, t])))
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** Weeks per year-grid row: 13 columns, so each row is a quarter-year of weeks */
const WEEKS_PER_ROW = 13

/** Rows of the year grid, each with a label: the months its first and last week start in */
const yearRows = computed(() => {
  const rows: { label: string; weeks: { startDate: string; wi: number }[] }[] = []

  for (let start = 0; start < weeks.value.length; start += WEEKS_PER_ROW) {
    const cells = weeks.value.slice(start, start + WEEKS_PER_ROW).map((startDate, offset) => ({ startDate, wi: start + offset }))
    const first = MONTHS[Number(cells[0]!.startDate.slice(5, 7)) - 1]
    const last = MONTHS[Number(cells[cells.length - 1]!.startDate.slice(5, 7)) - 1]
    rows.push({ label: first === last ? first! : `${first}–${last}`, weeks: cells })
  }

  return rows
})

function paintWeek(wi: number) {
  const startDate = weeks.value[wi]
  if (startDate) planner.setWeekTemplate(startDate, paintTool.value === 'erase' ? null : paintTool.value)
}

// Background colour for a year cell: the template painted on that week
const cellStyle = (startDate: string) => {
  const tpl = templateById.value.get(appliedByDate.value.get(startDate) ?? '')
  if (!tpl) return undefined

  const color = templateFill(tpl)
  return { '--c': color, '--c-ink': inkOn(color) }
}

// ── Template management ──
function handleNewTemplate() {
  if (!newTemplateName.value.trim()) return
  planner.createTemplate()
  planner.renameActiveTemplate(newTemplateName.value.trim())
  newTemplateName.value = ''
  newTemplateOpen.value = false
}

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

// ── Activities: the list under the week, its detail and the edit form ──
const orderedCategories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))
const selectedActivity = computed(() => planner.activities.find(activity => activity.id === item.value) ?? null)
const editing = computed(() => !!selectedActivity.value && edit.value)

const hoursText = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1))
const plural = (count: number, singular: string, pluralForm: string) => `${count} ${count === 1 ? singular : pluralForm}`
const categoryName = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'No life area'

// Hours per week in the template being edited (the activity list reads this)
const activeHours = computed(() => (activeTemplate.value ? aggregateTemplate(activeTemplate.value, planner.activities) : new Map<string, number>()))
const linkedHabits = computed(() => planner.habits.filter(habit => habit.activityId === selectedActivity.value?.id))

/** What deleting the selected activity does (FR-UX-7): cleared hours across templates and unlinked habits */
const deleteImpact = computed(() => {
  const activity = selectedActivity.value
  if (!activity) return ''

  const hoursByTemplate = planner.templates.map(template => aggregateTemplate(template, planner.activities).get(activity.id) ?? 0)
  const hours = hoursByTemplate.reduce((sum, value) => sum + value, 0)
  const templateCount = hoursByTemplate.filter(value => value > 0).length
  const habitCount = linkedHabits.value.length
  const parts: string[] = []

  if (hours > 0) parts.push(`clears ${hoursText(hours)} h in ${plural(templateCount, 'week type', 'week types')}`)
  if (habitCount > 0) parts.push(`unlinks ${plural(habitCount, 'habit', 'habits')}`)
  if (!parts.length) return 'Nothing is scheduled or linked to it.'

  const sentence = parts.join(' and ')
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
})

// Selection and edit mode live in the URL: a selection is a history entry, Done replaces it (FR-UX-5)
function selectActivity(activityId: string) {
  setSelection({ item: activityId })
}

function startEdit() {
  if (!selectedActivity.value) return

  // Focus moves into the form once the route shows it, so Escape reaches the panel
  setSelection({ item: selectedActivity.value.id, edit: true }).then(() => nextTick(() => document.getElementById('act-edit-name')?.focus()))
}

function finishEdit() {
  confirmingDelete.value = false
  if (!selectedActivity.value) return

  // Focus waits for the route to update, so the Edit button is rendered again
  setSelection({ item: selectedActivity.value.id }, true).then(() => nextTick(() => document.querySelector<HTMLButtonElement>('.act-edit-btn')?.focus()))
}

// Edit drafts: edits apply at once (FR-UX-6); a rejected entry keeps its message until the next valid one
const nameDraft = ref('')
const codeDraft = ref('')
const editErrors = ref<ActivityFieldErrors>({})
const confirmingDelete = ref(false)
const cancelDeleteButton = ref<HTMLButtonElement | null>(null)
const deleteTrigger = ref<HTMLButtonElement | null>(null)

watch(
  () => [selectedActivity.value?.id ?? null, editing.value] as const,
  () => {
    nameDraft.value = selectedActivity.value?.name ?? ''
    codeDraft.value = selectedActivity.value?.shortCode ?? ''
    editErrors.value = {}
    confirmingDelete.value = false
  },
  { immediate: true }
)

function applyField(changes: Partial<Pick<Activity, 'name' | 'shortCode' | 'categoryId' | 'alsoCategoryIds' | 'color'>>) {
  const activity = selectedActivity.value
  if (!activity) return

  const errors = planner.updateActivity(activity.id, changes)

  for (const field of ['name', 'shortCode', 'categoryId'] as const) {
    if (field in changes) editErrors.value = { ...editErrors.value, [field]: errors[field] }
  }
}

function onNameInput(event: Event) {
  nameDraft.value = (event.target as HTMLInputElement).value
  applyField({ name: nameDraft.value })
}

function onCodeInput(event: Event) {
  codeDraft.value = (event.target as HTMLInputElement).value
  applyField({ shortCode: codeDraft.value })
}

// Leaving an invalid field restores the stored value; the message stays until the next valid entry
function onNameBlur() {
  nameDraft.value = selectedActivity.value?.name ?? ''
}

function onCodeBlur() {
  codeDraft.value = selectedActivity.value?.shortCode ?? ''
}

function onEditKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return

  if (confirmingDelete.value) {
    event.stopPropagation()
    cancelDelete()
  } else if (editing.value) {
    event.stopPropagation()
    finishEdit()
  }
}

// Inline delete confirmation (FR-UX-7): nothing changes before the second button
function askDelete() {
  confirmingDelete.value = true
  nextTick(() => cancelDeleteButton.value?.focus())
}

function cancelDelete() {
  confirmingDelete.value = false
  nextTick(() => deleteTrigger.value?.focus())
}

function confirmDelete() {
  const activity = selectedActivity.value
  if (!activity) return

  planner.removeActivity(activity.id)
  confirmingDelete.value = false
  setSelection({}, true)
}

// New activity: a quiet link reveals the form (progressive disclosure)
const addOpen = ref(false)
const addDraft = reactive({ name: '', shortCode: '', categoryId: '', color: '', alsoCategoryIds: [] as string[] })
const addErrors = ref<ActivityFieldErrors>({})
// The short code follows the name until it is typed by hand; a blank one is derived from the name when the form is submitted
const shortCodeEdited = ref(false)
const addNameInput = ref<HTMLInputElement | null>(null)
const addTrigger = ref<HTMLButtonElement | null>(null)

watch(() => addDraft.name, (name) => {
  if (!shortCodeEdited.value) addDraft.shortCode = name.trim() ? shortCodeFor(name) : ''
})

// A new activity starts in its category's colour; changing the category follows it
watch(() => addDraft.categoryId, (categoryId) => {
  addDraft.color = categoryMap.value.get(categoryId)?.color ?? DESIGN_COLORS[0]!.bg
  addDraft.alsoCategoryIds = addDraft.alsoCategoryIds.filter(id => id !== categoryId)
})

// categoryId preselects a category (FR-GOALS-20); an unknown or missing id falls back to the first category
function openAdd(categoryId?: string | null) {
  const presetId = orderedCategories.value.find(cat => cat.id === categoryId)?.id ?? orderedCategories.value[0]?.id ?? ''

  addDraft.name = ''
  addDraft.shortCode = ''
  shortCodeEdited.value = false
  addDraft.categoryId = presetId
  addDraft.alsoCategoryIds = []
  addDraft.color = categoryMap.value.get(presetId)?.color ?? DESIGN_COLORS[0]!.bg
  addErrors.value = {}
  addOpen.value = true
  nextTick(() => addNameInput.value?.focus())
}

function closeAdd() {
  addOpen.value = false
  // A form opened from Goals carries ?add=1; closing drops it so a reload does not reopen the form
  if (add.value) setSelection({ item: item.value ?? undefined, edit: edit.value }, true)
  nextTick(() => addTrigger.value?.focus())
}

watch(add, (open) => {
  if (open) openAdd(category.value)
}, { immediate: true })

function submitAdd() {
  // A blank short code is derived from the name here (the field is optional), then checked like a typed one
  const shortCode = addDraft.shortCode.trim() || shortCodeFor(addDraft.name)
  const errors = validateActivityFields(planner.$state, {
    name: addDraft.name,
    shortCode,
    categoryId: addDraft.categoryId
  })
  addErrors.value = errors

  if (Object.keys(errors).length) return

  const id = planner.addActivity(addDraft.name, shortCode, addDraft.categoryId, addDraft.color, addDraft.alsoCategoryIds)
  addOpen.value = false
  if (id) selectActivity(id)
}

// ── Schedule in the week (FR-PLAN-25): paints the selected activity into the active week type, as the grid does ──
const SCHEDULE_UNDO_MS = 8000
const scheduleDays = ref<number[]>([])
const scheduleDuration = ref(1)
const scheduleStart = ref(9)
const scheduleError = ref('')
const scheduleResult = ref<{ text: string; templateId: string; slots: string[] } | null>(null)
let scheduleUndoTimer: ReturnType<typeof setTimeout> | undefined
const scheduleHourly = computed(() => isHourlyTemplate(activeTemplate.value))
const hourOptions = Array.from({ length: 24 }, (_, hour) => hour)
const durationOptions = Array.from({ length: 12 }, (_, index) => index + 1)

// Default duration: the first linked habit's time per occurrence, rounded up to whole hours (1 to 12); otherwise 1 hour
const scheduleDefaultDuration = (activityId: string) => {
  const minutes = planner.habits.find(habit => habit.activityId === activityId && habit.minutesPerOccurrence)?.minutesPerOccurrence
  return minutes ? Math.min(12, Math.max(1, Math.ceil(minutes / 60))) : 1
}

// Hint only, no preselection: a linked habit with a weekly count says how many days to pick
const scheduleHabitHint = computed(() => {
  const habit = linkedHabits.value.find(item => item.frequency.period === 'week' && item.frequency.count > 0)
  return habit ? `Habit "${habit.name}" asks for ${habit.frequency.count} a week. Pick the days you want.` : ''
})

const dismissScheduleResult = () => {
  scheduleResult.value = null
  clearTimeout(scheduleUndoTimer)
}

const resetSchedule = () => {
  scheduleDays.value = []
  scheduleDuration.value = selectedActivity.value ? scheduleDefaultDuration(selectedActivity.value.id) : 1
  scheduleStart.value = 9
  scheduleError.value = ''
  dismissScheduleResult()
}

watch(() => selectedActivity.value?.id ?? null, resetSchedule, { immediate: true })

function toggleScheduleDay(day: number) {
  scheduleDays.value = scheduleDays.value.includes(day)
    ? scheduleDays.value.filter(item => item !== day)
    : [...scheduleDays.value, day]
  scheduleError.value = ''
}

function addToWeek() {
  const activity = selectedActivity.value
  const template = activeTemplate.value
  if (!activity || !template || !scheduleHourly.value) return

  const duration = scheduleDuration.value
  const start = scheduleStart.value

  if (!scheduleDays.value.length) {
    scheduleError.value = 'Choose at least one day.'
    return
  }

  if (start + duration > 24) {
    scheduleError.value = `A ${duration} h block from ${formatHour(start)} would run past midnight. Choose an earlier start or a shorter block.`
    return
  }

  scheduleError.value = ''
  const days = [...scheduleDays.value].sort((a, b) => a - b)
  const cells = days.flatMap(day => Array.from({ length: duration }, (_, offset) => day * 24 + start + offset))
  const before = [...template.slots]
  const taken = planner.paintCells(template.id, cells, activity.id)

  const replaced = taken.map(item => `${hoursText(item.hours)} h of ${planner.activities.find(a => a.id === item.activityId)?.name ?? 'another activity'}`)
  const text = `Added ${days.length} x ${duration} h.${replaced.length ? ` Replaced ${replaced.join(' and ')}.` : ''}`

  scheduleResult.value = { text, templateId: template.id, slots: before }
  clearTimeout(scheduleUndoTimer)
  scheduleUndoTimer = setTimeout(dismissScheduleResult, SCHEDULE_UNDO_MS)
}

function undoSchedule() {
  const last = scheduleResult.value
  if (!last) return

  planner.restoreSlots(last.templateId, last.slots)
  dismissScheduleResult()
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
          autofocus
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
          @dblclick="renamingId = t.id"
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

      <div v-if="newTemplateOpen" class="new-template-form">
        <input
          v-model="newTemplateName"
          class="pill-input"
          autofocus
          placeholder="e.g. Launch week"
          @keydown.enter="handleNewTemplate"
          @keydown.escape="newTemplateOpen = false; newTemplateName = ''"
        />
        <button class="btn btn-sm btn-primary" @click="handleNewTemplate">Add</button>
      </div>
      <button v-else class="chip-add" @click="newTemplateOpen = true">+ New week type</button>

      <EditButton v-if="activeTemplate" label="Edit week type" :expanded="templateEditOpen" @click="templateEditOpen = !templateEditOpen" />
    </div>

    <!-- Template edit: name, colour and delete for the active template; changes apply at once (FR-UX-2) -->
    <div v-if="templateEditOpen && activeTemplate" class="act-panel template-edit" @keydown.escape.stop="templateEditOpen = false">
      <div class="act-panel-head">
        <h3 class="act-panel-title">Edit week type</h3>
        <button type="button" class="btn btn-sm btn-primary" @click="templateEditOpen = false">Done</button>
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

    <!-- Week grid: the original range-select grid, with its action bar and menu teleported to the body -->
    <!-- Client only: the grid is state-driven, and server HTML would keep the seed cells after hydration -->
    <ClientOnly>
      <PlannerActivityGrid />
    </ClientOnly>

    <!-- Activities: a compact list under the week; select one to see it, edit it or add one -->
    <section class="section acts" aria-labelledby="activities-title">
      <div class="acts-head">
        <h2 id="activities-title" class="section-title">Activities</h2>
      </div>

      <ul class="act-list">
        <li v-for="activity in planner.activities" :key="activity.id">
          <button
            type="button"
            class="chip"
            :data-active="selectedActivity?.id === activity.id"
            :aria-pressed="selectedActivity?.id === activity.id"
            @click="selectActivity(activity.id)"
          >
            <span class="dot" :style="{ background: activity.color }" />
            <span class="t-name">{{ activity.name }}</span>
            <span class="pill-count">{{ hoursText(activeHours.get(activity.id) ?? 0) }}h</span>
          </button>
        </li>
      </ul>

      <p v-if="!planner.activities.length" class="acts-empty">No activities yet. Add one to plan when it happens.</p>

      <div v-if="selectedActivity && !editing" class="act-detail">
        <span class="dot dot-lg" :style="{ background: selectedActivity.color }" />
        <div class="act-detail-main">
          <span class="act-detail-name">{{ selectedActivity.name }}</span>
          <span class="act-detail-sub">{{ selectedActivity.shortCode }} · {{ categoryName(selectedActivity.categoryId) }}<template v-if="selectedActivity.alsoCategoryIds?.length"> · also {{ selectedActivity.alsoCategoryIds.map(categoryName).join(', ') }}</template> · {{ linkedHabits.length }} linked {{ linkedHabits.length === 1 ? 'habit' : 'habits' }}</span>
        </div>
        <EditButton :label="`Edit ${selectedActivity.name}`" :expanded="editing" @click="startEdit" />
      </div>

      <!-- Schedule in the week (FR-PLAN-25): the active week type, replacing other activities in the hours painted -->
      <section v-if="selectedActivity && !editing" class="act-panel act-schedule" aria-labelledby="act-schedule-title">
        <div class="act-panel-head">
          <h3 id="act-schedule-title" class="act-panel-title">Schedule in the week</h3>
        </div>
        <p class="act-schedule-lede">
          Paints {{ selectedActivity.name }} in <strong>{{ activeTemplate?.name ?? 'no week type' }}</strong>. Hours it replaces belong to other activities.
        </p>
        <p v-if="scheduleHabitHint" class="act-schedule-hint">{{ scheduleHabitHint }}</p>

        <fieldset class="sched-days">
          <legend class="field-label">Days</legend>
          <div class="sched-day-row">
            <button
              v-for="(day, index) in DAYS"
              :key="day"
              type="button"
              class="chip"
              :data-active="scheduleDays.includes(index)"
              :aria-pressed="scheduleDays.includes(index)"
              @click="toggleScheduleDay(index)"
            >{{ day }}</button>
          </div>
        </fieldset>

        <div class="form-row">
          <div class="field">
            <label class="field-label" for="sched-duration">Duration</label>
            <select id="sched-duration" v-model.number="scheduleDuration" class="timely-select" @change="scheduleError = ''">
              <option v-for="hours in durationOptions" :key="hours" :value="hours">{{ hours }} h</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="sched-start">Start</label>
            <select id="sched-start" v-model.number="scheduleStart" class="timely-select" @change="scheduleError = ''">
              <option v-for="hour in hourOptions" :key="hour" :value="hour">{{ formatHour(hour) }}</option>
            </select>
          </div>
        </div>

        <p v-if="scheduleError" id="sched-error" class="field-error" role="alert">{{ scheduleError }}</p>
        <p v-if="!scheduleHourly" class="act-schedule-hint">This week type is not hourly, so hours cannot be painted here.</p>

        <div class="act-actions">
          <button type="button" class="btn btn-sm btn-primary" :disabled="!scheduleHourly" @click="addToWeek">Add to my week</button>
        </div>

        <div v-if="scheduleResult" class="sched-result" role="status">
          <span>{{ scheduleResult.text }}</span>
          <button type="button" class="btn btn-sm" @click="undoSchedule">Undo</button>
        </div>
      </section>

      <!-- Inline edit of the selected activity: changes apply at once; Done leaves edit mode -->
      <div v-if="editing && selectedActivity" class="act-panel" @keydown="onEditKeydown">
        <div class="act-panel-head">
          <h3 class="act-panel-title">Edit {{ selectedActivity.name }}</h3>
          <button type="button" class="btn btn-sm btn-primary" @click="finishEdit">Done</button>
        </div>

        <div class="form-stack">
          <div class="field">
            <label class="field-label" for="act-edit-name">Name</label>
            <input
              id="act-edit-name"
              class="timely-input"
              :value="nameDraft"
              :aria-invalid="!!editErrors.name"
              aria-describedby="act-edit-name-error"
              @input="onNameInput"
              @blur="onNameBlur"
            />
            <p v-if="editErrors.name" id="act-edit-name-error" class="field-error">{{ editErrors.name }}</p>
          </div>

          <div class="form-row">
            <div class="field">
              <label class="field-label" for="act-edit-code">Short code</label>
              <input
                id="act-edit-code"
                class="timely-input"
                :value="codeDraft"
                maxlength="3"
                :aria-invalid="!!editErrors.shortCode"
                aria-describedby="act-edit-code-error"
                @input="onCodeInput"
                @blur="onCodeBlur"
              />
              <p v-if="editErrors.shortCode" id="act-edit-code-error" class="field-error">{{ editErrors.shortCode }}</p>
            </div>
            <div class="field">
              <label class="field-label" for="act-edit-cat">Life area</label>
              <select
                id="act-edit-cat"
                class="timely-select"
                title="The primary life area is changed here; it cannot be unlinked"
                :value="selectedActivity.categoryId"
                @change="applyField({ categoryId: ($event.target as HTMLSelectElement).value })"
              >
                <option v-for="cat in orderedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
              <p v-if="editErrors.categoryId" class="field-error">{{ editErrors.categoryId }}</p>
            </div>
          </div>

          <PlannerAlsoCategories
            :model-value="selectedActivity.alsoCategoryIds ?? []"
            :categories="orderedCategories"
            :primary-id="selectedActivity.categoryId"
            @update:model-value="applyField({ alsoCategoryIds: $event })"
          />

          <div class="field">
            <span class="field-label">Colour</span>
            <div class="color-pop color-pop-inline">
              <button
                v-for="dc in DESIGN_COLORS"
                :key="dc.id"
                type="button"
                :style="{ background: dc.bg }"
                :data-active="selectedActivity.color === dc.bg"
                :aria-label="`Colour ${dc.id}`"
                @click="applyField({ color: dc.bg })"
              />
            </div>
          </div>
        </div>

        <div class="act-delete">
          <button
            v-if="!confirmingDelete"
            ref="deleteTrigger"
            type="button"
            class="btn btn-sm btn-danger"
            @click="askDelete"
          >Delete activity</button>
          <div v-else class="act-confirm" role="group" aria-label="Confirm delete">
            <p class="act-confirm-text">{{ deleteImpact }}</p>
            <div class="act-actions">
              <button type="button" class="btn btn-sm btn-danger" @click="confirmDelete">Delete</button>
              <button ref="cancelDeleteButton" type="button" class="btn btn-sm" @click="cancelDelete">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      <!-- New activity: a quiet link reveals the form -->
      <div v-if="addOpen" class="act-panel">
        <div class="form-stack">
          <div class="field">
            <label class="field-label" for="add-act-name">Name</label>
            <input
              id="add-act-name"
              ref="addNameInput"
              v-model="addDraft.name"
              class="timely-input"
              placeholder="e.g. Meditation"
              :aria-invalid="!!addErrors.name"
              aria-describedby="add-act-name-error"
              @keydown.enter.prevent="submitAdd"
              @keydown.escape="closeAdd"
            />
            <p v-if="addErrors.name" id="add-act-name-error" class="field-error">{{ addErrors.name }}</p>
          </div>

          <div class="form-row">
            <div class="field">
              <label class="field-label" for="add-act-code">Short code</label>
              <input
                id="add-act-code"
                v-model="addDraft.shortCode"
                class="timely-input"
                placeholder="MED"
                @input="shortCodeEdited = true"
                maxlength="3"
                :aria-invalid="!!addErrors.shortCode"
                aria-describedby="add-act-code-error"
                @keydown.enter.prevent="submitAdd"
                @keydown.escape="closeAdd"
              />
              <p v-if="addErrors.shortCode" id="add-act-code-error" class="field-error">{{ addErrors.shortCode }}</p>
            </div>
            <div class="field">
              <label class="field-label" for="add-act-cat">Life area</label>
              <select id="add-act-cat" v-model="addDraft.categoryId" class="timely-select">
                <option v-for="cat in orderedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <PlannerAlsoCategories
            v-model="addDraft.alsoCategoryIds"
            :categories="orderedCategories"
            :primary-id="addDraft.categoryId"
          />

          <div class="field">
            <span class="field-label">Colour</span>
            <div class="color-pop color-pop-inline">
              <button
                v-for="dc in DESIGN_COLORS"
                :key="dc.id"
                type="button"
                :style="{ background: dc.bg }"
                :data-active="addDraft.color === dc.bg"
                :aria-label="`Colour ${dc.id}`"
                @click="addDraft.color = dc.bg"
              />
            </div>
          </div>
        </div>

        <div class="act-actions">
          <button class="btn btn-sm btn-primary" :disabled="!addDraft.name.trim()" @click="submitAdd">Add activity</button>
          <button class="btn btn-sm" @click="closeAdd">Cancel</button>
        </div>
      </div>
      <button v-else ref="addTrigger" type="button" class="chip-add act-add-trigger" @click="openAdd()">+ Add activity</button>
    </section>

    <!-- Year painter: full width, collapsible, closed by default. Shown only with two or more week types (otherwise the line below) -->
    <section v-if="templates.length > 1" class="section year-section" aria-labelledby="year-title">
      <details class="year-details" :open="yearOpen" @toggle="yearOpen = ($event.currentTarget as HTMLDetailsElement).open">
        <summary class="year-summary">
          <h2 id="year-title" class="section-title">Year</h2>
          <span v-if="year !== null" class="year-count">{{ assignedInYear }} of {{ weeks.length }} weeks assigned</span>
        </summary>

        <div class="year-body">
          <div class="year-paint-head">
            <div class="year-controls">
              <YearNav />
            </div>
          </div>

          <div class="paint-tools">
            <span class="field-label">Paint with</span>
            <button
              v-for="t in templates"
              :key="t.id"
              class="chip"
              :data-active="paintTool === t.id"
              @click="paintTool = t.id"
            >
              <span class="dot" :style="{ background: templateFill(t) }" />
              {{ t.name }}
            </button>
            <button class="chip" :data-active="paintTool === 'erase'" @click="paintTool = 'erase'">
              <span class="dot dot-erase" />
              Erase
            </button>
          </div>

          <div v-if="weeks.length" class="year-grid-scroll">
            <div class="year-grid" @mouseup="isYearPainting = false" @mouseleave="isYearPainting = false">
              <div v-for="(row, r) in yearRows" :key="r" class="year-row">
                <span class="year-row-label">{{ row.label }}</span>
                <div
                  v-for="week in row.weeks"
                  :key="week.wi"
                  class="week-cell"
                  :class="{ 'is-filled': !!appliedByDate.get(week.startDate), 'is-current': week.wi === currentWeekIndex }"
                  :style="cellStyle(week.startDate)"
                  :title="appliedByDate.get(week.startDate) ? `Week ${week.wi + 1} · ${templateById.get(appliedByDate.get(week.startDate)!)?.name}` : `Week ${week.wi + 1} · unassigned`"
                  @mousedown="isYearPainting = true; paintWeek(week.wi)"
                  @mouseenter="hoverWeek = week.wi; isYearPainting && paintWeek(week.wi)"
                  @mouseleave="hoverWeek = null"
                >{{ week.wi + 1 }}</div>
              </div>
            </div>
          </div>

          <div v-if="hoverWeek !== null" class="week-readout">
            Week {{ hoverWeek + 1 }} ·
            <span v-if="appliedByDate.get(weeks[hoverWeek]!)">
              {{ templateById.get(appliedByDate.get(weeks[hoverWeek]!)!)?.name }}
            </span>
            <span v-else class="muted">unassigned, click to paint</span>
          </div>
        </div>
      </details>
    </section>

    <!-- One week type: nothing to paint, so one line says which week type the year uses -->
    <p v-else-if="templates.length === 1 && year !== null" class="year-line">{{ yearLine }}</p>
  </div>
</template>
