<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import {
  DAYS,
  DESIGN_COLORS,
  aggregateTemplate,
  slotsToBlocks,
  formatHour,
  validateActivityFields,
  type ActivityFieldErrors
} from '~/utils/planner'
import type { Activity } from '~/types/planner'

const HOUR_PX = 28

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

// ── Range selection ──
type Sel = { day: number; start: number; end: number }
const selection = ref<Sel | null>(null)
const selAnchor = ref<{ day: number; hour: number } | null>(null)
const isSelecting = ref(false)

// Whether the current selection overlaps any existing (non-empty) slot —
// used to switch the action bar between "Apply" (fresh) and "Change/Delete" (editing).
const selectionHasActivity = computed(() => {
  const sel = selection.value
  const tpl = activeTemplate.value
  if (!sel || !tpl) return false
  for (let h = sel.start; h < sel.end; h++) {
    if (tpl.slots[sel.day * 24 + h]) return true
  }
  return false
})

// ── Action bar (appears after selection, before activity picker) ──
const showActionBar = ref(false)
const actionBarPos = ref({ x: 0, y: 0 })

// ── Activity picker menu ──
const showMenu = ref(false)
const menuPos = ref({ x: 0, y: 0 })

// ── Resize state ──
const isEditingSize = ref(false)
const editSizeSnapshot = ref<Sel | null>(null)
const editSizeActivityId = ref<string | null>(null)
const resizing = ref<'top' | 'bottom' | null>(null)
const resizeDayEl = ref<HTMLElement | null>(null)

// Default activity applied when confirming an empty selection (falls back to work / first)
const defaultActivityId = computed(() => {
  const acts = planner.activities
  const work = acts.find(a => /work/i.test(a.name))
  return work?.id ?? acts[0]?.id ?? ''
})

// ── Block hover (keyed by day·start·end to survive re-renders) ──
const hoveredBlockKey = ref<string | null>(null)

function blockKey(day: number, start: number, end: number) {
  return `${day}-${start}-${end}`
}

// ── Computed ──
const totalPlanned = computed(() =>
  activeTemplate.value?.slots.filter(Boolean).length ?? 0
)
const activityHours = computed(() => {
  const h: Record<string, number> = {}
  if (!activeTemplate.value) return h
  for (const slot of activeTemplate.value.slots) {
    if (slot) h[slot] = (h[slot] || 0) + 1
  }
  return h
})
const hoursPerDay = computed(() => {
  const totals = new Array(7).fill(0)
  if (!activeTemplate.value) return totals
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (activeTemplate.value.slots[d * 24 + h]) totals[d]++
    }
  }
  return totals
})
const blocksByDay = computed(() => {
  if (!activeTemplate.value) return {} as Record<number, ReturnType<typeof slotsToBlocks>>
  const result: Record<number, ReturnType<typeof slotsToBlocks>> = {}
  for (let d = 0; d < 7; d++) result[d] = slotsToBlocks(activeTemplate.value.slots, d)
  return result
})
const activityMap = computed(() => new Map(planner.activities.map(a => [a.id, a])))
const templateColor = (t: typeof templates.value[0]) => t.color ?? '#5d6b7a'

function isBlockHovered(day: number, block: { start: number; end: number }) {
  return hoveredBlockKey.value === blockKey(day, block.start, block.end)
}

// ── Selection logic ──
function startSelection(day: number, hour: number) {
  isSelecting.value = true
  selAnchor.value = { day, hour }
  selection.value = { day, start: hour, end: hour + 1 }
  showMenu.value = false
  showActionBar.value = false
}

function extendSelection(day: number, hour: number) {
  if (!isSelecting.value || !selAnchor.value) return
  if (selAnchor.value.day !== day) return
  const anchor = selAnchor.value.hour
  selection.value = {
    day,
    start: Math.min(anchor, hour),
    end: Math.max(anchor, hour) + 1
  }
}

function openActionBarAt(clientX: number, clientY: number) {
  const small = window.innerWidth <= 480
  actionBarPos.value = {
    x: small ? 16 : Math.min(clientX + 16, window.innerWidth - 240),
    y: small ? window.innerHeight - 120 : Math.min(clientY - 10, window.innerHeight - 120),
  }
  showActionBar.value = true
}

function openMenuAt(clientX: number, clientY: number) {
  const small = window.innerWidth <= 480
  menuPos.value = {
    x: small ? 16 : Math.min(clientX + 16, window.innerWidth - 248),
    y: small ? window.innerHeight - 380 : Math.min(clientY - 10, window.innerHeight - 360),
  }
  showMenu.value = true
}

function finishSelection(e: MouseEvent) {
  if (!isSelecting.value || !selection.value) { isSelecting.value = false; return }
  isSelecting.value = false
  openActionBarAt(e.clientX, e.clientY)
}

