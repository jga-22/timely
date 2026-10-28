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
import { PRESETS, PRESET_ROLES, ROLE_LABELS, getPreset, matchRole, type PresetRole } from '~/utils/presets'
import { inkOn } from '~/utils/palette'
import { shortCodeFor } from '~/utils/onboarding'
import { focusEditById, focusEditField } from '~/utils/focus'
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
const templateEditButton = ref<{ focus: () => void } | null>(null)
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
// New week type (FR-TPL-2, 6, 8): a panel with a Start from choice: empty, a copy of a week type, or a preset
const newTemplateInput = ref<HTMLInputElement | null>(null)
const newTemplatePanel = ref<HTMLElement | null>(null)
const newTemplateTrigger = ref<HTMLButtonElement | null>(null)
const newFrom = ref('empty')
const keepHabits = ref(true)
// Role mapping for a preset: an activity id, 'create' (a new activity) or '' (leave the role's hours empty)
const roleChoice = reactive<Record<PresetRole, string>>({ sleep: '', work: '', exercise: '' })
const newPreset = computed(() => (newFrom.value.startsWith('preset:') ? getPreset(newFrom.value.slice(7)) ?? null : null))
// Only the roles the preset paints get a mapping row: Vacation maps Sleep alone
const newPresetRoles = computed(() => PRESET_ROLES.filter(role => newPreset.value?.blocks.some(block => block.role === role)))

// Presets start from the activities they match by name; a role with no match is created (Sleep, Work) or left empty (Exercise)
watch(newFrom, (value) => {
  const preset = value.startsWith('preset:') ? getPreset(value.slice(7)) : undefined
  if (!preset) return

  keepHabits.value = preset.keepHabitsDefault
  for (const role of PRESET_ROLES) {
    roleChoice[role] = matchRole(planner.$state, role) ?? (role === 'exercise' ? '' : 'create')
  }
})

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
  nextTick(() => focusEditField(newTemplateInput.value, newTemplatePanel.value))
}

// Double-click renames a week type; the name field takes focus on a desktop, a phone keeps the keyboard down
function startRename(templateId: string) {
  renamingId.value = templateId
  nextTick(() => focusEditField(document.querySelector<HTMLElement>('.pill-input'), null))
}

function closeNewTemplate() {
  newTemplateOpen.value = false
  newTemplateName.value = ''
  newFrom.value = 'empty'
  nextTick(() => newTemplateTrigger.value?.focus())
}

function handleNewTemplate() {
  const name = newTemplateName.value.trim()
  const from = newFrom.value
  const preset = newPreset.value
  let templateId: string | null = null

  if (from === 'empty') {
    planner.createTemplate()
    if (name) planner.renameActiveTemplate(name)
    templateId = activeTemplate.value?.id ?? null
  } else if (from.startsWith('copy:')) {
    templateId = planner.duplicateTemplate(from.slice(5), name)
  } else if (preset) {
    // Roles the preset does not paint are sent as null, so no activity is created for them
    const mapping = Object.fromEntries(PRESET_ROLES.map(role => [role, newPresetRoles.value.includes(role) && roleChoice[role] !== '' ? roleChoice[role] : null])) as Record<PresetRole, string | 'create' | null>
    templateId = planner.createTemplateFromPreset(name, preset.id, mapping, keepHabits.value)
  }

  if (!templateId) return

  newTemplateName.value = ''
  newFrom.value = 'empty'
  newTemplateOpen.value = false

  // A time-off week type is usually applied to weeks next: open the year with it chosen and the first week field focused
  if (preset?.kind === 'break') openYearFor(templateId)
}

// ── Year: the Weeks row applies one week type to a range of weeks (FR-YEAR-7); the choice defaults to the active one ──
const weekRangeTemplate = ref<string | null>(null)
const weekRangeChoice = computed({
  get: () => weekRangeTemplate.value ?? activeTemplate.value?.id ?? '',
  set: (value: string) => {
    weekRangeTemplate.value = value
  }
})
const weekFrom = ref(1)
const weekTo = ref(1)
const weekFromInput = ref<HTMLInputElement | null>(null)
const weekRangeError = ref('')
const weekRangeResult = ref('')
const weekCount = computed(() => weeks.value.length)

function openYearFor(templateId: string) {
  weekRangeTemplate.value = templateId
  yearOpen.value = true
  nextTick(() => focusEditField(weekFromInput.value, weekFromInput.value?.closest<HTMLElement>('.weeks-row')))
}

