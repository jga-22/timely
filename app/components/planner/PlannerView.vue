<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { DESIGN_COLORS, aggregateTemplate, formatHour } from '~/utils/planner'
import { dayText, durationText, entryDraftOf, frequencyText } from '~/utils/entries'
import { PRESETS, PRESET_ROLES, ROLE_LABELS, getPreset, matchRole, type PresetRole } from '~/utils/presets'
import { inkOn } from '~/utils/palette'
import { focusEditField } from '~/utils/focus'
import { clockLabel, isSleepActivity, readSleep, sleepActivityId, sleepSummary } from '~/utils/sleep'

const planner = usePlannerStore()
const { activeTemplate, templates, appliedWeeks } = storeToRefs(planner)
const { year, weeks, currentWeekIndex } = usePlannerYear()
const { item, edit, setSelection } = useNav()
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

// ── Activities and habits (FR-ITEM-4): one list of entries. An entry is a habit with its linked activity, or an activity that no habit
// links to. ?item= holds the habit's id or the activity's id; an activity resolves to the habit that links it, so one entry has one key
const orderedCategories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))
const categoryName = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'No life area'
const hoursText = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1))

// Hours per week in the active template: the chips read this
const activeHours = computed(() => (activeTemplate.value ? aggregateTemplate(activeTemplate.value, planner.activities) : new Map<string, number>()))

/** The selected entry: a habit and its activity (null when it has none), or an activity and the habit that links it (null when none does) */
const selected = computed<{ habitId: string | null; activityId: string | null } | null>(() => {
  const id = item.value
  if (!id) return null

  const habit = planner.habits.find(entry => entry.id === id)
  if (habit) {
    const activityId = planner.activities.some(activity => activity.id === habit.activityId) ? habit.activityId ?? null : null
    return { habitId: habit.id, activityId }
  }

  const activity = planner.activities.find(entry => entry.id === id)
  if (activity) {
    return { habitId: planner.habits.find(entry => entry.activityId === activity.id)?.id ?? null, activityId: activity.id }
  }

  return null
})

const selectedDraft = computed(() => (selected.value ? entryDraftOf(planner.$state, selected.value.habitId, selected.value.activityId) : null))
const editing = computed(() => !!selected.value && edit.value)

// ── Sleep (FR-SLEEP-2 to 4): its own row above the chips, which opens its editor; the chips list every other activity
const sleepId = computed(() => sleepActivityId(planner.$state))
const plannerActivities = computed(() => planner.activities.filter(activity => !isSleepActivity(activity)))
const sleepColor = computed(() => planner.activities.find(activity => activity.id === sleepId.value)?.color ?? '#6e5c7c')
/** The Sleep row's time: from the active week type's painted nights (10 PM to 7 AM) */
const sleepWhen = computed(() => {
  if (!sleepId.value || !activeTemplate.value) return ''

  return sleepSummary(readSleep(activeTemplate.value.slots, sleepId.value))
})

/** A save with no Sleep activity gets the default night in the active week type (FR-SLEEP-2) */
function setUpSleep() {
  const result = planner.setupSleep()
  if (result) showResult(result.text, result.undo)
}

/** Habits with no activity (no time): the Habits list. Every activity is a timed entry (a chip) */
const habitOnly = computed(() => planner.habits.filter(habit => !planner.activities.some(activity => activity.id === habit.activityId)))


const selectedName = computed(() => selectedDraft.value?.name ?? '')
const selectedColor = computed(() => selectedDraft.value?.color ?? '#888')

/** The summary line of the selected entry: code, life area, when and where it is painted, or its frequency when it has no time */
const summaryLine = computed(() => {
  const draft = selectedDraft.value
  if (!draft || !selected.value) return ''

  const parts = [draft.activityId ? draft.shortCode : '', categoryName(draft.categoryId)]

  if (selected.value.activityId) {
    parts.push(draft.days.length ? `${dayText(draft.days)} at ${formatHour(draft.start)}, ${durationText(draft.durationMinutes)}` : 'no days yet')
    parts.push(draft.templateIds.length
      ? `in ${draft.templateIds.map(id => planner.templates.find(template => template.id === id)?.name ?? '').filter(Boolean).join(', ')}`
      : 'not in a week type')
  } else {
    const habit = planner.habits.find(entry => entry.id === selected.value?.habitId)
    if (habit) parts.push(frequencyText(habit.frequency))
  }

  return parts.filter(Boolean).join(' · ')
})

// ── The one form (ActivityForm): one entry at a time. A new entry is added from the "+ Add" button at the end of the section
const adding = ref(false)
const addTrigger = ref<HTMLButtonElement | null>(null)
const selectedEditButton = ref<{ focus: () => void } | null>(null)
const { resultText, canUndo, showResult, undoResult } = useEntryResult()

function selectEntry(key: string) {
  adding.value = false
  setSelection({ item: key })
}