function applyActivity(activityId: string) {
  if (!selection.value) return
  planner.applyTimeRange(activityId, [selection.value.day], selection.value.start, selection.value.end)
  closeAll()
}

function clearSelection() {
  if (!selection.value) return
  planner.clearTimeRange([selection.value.day], selection.value.start, selection.value.end)
  closeAll()
}

function pickFromActionBar() {
  if (!selection.value) return
  showActionBar.value = false
  openMenuAt(actionBarPos.value.x, actionBarPos.value.y)
}

function closeAll() {
  showMenu.value = false
  showActionBar.value = false
  isEditingSize.value = false
  editSizeSnapshot.value = null
  editSizeActivityId.value = null
  selection.value = null
}

function enterSizeEdit() {
  const sel = selection.value
  const tpl = activeTemplate.value
  if (!sel || !tpl) return
  editSizeSnapshot.value = { ...sel }
  // Capture the first non-empty activity in the original range (if any).
  let existing: string | null = null
  for (let h = sel.start; h < sel.end; h++) {
    const v = tpl.slots[sel.day * 24 + h]
    if (v) { existing = v; break }
  }
  editSizeActivityId.value = existing
  isEditingSize.value = true
  showActionBar.value = false
}

function confirmSizeEdit() {
  const sel = selection.value
  const snap = editSizeSnapshot.value
  if (sel && snap) {
    const activityId = editSizeActivityId.value || defaultActivityId.value
    // Clear the original range first so shrinking/shifting doesn't leave orphan slots
    planner.clearTimeRange([snap.day], snap.start, snap.end)
    if (activityId) {
      planner.applyTimeRange(activityId, [sel.day], sel.start, sel.end)
    }
  }
  closeAll()
}

function cancelSizeEdit() {
  if (editSizeSnapshot.value) selection.value = { ...editSizeSnapshot.value }
  isEditingSize.value = false
  editSizeSnapshot.value = null
  editSizeActivityId.value = null
  if (selection.value) openActionBarAt(actionBarPos.value.x, actionBarPos.value.y)
}

// ── Block actions ──
function selectBlock(day: number, start: number, end: number, _activityId: string, e: MouseEvent | { clientX: number; clientY: number }) {
  selection.value = { day, start, end }
  openActionBarAt(e.clientX, e.clientY)
}

function deleteBlock(day: number, start: number, end: number) {
  planner.clearTimeRange([day], start, end)
}

// ── Resize logic ──
function startResize(side: 'top' | 'bottom', e: PointerEvent) {
  if (!selection.value) return
  e.stopPropagation()
  e.preventDefault()
  resizing.value = side
  const target = e.currentTarget as HTMLElement
  resizeDayEl.value = target.closest<HTMLElement>('.day-col')
  showActionBar.value = false
  document.addEventListener('pointermove', onResizeMove)
  document.addEventListener('pointerup', onResizeEnd, { once: true })
}

function hourFromPointer(clientY: number): number | null {
  const col = resizeDayEl.value
  if (!col) return null
  const rect = col.getBoundingClientRect()
  const y = clientY - rect.top
  const hour = Math.round(y / HOUR_PX)
  return Math.max(0, Math.min(24, hour))
}

function onResizeMove(e: PointerEvent) {
  if (!resizing.value || !selection.value) return
  const hour = hourFromPointer(e.clientY)
  if (hour === null) return
  const cur = selection.value
  if (resizing.value === 'top') {
    const newStart = Math.min(hour, cur.end - 1)
    selection.value = { ...cur, start: Math.max(0, newStart) }
  } else {
    const newEnd = Math.max(hour, cur.start + 1)
    selection.value = { ...cur, end: Math.min(24, newEnd) }
  }
}

function onResizeEnd(_e: PointerEvent) {
  document.removeEventListener('pointermove', onResizeMove)
  resizing.value = null
  resizeDayEl.value = null
  // Stay in edit mode after a drag so users can keep adjusting.
  // The floating "Done" button exits edit mode and reopens the action bar.
}

// ── Touch: tap-to-select (no drag — keeps page scroll free) ──
const touchOrigin = ref<{ x: number; y: number } | null>(null)
const TOUCH_SLOP = 8

function slotFromPoint(x: number, y: number): { day: number; hour: number } | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  const target = el?.closest<HTMLElement>('[data-day][data-hour]')
  if (!target) return null
  return { day: +target.dataset.day!, hour: +target.dataset.hour! }
}

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]!
  touchOrigin.value = { x: t.clientX, y: t.clientY }
}

function onTouchMove(_e: TouchEvent) {
  // intentionally empty — browser handles scroll natively
}