function applyWeekRange() {
  const count = weekCount.value
  const from = weekFrom.value
  const to = weekTo.value

  if (!count) return

  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > count) {
    weekRangeError.value = `Enter week numbers from 1 to ${count}.`
    weekRangeResult.value = ''
    return
  }

  if (from > to) {
    weekRangeError.value = 'The first week must not come after the last one.'
    weekRangeResult.value = ''
    return
  }

  weekRangeError.value = ''
  const templateId = weekRangeChoice.value || null
  planner.setWeeksTemplate(weeks.value.slice(from - 1, to), templateId)

  const name = templateId ? (templateById.value.get(templateId)?.name ?? '') : ''
  weekRangeResult.value = templateId ? `Weeks ${from} to ${to} use ${name}.` : `Weeks ${from} to ${to} have no week type.`
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

  // One item in edit mode per screen: the week type editor closes
  templateEditOpen.value = false
  // Focus moves into the form once the route shows it, so Escape reaches the panel
  setSelection({ item: selectedActivity.value.id, edit: true }).then(() => nextTick(() => focusEditById('act-edit-name', 'act-edit-panel')))
}

const activityEditButton = ref<{ focus: () => void } | null>(null)

function finishEdit() {
  confirmingDelete.value = false
  if (!selectedActivity.value) return

  // Focus waits for the route to update, so the Edit button is rendered again and focus returns to it
  setSelection({ item: selectedActivity.value.id }, true).then(() => nextTick(() => activityEditButton.value?.focus()))
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
const addPanel = ref<HTMLElement | null>(null)
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
  nextTick(() => focusEditField(addNameInput.value, addPanel.value))
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
  nextTick(() => addTrigger.value?.focus())
  if (id) selectActivity(id)
}

// ── Schedule in the week (FR-PLAN-25): paints the selected activity into the active week type, as the grid does ──
const SCHEDULE_UNDO_MS = 8000
const scheduleDays = ref<number[]>([])
const scheduleDuration = ref(1)
const scheduleStart = ref(9)
const scheduleError = ref('')
const scheduleResult = ref<{ text: string; templateId: string; slots: string[] } | null>(null)
// The schedule is a collapsible under the activity detail, closed by default (FR-PLAN-25)
const scheduleOpen = ref(false)
const scheduleToggle = ref<HTMLButtonElement | null>(null)
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
  scheduleOpen.value = false
  dismissScheduleResult()
}

watch(() => selectedActivity.value?.id ?? null, resetSchedule, { immediate: true })