function editEntry(key: string) {
  adding.value = false
  // One item in edit mode per screen: the week type editor closes
  templateEditOpen.value = false
  setSelection({ item: key, edit: true })
}

function startEdit() {
  if (selected.value && item.value) editEntry(item.value)
}

function openAdd() {
  adding.value = true
  templateEditOpen.value = false
  if (editing.value) setSelection({}, true)
}

// Done, Cancel, Escape and a removal all leave the form here; focus returns to the Edit button of the entry, or to "+ Add"
function closeEdit() {
  setSelection({ item: item.value ?? undefined }, true).then(() => nextTick(() => selectedEditButton.value?.focus()))
}

function closeAdd() {
  adding.value = false
  nextTick(() => addTrigger.value?.focus())
}

function onSaved(result: { text?: string; undo?: Array<{ templateId: string; slots: string[] }> }) {
  if (result.text) showResult(result.text, result.undo ?? [])
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
            Time off: Goals reads its hours from a working week type
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

    <!-- Activities and habits (FR-ITEM-4): one list. Timed entries are chips with their hours in the active week type; habits with no time
         are listed under them. Each opens the one form, inline; "+ Add" opens it for a new entry -->
    <section class="section acts" aria-labelledby="activities-title">
      <div class="acts-head">
        <h2 id="activities-title" class="section-title">Activities and habits</h2>
      </div>

      <div class="sleep-row">
        <button
          v-if="sleepId"
          type="button"
          class="chip"
          :data-active="selected?.activityId === sleepId"
          :aria-pressed="selected?.activityId === sleepId"
          @click="editEntry(sleepId)"
        >
          <span class="dot" :style="{ background: sleepColor }" />
          <span class="t-name">Sleep</span>
          <span class="sleep-row-when">{{ sleepWhen }}</span>
          <span class="pill-count">{{ hoursText(activeHours.get(sleepId) ?? 0) }}h</span>
        </button>
        <button v-else type="button" class="chip-add" @click="setUpSleep">Set up sleep</button>
      </div>

      <ul class="act-list">
        <li v-for="activity in plannerActivities" :key="activity.id">
          <button
            type="button"
            class="chip"
            :data-active="selected?.activityId === activity.id"
            :aria-pressed="selected?.activityId === activity.id"
            @click="selectEntry(activity.id)"
          >
            <span class="dot" :style="{ background: activity.color }" />
            <span class="t-name">{{ activity.name }}</span>
            <span class="pill-count">{{ hoursText(activeHours.get(activity.id) ?? 0) }}h</span>
          </button>
        </li>
      </ul>

      <div v-if="habitOnly.length" class="entry-habits">
        <h3 class="entry-habits-title">Habits</h3>
        <ul class="row-list">
          <li v-for="habit in habitOnly" :key="habit.id" class="row-item">
            <span class="dot" :style="{ background: categoryMap.get(habit.categoryId)?.color ?? '#888' }" aria-hidden="true" />
            <span class="row-main">
              <span class="row-name">{{ habit.name }}</span>
              <span class="row-meta">{{ categoryName(habit.categoryId) }} · {{ frequencyText(habit.frequency) }}</span>
            </span>
            <EditButton :label="`Edit ${habit.name}`" @click="editEntry(habit.id)" />
          </li>
        </ul>
      </div>

      <p v-if="!planner.activities.length && !habitOnly.length" class="acts-empty">No activities or habits yet. Add one to plan when it happens.</p>

      <div v-if="selected && !editing && !adding" class="act-detail">
        <span class="dot dot-lg" :style="{ background: selectedColor }" />
        <div class="act-detail-main">
          <span class="act-detail-name">{{ selectedName }}</span>
          <span class="act-detail-sub">{{ summaryLine }}</span>
        </div>
        <EditButton ref="selectedEditButton" :label="`Edit ${selectedName}`" :expanded="editing" @click="startEdit" />
      </div>

      <!-- The result stays under the list after the form closes, so its Undo is still there (8 s) -->
      <div v-if="resultText" class="sched-result" role="status">
        <span>{{ resultText }}</span>
        <button v-if="canUndo" type="button" class="btn btn-sm" @click="undoResult">Undo</button>
      </div>

      <ActivityForm
        v-if="selected && editing"
        :key="`edit-${selected.habitId ?? ''}-${selected.activityId ?? ''}`"
        :habit-id="selected.habitId"
        :activity-id="selected.activityId"
        @saved="onSaved"
        @close="closeEdit"
      />

      <ActivityForm
        v-if="adding"
        key="add"
        :habit-id="null"
        :activity-id="null"
        :category-id="orderedCategories[0]?.id"
        @saved="onSaved"
        @close="closeAdd"
      />
      <button v-else ref="addTrigger" type="button" class="chip-add act-add-trigger" @click="openAdd">+ Add</button>
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