function onTouchEnd(e: TouchEvent) {
  if (!touchOrigin.value) return
  const t = e.changedTouches[0]!
  const moved =
    Math.abs(t.clientX - touchOrigin.value.x) > TOUCH_SLOP ||
    Math.abs(t.clientY - touchOrigin.value.y) > TOUCH_SLOP
  touchOrigin.value = null
  if (moved) return // was a scroll gesture, not a tap

  // Did the user tap on an existing block?
  const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null
  const blockEl = el?.closest<HTMLElement>('[data-block-day]')
  if (blockEl) {
    const day = +blockEl.dataset.blockDay!
    const start = +blockEl.dataset.blockStart!
    const end = +blockEl.dataset.blockEnd!
    const actId = activeTemplate.value?.slots[day * 24 + start] || ''
    selectBlock(day, start, end, actId, { clientX: t.clientX, clientY: t.clientY })
    return
  }

  // Tap on an empty slot → select that single hour, show action bar
  const slot = slotFromPoint(t.clientX, t.clientY)
  if (!slot) return
  selection.value = { day: slot.day, start: slot.hour, end: slot.hour + 1 }
  openActionBarAt(t.clientX, t.clientY)
}

// Capture mouseup globally so releasing outside the grid still opens the menu
onMounted(() => document.addEventListener('mouseup', handleGlobalMouseUp))
onUnmounted(() => document.removeEventListener('mouseup', handleGlobalMouseUp))

function handleGlobalMouseUp(e: MouseEvent) {
  if (isSelecting.value) finishSelection(e)
}

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

