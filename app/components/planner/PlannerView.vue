<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import {
  DESIGN_COLORS,
  aggregateTemplate,
  validateActivityFields,
  type ActivityFieldErrors
} from '~/utils/planner'
import type { Activity } from '~/types/planner'

const planner = usePlannerStore()
const { activeTemplate, templates, appliedWeeks } = storeToRefs(planner)
const { year, weeks, currentWeekIndex } = usePlannerYear()
const { item, edit, link, setSelection } = useNav()
const { categoryMap } = usePlannerMaps()

// ── Template switcher ──
const renamingId = ref<string | null>(null)
const colorPickerFor = ref<string | null>(null)
const newTemplateOpen = ref(false)
const newTemplateName = ref('')
const paintTool = ref(templates.value[0]?.id ?? '')

// ── Computed ──
const totalPlanned = computed(() =>
  activeTemplate.value?.slots.filter(Boolean).length ?? 0
)
const templateColor = (t: typeof templates.value[0]) => t.color ?? '#5d6b7a'

// ── Year painter ──
const isYearPainting = ref(false)
const hoverWeek = ref<number | null>(null)
const appliedByDate = computed(() => {
  const m = new Map<string, string>()
  for (const w of appliedWeeks.value) m.set(w.startDate, w.templateId)
  return m
})
const assignedInYear = computed(() => weeks.value.filter(startDate => appliedByDate.value.has(startDate)).length)
const templateById = computed(() => new Map(templates.value.map(t => [t.id, t])))
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function paintWeek(wi: number) {
  const startDate = weeks.value[wi]
  if (startDate) planner.setWeekTemplate(startDate, paintTool.value === 'erase' ? null : paintTool.value)
}

// Background colour for a year cell: the template painted on that week
const cellStyle = (startDate: string) => {
  const tpl = templateById.value.get(appliedByDate.value.get(startDate) ?? '')
  return tpl ? { '--c': templateColor(tpl) } : undefined
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

// ── Activities: list, detail, edit (FR-PLAN-13 to 16) ──
const orderedCategories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))
const selectedActivity = computed(() => planner.activities.find(activity => activity.id === item.value) ?? null)
const editing = computed(() => !!selectedActivity.value && edit.value)
const editButton = ref<HTMLButtonElement | null>(null)

const hoursText = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1))
const plural = (count: number, singular: string, pluralForm: string) => `${count} ${count === 1 ? singular : pluralForm}`
const colourName = (color: string) => {
  const swatch = DESIGN_COLORS.find(entry => entry.bg.toLowerCase() === color.toLowerCase())
  return swatch ? swatch.id.charAt(0).toUpperCase() + swatch.id.slice(1) : `Custom (${color})`
}

// Hours per week in the template being edited (the list and the detail both read this)
const activeHours = computed(() => (activeTemplate.value ? aggregateTemplate(activeTemplate.value, planner.activities) : new Map<string, number>()))
const categoryName = (categoryId: string) => categoryMap.value.get(categoryId)?.name ?? 'No category'
const otherTemplateLine = computed(() => {
  const activity = selectedActivity.value
  if (!activity) return ''

  return planner.templates
    .filter(template => template.id !== activeTemplate.value?.id)
    .map(template => ({ name: template.name, hours: aggregateTemplate(template, planner.activities).get(activity.id) ?? 0 }))
    .filter(entry => entry.hours > 0)
    .map(entry => `${hoursText(entry.hours)} h in ${entry.name}`)
    .join(', ')
})
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

  if (hours > 0) parts.push(`clears ${hoursText(hours)} h in ${plural(templateCount, 'template', 'templates')}`)
  if (habitCount > 0) parts.push(`unlinks ${plural(habitCount, 'habit', 'habits')}`)
  if (!parts.length) return 'Nothing is scheduled or linked to it.'

  const sentence = parts.join(' and ')
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
})

// Selection and edit mode live in the URL: a selection is a history entry, Done replaces it (FR-UX-5)
function selectActivity(activityId: string) {
  setSelection({ item: activityId })
}

function backToList() {
  setSelection({})
}

function startEdit() {
  if (!selectedActivity.value) return

  // Focus moves into the form once the route shows it, so Escape reaches the detail
  setSelection({ item: selectedActivity.value.id, edit: true }).then(() => nextTick(() => document.getElementById('act-edit-name')?.focus()))
}