// Close (or Escape) hides the form and keeps an applied schedule; focus goes back to the button that opened it
function closeSchedule() {
  scheduleOpen.value = false
  nextTick(() => scheduleToggle.value?.focus())
}

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

    <!-- New week type: a name and a Start from choice (empty, a copy, or a preset with its role mapping) -->
    <div v-if="newTemplateOpen" ref="newTemplatePanel" class="act-panel new-template-panel" tabindex="-1" @keydown.escape.stop="closeNewTemplate">
      <div class="act-panel-head">
        <h3 class="act-panel-title">New week type</h3>
      </div>
      <div class="form-stack">
        <div class="field">
          <label class="field-label" for="new-template-name">Name</label>
          <input
            id="new-template-name"
            ref="newTemplateInput"
            v-model="newTemplateName"
            class="timely-input"
            placeholder="e.g. Launch week"
            @keydown.enter.prevent="handleNewTemplate"
          />
        </div>

        <div class="field">
          <label class="field-label" for="new-template-from">Start from</label>
          <select id="new-template-from" v-model="newFrom" class="timely-select">
            <option value="empty">Empty</option>
            <option v-for="t in templates" :key="t.id" :value="`copy:${t.id}`">Copy of {{ t.name }}</option>
            <option v-for="p in PRESETS" :key="p.id" :value="`preset:${p.id}`">{{ p.name }}</option>
          </select>
        </div>

        <template v-if="newPreset">
          <p class="new-template-lede">{{ newPreset.description }}</p>

          <div class="role-rows">
            <div v-for="role in newPresetRoles" :key="role" class="role-row">
              <label class="field-label role-label" :for="`role-${role}`">{{ ROLE_LABELS[role] }}</label>
              <select :id="`role-${role}`" v-model="roleChoice[role]" class="timely-select">
                <option v-for="act in planner.activities" :key="act.id" :value="act.id">{{ act.name }}</option>
                <option value="create">Create "{{ ROLE_LABELS[role] }}"</option>
                <option value="">Leave empty</option>
              </select>
            </div>
          </div>

          <label class="check">
            <input v-model="keepHabits" type="checkbox" />
            Keep my habit sessions
          </label>
        </template>
      </div>

      <div class="act-actions">
        <button class="btn btn-sm btn-primary" @click="handleNewTemplate">Add week type</button>
        <button class="btn btn-sm" @click="closeNewTemplate">Cancel</button>
      </div>
    </div>

    <!-- Template edit: name, colour and delete for the active template; changes apply at once (FR-UX-2) -->
    <div v-if="templateEditOpen && activeTemplate" class="act-panel template-edit" @keydown.escape.stop="closeTemplateEdit">
      <div class="act-panel-head">
        <h3 class="act-panel-title">Edit week type</h3>
        <button type="button" class="btn btn-sm btn-primary" @click="closeTemplateEdit">Done</button>
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
        <div class="field">
          <label class="check">
            <input
              type="checkbox"
              :checked="activeTemplate.kind === 'break'"
              @change="planner.setTemplateKind(activeTemplate.id, ($event.target as HTMLInputElement).checked ? 'break' : undefined)"
            />
            Time off: Goals does not compare against this week type
          </label>
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
        <EditButton ref="activityEditButton" :label="`Edit ${selectedActivity.name}`" :expanded="editing" @click="startEdit" />
      </div>

      <!-- Schedule in the week (FR-PLAN-25): closed by default. The active week type; hours it replaces belong to other activities -->
      <div v-if="selectedActivity && !editing" class="act-schedule-toggle">
        <button
          ref="scheduleToggle"
          type="button"
          class="btn btn-sm"
          :aria-expanded="scheduleOpen ? 'true' : 'false'"
          :aria-controls="scheduleOpen ? 'act-schedule' : undefined"
          @click="scheduleOpen = !scheduleOpen"
          @keydown.escape.stop="scheduleOpen && closeSchedule()"
        >Schedule in the week</button>
      </div>

      <section v-if="selectedActivity && !editing && scheduleOpen" id="act-schedule" class="act-panel act-schedule" aria-labelledby="act-schedule-title" @keydown.escape.stop="closeSchedule">
        <div class="act-panel-head">
          <h3 id="act-schedule-title" class="act-panel-title">Schedule in the week</h3>
          <button type="button" class="btn btn-sm" @click="closeSchedule">Close</button>
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
      </section>

      <!-- The result stays under the button after the form closes, so its Undo is still there -->
      <div v-if="selectedActivity && !editing && scheduleResult" class="sched-result" role="status">
        <span>{{ scheduleResult.text }}</span>
        <button type="button" class="btn btn-sm" @click="undoSchedule">Undo</button>
      </div>

      <!-- Inline edit of the selected activity: changes apply at once; Done leaves edit mode -->
      <div v-if="editing && selectedActivity" id="act-edit-panel" class="act-panel" tabindex="-1" @keydown="onEditKeydown">
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
      <div v-if="addOpen" ref="addPanel" class="act-panel" tabindex="-1" @keydown.escape="closeAdd">
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

    <!-- Year: full width, collapsible, closed by default with any number of week types. With one week type a line says which one the year uses -->
    <section class="section year-section" aria-labelledby="year-title">
      <details class="year-details" :open="yearOpen" @toggle="yearOpen = ($event.currentTarget as HTMLDetailsElement).open">
        <summary class="year-summary">
          <h2 id="year-title" class="section-title">Year</h2>
          <span v-if="year !== null" class="year-count">{{ assignedInYear }} of {{ weeks.length }} weeks assigned</span>
        </summary>

        <div class="year-body">
          <p v-if="templates.length === 1 && year !== null" class="year-line">{{ yearLine }}</p>

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

          <!-- Weeks: one week type for a range of weeks, typed rather than painted (FR-YEAR-7) -->
          <div class="weeks-row" role="group" aria-labelledby="weeks-row-title" tabindex="-1">
            <span id="weeks-row-title" class="field-label">Weeks</span>
            <div class="weeks-row-line">
              <label class="weeks-part" for="weeks-template">Use</label>
              <select id="weeks-template" v-model="weekRangeChoice" class="timely-select weeks-select">
                <option value="">No week type</option>
                <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <label class="weeks-part" for="weeks-from">for weeks</label>
              <input
                id="weeks-from"
                ref="weekFromInput"
                v-model.number="weekFrom"
                class="timely-input weeks-num"
                type="number"
                inputmode="numeric"
                min="1"
                :max="weekCount"
                :aria-invalid="!!weekRangeError"
                aria-describedby="weeks-error"
              />
              <label class="weeks-part" for="weeks-to">to</label>
              <input
                id="weeks-to"
                v-model.number="weekTo"
                class="timely-input weeks-num"
                type="number"
                inputmode="numeric"
                min="1"
                :max="weekCount"
                :aria-invalid="!!weekRangeError"
                aria-describedby="weeks-error"
              />
              <button type="button" class="btn btn-sm btn-primary" @click="applyWeekRange">Apply</button>
            </div>
            <p v-if="weekRangeError" id="weeks-error" class="field-error" role="alert">{{ weekRangeError }}</p>
            <p v-else-if="weekRangeResult" class="weeks-result" role="status">{{ weekRangeResult }}</p>
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
  </div>
</template>