function confirmDeleteActiveTemplate() {
  const t = activeTemplate.value
  if (!t) return
  if (templates.value.length <= 1) return
  if (confirm(`Delete template '${t.name}'? This cannot be undone.`)) {
    planner.deleteTemplate(t.id)
  }
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
        Drag across empty slots to select a range, or tap a block to modify it.
        Use the handles to resize, then apply a category.
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
        type="button"
        class="btn btn-xs btn-danger delete-template-btn"
        @click.stop="confirmDeleteActiveTemplate"
      >
        <span class="delete-template-btn-label">Delete "{{ activeTemplate?.name }}"</span>
        <span class="delete-template-btn-icon" aria-hidden="true">✕</span>
      </button>
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

    <!-- Week grid (activities are picked from the selection menu) -->
    <div class="week-scroll-wrap">
      <div
        class="week"
        :class="{ selecting: isSelecting }"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <!-- Header row -->
        <div class="week-head">
          <div class="corner" />
          <div v-for="(day, di) in DAYS" :key="day" class="wday">
            <div class="wday-top">
              <span class="day-name">{{ day }}</span>
              <button
                type="button"
                class="day-clear"
                :title="`Clear ${day}`"
                :aria-label="`Clear ${day}`"
                @click.stop="planner.clearTimeRange([di], 0, 24)"
              >✕</button>
            </div>
            <span class="day-hours-label">{{ hoursPerDay[di] }} h</span>
          </div>
        </div>

        <!-- Grid body -->
        <div class="week-body">
          <!-- Hour labels -->
          <div class="hour-col">
            <div
              v-for="h in 24"
              :key="h - 1"
              class="hour-cell"
            >
              {{ (h - 1) % 3 === 0 ? formatHour(h - 1) : '' }}
            </div>
          </div>

          <!-- Day columns -->
          <div
            v-for="(_, dayIndex) in DAYS"
            :key="dayIndex"
            class="day-col"
          >
            <!-- Selection highlight -->
            <div
              v-if="selection && selection.day === dayIndex"
              class="slot-selection"
              :class="{ 'is-resizing': resizing, 'is-editing': isEditingSize }"
              :style="{
                top: `${selection.start * HOUR_PX}px`,
                height: `${(selection.end - selection.start) * HOUR_PX}px`,
              }"
            >
              <template v-if="isEditingSize">
                <button
                  type="button"
                  class="resize-handle top"
                  aria-label="Drag to change start"
                  @pointerdown="startResize('top', $event)"
                  @click.stop
                ><span /></button>
                <span class="selection-duration">{{ selection.end - selection.start }}h</span>
                <button
                  type="button"
                  class="resize-handle bottom"
                  aria-label="Drag to change end"
                  @pointerdown="startResize('bottom', $event)"
                  @click.stop
                ><span /></button>
                <div class="resize-confirm" @mousedown.stop @pointerdown.stop>
                  <button
                    type="button"
                    class="resize-confirm-btn is-cancel"
                    title="Cancel resize"
                    aria-label="Cancel resize"
                    @click.stop="cancelSizeEdit"
                  >✕</button>
                  <button
                    type="button"
                    class="resize-confirm-btn is-validate"
                    title="Save resize"
                    aria-label="Save resize"
                    @click.stop="confirmSizeEdit"
                  >✓</button>
                </div>
              </template>
              <span v-else class="selection-duration">{{ selection.end - selection.start }}h</span>
            </div>

            <!-- Slot cells (interaction layer) -->
            <div
              v-for="hour in 24"
              :key="hour - 1"
              class="slot"
              :class="{ major: (hour - 1) % 3 === 0 }"
              :data-day="dayIndex"
              :data-hour="hour - 1"
              @mousedown.prevent="startSelection(dayIndex, hour - 1)"
              @mouseenter="extendSelection(dayIndex, hour - 1)"
            />

            <!-- Blocks (visual layer) -->
            <div
              v-for="block in blocksByDay[dayIndex]"
              :key="`${dayIndex}-${block.start}-${block.activityId}`"
              class="block"
              :class="{
                'block-sm': (block.end - block.start) * HOUR_PX < 40,
                'block-xs': (block.end - block.start) * HOUR_PX < 24,
              }"
              :data-block-day="dayIndex"
              :data-block-start="block.start"
              :data-block-end="block.end"
              :style="{
                top: `${block.start * HOUR_PX}px`,
                height: `${(block.end - block.start) * HOUR_PX - 2}px`,
                '--c': activityMap.get(block.activityId)?.color ?? '#999',
              }"
              @mouseenter="hoveredBlockKey = blockKey(dayIndex, block.start, block.end)"
              @mouseleave="hoveredBlockKey = null"
              @mousedown.stop
              @click.stop="selectBlock(dayIndex, block.start, block.end, block.activityId, $event)"
            >
              <div class="block-title">{{ activityMap.get(block.activityId)?.name }}</div>
              <div class="block-meta">{{ formatHour(block.start) }}–{{ formatHour(block.end) }}</div>

              <div v-if="isBlockHovered(dayIndex, block)" class="block-actions">
                <button
                  type="button"
                  class="block-action-btn"
                  title="Delete"
                  aria-label="Delete block"
                  @click.stop="deleteBlock(dayIndex, block.start, block.end)"
                >✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hours per activity this week -->
    <div class="week-stats">
      <div v-for="activity in planner.activities" :key="activity.id" class="stat">
        <span class="stat-label">
          <span class="dot" :style="{ background: activity.color }" />
          {{ activity.name }}
        </span>
        <span class="stat-value">{{ activityHours[activity.id] || 0 }}<span class="unit">h</span></span>
      </div>
    </div>

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

  <!-- Action bar: appears after a selection, before picking an activity -->
  <Teleport to="body">
    <div v-if="showActionBar" class="slot-menu-overlay" @click="closeAll" @contextmenu.prevent="closeAll" />
    <div
      v-if="showActionBar && selection"
      class="selection-bar"
      :style="{ left: `${actionBarPos.x}px`, top: `${actionBarPos.y}px` }"
      @click.stop
      @mousedown.stop
    >
      <div class="selection-bar-head">
        <span class="sb-day">{{ DAYS[selection.day] }}</span>
        <span class="sb-range">{{ formatHour(selection.start) }} – {{ formatHour(selection.end) }}</span>
        <span class="sb-dur">{{ selection.end - selection.start }}h</span>
      </div>
      <p class="selection-bar-hint">Pick an action below, or use Edit to adjust the range.</p>
      <div class="selection-bar-actions">
        <button class="btn btn-sm btn-primary" @click="pickFromActionBar">
          {{ selectionHasActivity ? 'Change…' : 'Apply…' }}
        </button>
        <button class="btn btn-sm btn-outline" @click="enterSizeEdit">
          <span aria-hidden="true">✎</span> Edit
        </button>
        <button
          v-if="selectionHasActivity"
          class="btn btn-sm btn-danger"
          @click="clearSelection"
        >Delete</button>
        <button class="btn btn-sm" @click="closeAll">Cancel</button>
      </div>
    </div>
  </Teleport>

  <!-- Activity picker menu (teleported to body to avoid overflow clipping) -->
  <Teleport to="body">
    <div v-if="showMenu" class="slot-menu-overlay" @click="closeAll" @contextmenu.prevent="closeAll" />
    <div
      v-if="showMenu && selection"
      class="slot-menu"
      :style="{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }"
      @click.stop
    >
      <div class="slot-menu-head">
        <span>{{ DAYS[selection.day] }}</span>
        <span>{{ formatHour(selection.start) }} – {{ formatHour(selection.end) }}</span>
      </div>
      <div class="slot-menu-list">
        <button
          v-for="act in planner.activities"
          :key="act.id"
          class="slot-menu-chip"
          @click="applyActivity(act.id)"
        >
          <span class="dot" :style="{ background: act.color }" />
          <span class="chip-name">{{ act.name }}</span>
          <span class="chip-hrs">{{ activityHours[act.id] || 0 }}h</span>
        </button>
        <div class="slot-menu-divider" />
        <button class="slot-menu-chip slot-menu-clear" @click="clearSelection">
          <span class="dot dot-erase" />
          <span class="chip-name">Clear slot</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