function finishEdit() {
  confirmingDelete.value = false
  if (!selectedActivity.value) return

  // Focus waits for the route to update, so the Edit button is rendered again
  setSelection({ item: selectedActivity.value.id }, true).then(() => nextTick(() => editButton.value?.focus()))
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

function applyField(changes: Partial<Pick<Activity, 'name' | 'shortCode' | 'categoryId' | 'color'>>) {
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

function onDetailKeydown(event: KeyboardEvent) {
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

// New activity: a quiet button reveals the form (progressive disclosure)
const addOpen = ref(false)
const addDraft = reactive({ name: '', shortCode: '', categoryId: '', color: '' })
const addErrors = ref<ActivityFieldErrors>({})
const addNameInput = ref<HTMLInputElement | null>(null)
const addTrigger = ref<HTMLButtonElement | null>(null)

// A new activity starts in its category's colour; changing the category follows it
watch(() => addDraft.categoryId, (categoryId) => {
  addDraft.color = categoryMap.value.get(categoryId)?.color ?? DESIGN_COLORS[0]!.bg
})

function openAdd() {
  addDraft.name = ''
  addDraft.shortCode = ''
  addDraft.categoryId = orderedCategories.value[0]?.id ?? ''
  addErrors.value = {}
  addOpen.value = true
  nextTick(() => addNameInput.value?.focus())
}

function closeAdd() {
  addOpen.value = false
  nextTick(() => addTrigger.value?.focus())
}

function submitAdd() {
  const errors = validateActivityFields(planner.$state, {
    name: addDraft.name,
    shortCode: addDraft.shortCode,
    categoryId: addDraft.categoryId
  })
  addErrors.value = errors

  if (Object.keys(errors).length) return

  const id = planner.addActivity(addDraft.name, addDraft.shortCode, addDraft.categoryId, addDraft.color)
  addOpen.value = false
  if (id) setSelection({ item: id })
}
</script>

<template>
  <div class="view" @click="colorPickerFor = null">
    <!-- Page header -->
    <header class="page-head">
      <h1 class="page-title">Design your ideal week, hour by hour.</h1>
      <p class="page-lede">
        Pick an activity, then paint the hours it takes across the week.
        With no activity selected, the grid shows the whole template.
      </p>
      <p class="page-meta">{{ totalPlanned }} of 168 hours planned this week</p>
    </header>

    <!-- Template switcher -->
    <div class="template-switch">
      <span class="field-label">Template</span>

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
            :style="{ background: templateColor(t) }"
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
      <button v-else class="chip-add" @click="newTemplateOpen = true">+ New template</button>

      <button
        v-if="templates.length > 1"
        ref="deleteTemplateTrigger"
        type="button"
        class="btn btn-xs btn-danger delete-template-btn"
        @click.stop="askDeleteTemplate"
      >
        <span class="delete-template-btn-label">Delete "{{ activeTemplate?.name }}"</span>
        <span class="delete-template-btn-icon" aria-hidden="true">✕</span>
      </button>
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
        <button type="button" class="btn btn-sm btn-danger" @click="confirmDeleteActiveTemplate">Delete template</button>
        <button ref="cancelTemplateDeleteButton" type="button" class="btn btn-sm" @click="cancelDeleteTemplate">Cancel</button>
      </div>
    </div>

    <!-- Activities: list, then detail in view or edit mode -->
    <section class="section" aria-labelledby="activities-title">
      <div class="list-head">
        <h2 id="activities-title" class="section-title">Activities</h2>
      </div>
      <p class="section-lede">
        Hours are for <strong>{{ activeTemplate?.name ?? 'no template' }}</strong>, the template being edited.
        Select an activity to see its detail.
      </p>

      <div class="act-layout" :data-selected="selectedActivity ? 'true' : 'false'">
        <div class="act-list">
          <p v-if="!planner.activities.length" class="act-empty">No activities yet. Add one to plan when it happens.</p>

          <ul v-else class="act-rows">
            <li v-for="activity in planner.activities" :key="activity.id">
              <button
                type="button"
                class="act-row"
                :aria-pressed="selectedActivity?.id === activity.id"
                @click="selectActivity(activity.id)"
              >
                <span class="dot dot-lg" :style="{ background: activity.color }" />
                <span class="act-row-main">
                  <span class="act-row-name">{{ activity.name }}</span>
                  <span class="act-row-meta">{{ activity.shortCode }} · {{ categoryName(activity.categoryId) }}</span>
                </span>
                <span class="act-row-hours">{{ hoursText(activeHours.get(activity.id) ?? 0) }} <span class="unit">h/wk</span></span>
              </button>
            </li>
          </ul>

          <div v-if="addOpen" class="act-add">
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
                    maxlength="3"
                    :aria-invalid="!!addErrors.shortCode"
                    aria-describedby="add-act-code-error"
                    @keydown.enter.prevent="submitAdd"
                    @keydown.escape="closeAdd"
                  />
                  <p v-if="addErrors.shortCode" id="add-act-code-error" class="field-error">{{ addErrors.shortCode }}</p>
                </div>
                <div class="field">
                  <label class="field-label" for="add-act-cat">Category</label>
                  <select id="add-act-cat" v-model="addDraft.categoryId" class="timely-select">
                    <option v-for="cat in orderedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
              </div>

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
              <button class="btn btn-primary" :disabled="!addDraft.name.trim() || !addDraft.shortCode.trim()" @click="submitAdd">Add activity</button>
              <button class="btn" @click="closeAdd">Cancel</button>
            </div>
          </div>
          <button v-else ref="addTrigger" type="button" class="chip-add act-add-trigger" @click="openAdd">+ Add activity</button>
        </div>

        <div class="act-detail" @keydown="onDetailKeydown">
          <template v-if="selectedActivity">
            <div class="act-detail-head">
              <button type="button" class="btn btn-sm act-back" @click="backToList">Back to list</button>
              <h3 class="act-detail-name">
                <span class="dot dot-lg" :style="{ background: selectedActivity.color }" />
                {{ selectedActivity.name }}
              </h3>
              <button
                v-if="!editing"
                ref="editButton"
                type="button"
                class="btn btn-sm btn-outline"
                :aria-label="`Edit ${selectedActivity.name}`"
                @click="startEdit"
              >Edit</button>
              <button v-else type="button" class="btn btn-sm btn-primary" @click="finishEdit">Done</button>
            </div>

            <!-- View mode: read-only facts; the linked habits are shown here and edited in Goals -->
            <dl v-if="!editing" class="act-facts">
              <dt>Short code</dt>
              <dd>{{ selectedActivity.shortCode }}</dd>

              <dt>Category</dt>
              <dd><NuxtLink :to="link('goals')">{{ categoryName(selectedActivity.categoryId) }}</NuxtLink></dd>

              <dt>Colour</dt>
              <dd>{{ colourName(selectedActivity.color) }}</dd>

              <dt>Hours</dt>
              <dd>
                {{ hoursText(activeHours.get(selectedActivity.id) ?? 0) }} h a week in {{ activeTemplate?.name ?? 'no template' }}
                <span v-if="otherTemplateLine" class="act-quiet">Also {{ otherTemplateLine }}.</span>
              </dd>

              <dt>Habits</dt>
              <dd>
                <template v-if="linkedHabits.length">
                  {{ linkedHabits.map(habit => habit.name).join(', ') }}
                </template>
                <span v-else class="act-quiet">None linked yet.</span>
                <span class="act-quiet">
                  <NuxtLink :to="link('goals')">Link habits in Goals</NuxtLink>
                </span>
              </dd>
            </dl>

            <!-- Edit mode: changes apply at once; Done leaves edit mode -->
            <div v-else class="act-edit">
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
                    <label class="field-label" for="act-edit-cat">Category</label>
                    <select
                      id="act-edit-cat"
                      class="timely-select"
                      :value="selectedActivity.categoryId"
                      @change="applyField({ categoryId: ($event.target as HTMLSelectElement).value })"
                    >
                      <option v-for="cat in orderedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                    <p v-if="editErrors.categoryId" class="field-error">{{ editErrors.categoryId }}</p>
                  </div>
                </div>

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
          </template>

          <p v-else class="act-detail-empty">Select an activity to see its detail.</p>
        </div>
      </div>
    </section>

    <!-- 24x7 activity grid: paints the selected activity, or shows the template overview -->
    <!-- Client only: the grid is state-driven, and server HTML would keep the seed cells after hydration -->
    <ClientOnly>
      <PlannerActivityGrid :activity="selectedActivity" @select="selectActivity" />
    </ClientOnly>

    <!-- Year painter -->
    <section class="section">
      <div class="year-paint-head">
        <div>
          <h2 class="section-title">Year</h2>
          <p class="section-lede">Choose a template, then click or drag across weeks to assign it.</p>
        </div>
        <div class="year-controls">
          <YearNav />
          <div v-if="year !== null" class="year-count">{{ assignedInYear }} of {{ weeks.length }} weeks assigned</div>
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
          <span class="dot" :style="{ background: templateColor(t) }" />
          {{ t.name }}
        </button>
        <button class="chip" :data-active="paintTool === 'erase'" @click="paintTool = 'erase'">
          <span class="dot dot-erase" />
          Erase
        </button>
      </div>

      <div v-if="weeks.length" class="year-grid-scroll">
        <div class="year-months">
          <div v-for="m in MONTHS" :key="m" class="m">{{ m }}</div>
        </div>

        <div class="year-grid" @mouseup="isYearPainting = false" @mouseleave="isYearPainting = false">
          <div
            v-for="(startDate, wi) in weeks"
            :key="wi"
            class="week-cell"
            :class="{ 'is-filled': !!appliedByDate.get(startDate), 'is-current': wi === currentWeekIndex }"
            :style="cellStyle(startDate)"
            :title="appliedByDate.get(startDate) ? `Week ${wi + 1} · ${templateById.get(appliedByDate.get(startDate)!)?.name}` : `Week ${wi + 1} · unassigned`"
            @mousedown="isYearPainting = true; paintWeek(wi)"
            @mouseenter="hoverWeek = wi; isYearPainting && paintWeek(wi)"
            @mouseleave="hoverWeek = null"
          >{{ wi + 1 }}</div>
        </div>
      </div>

      <div v-if="hoverWeek !== null" class="week-readout">
        Week {{ hoverWeek + 1 }} ·
        <span v-if="appliedByDate.get(weeks[hoverWeek]!)">
          {{ templateById.get(appliedByDate.get(weeks[hoverWeek]!)!)?.name }}
        </span>
        <span v-else class="muted">unassigned, click to paint</span>
      </div>
    </section>
  </div>
</template>
