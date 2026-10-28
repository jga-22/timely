<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Category } from '~/types/planner'
import { usePlannerStore } from '~/stores/planner'
import { DESIGN_COLORS, categoryAlignments, hoursLabel } from '~/utils/planner'
import { focusEditById, focusEditField } from '~/utils/focus'

/** The Harada map shows the first eight categories by order (FR-GOALS-14, FR-GOALS-21) */
const MAP_SIZE = 8
/** Map positions run in reading order, three to a row; the ambition sits in the centre (position 4) */
const MAP_COLUMNS = 3
const MAP_CENTRE = 4

const planner = usePlannerStore()
const { ambition, categories } = storeToRefs(planner)
const { item, edit, setSelection } = useNav()

const sortedCategories = computed(() => [...categories.value].sort((a, b) => a.order - b.order))

// Eight outer slots around the centre; a missing category leaves an empty placeholder
const mapCells = computed<Array<Category | 'centre' | null>>(() => {
  const slots = Array.from({ length: MAP_SIZE }, (_, index) => sortedCategories.value[index] ?? null)
  return [...slots.slice(0, MAP_CENTRE), 'centre', ...slots.slice(MAP_CENTRE)]
})

const isMapCategory = (position: number) => {
  const cell = mapCells.value[position]
  return typeof cell === 'object' && cell !== null
}

// The category named in the URL; an id that does not exist selects nothing (FR-UX-5).
// Nothing selected shows the list alone on phones and a placeholder beside it on desktop; Close returns to that state
const selected = computed<Category | null>(() => sortedCategories.value.find(category => category.id === item.value) ?? null)
const editing = computed(() => !!selected.value && edit.value)

const horizonYears = computed(() => ambition.value?.horizonYears ?? 5)
const horizonText = computed(() => `${horizonYears.value} ${horizonYears.value === 1 ? 'year' : 'years'}`)

const alignments = computed(() => categoryAlignments(planner.$state))

// ── List or Grid (FR-GOALS-26): the Harada map is an opt-in view from 1100px; the list is the default and the only view below it.
// The choice lasts for the session (useState), not the saved state
const view = useState<'list' | 'grid'>('goals-view', () => 'list')
const gridView = computed(() => view.value === 'grid')

import { isSleepActivity } from '~/utils/sleep'

// ── Empty life areas (FR-GOALS-25): an area with a goal, a target, habits or activities is listed in full. The others collapse into one
// row that opens them for the session (useState). With no content at all, every area is listed as an empty one (a new user)
const emptyOpen = useState('goals-empty-open', () => false)
const hasContentArea = (category: Category) => !!(
  category.goal5y?.trim()
  || category.target1y?.trim()
  || category.targetTbd
  || planner.habits.some(habit => habit.categoryId === category.id)
  || planner.activities.some(activity => activity.categoryId === category.id && !isSleepActivity(activity))
)
const filledCount = computed(() => sortedCategories.value.filter(hasContentArea).length)
const emptyCount = computed(() => sortedCategories.value.length - filledCount.value)
const showAll = computed(() => emptyOpen.value || filledCount.value === 0)
const listCategories = computed(() => showAll.value ? sortedCategories.value : sortedCategories.value.filter(hasContentArea))

function toggleEmpty() {
  emptyOpen.value = !emptyOpen.value
}

// The needed-and-planned bar of each row waits for mount: the saved state is not known on the server, so the first client render
// matches the server, and the next render patches the bars (a reload with a saved state that differs from the seed)
const mounted = ref(false)

// Short line under each name in the list: the 1-year target, or that it is still to be defined
const targetLine = (category: Category) => category.targetTbd
  ? { text: 'Target to define', warn: true }
  : { text: category.target1y || 'No target written yet', warn: false }

// ── Ambition: the only place the ambition is edited (FR-GOALS-13). Edit mode is local: one field, one edit at a time
// A new user has no ambition yet (Start empty): the prompt writes the first one, and the view takes over once it exists
const newAmbition = ref('')

function saveNewAmbition() {
  planner.setAmbition(newAmbition.value)
  newAmbition.value = ''
}

const visionEditing = ref(false)
const visionEditButton = ref<HTMLButtonElement | null>(null)

function startVisionEdit() {
  // A category edit ends first, so only one item is in edit mode
  if (editing.value && selected.value) setSelection({ item: selected.value.id }, true)
  visionEditing.value = true
}

function finishVisionEdit() {
  visionEditing.value = false
  nextTick(() => visionEditButton.value?.focus())
}

function onVisionKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !visionEditing.value) return

  event.stopPropagation()
  finishVisionEdit()
}

watch(edit, (value) => {
  if (value) visionEditing.value = false
})

watch(item, () => {
  visionEditing.value = false
})

// ── Selection: the map and the list share one selected category (FR-GOALS-14, FR-GOALS-15)
const listEl = ref<HTMLUListElement | null>(null)
let listScroll = 0
let lastOpened: string | null = null

// Selecting keeps the list position, so Back to list returns to it (FR-UX-8)
function openCategory(categoryId: string) {
  lastOpened = categoryId
  listScroll = window.scrollY
  setSelection({ item: categoryId })
}

// "Add a goal" on an empty life area opens its detail in edit mode, with the name field focused (as Edit does)
function addGoal(categoryId: string) {
  lastOpened = categoryId
  listScroll = window.scrollY
  setSelection({ item: categoryId, edit: true }).then(() => nextTick(() => focusEditById('cat-edit-name', 'cat-detail')))
}

// The list is laid out after the route changes, so the scroll waits for the next frame
function backToList() {
  setSelection({}).then(() => nextTick(() => requestAnimationFrame(() => {
    window.scrollTo({ top: listScroll })
    document.querySelector<HTMLElement>(`[data-category-id="${lastOpened}"], [data-map-id="${lastOpened}"]`)?.focus({ preventScroll: true })
  })))
}

// Escape closes the open category. Inside a field, the vision editor, the add form or edit mode it belongs to them
// (edit mode: Escape leaves edit mode first, see CategoryDetail)
function onWindowKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !selected.value || editing.value || visionEditing.value || addOpen.value) return
  if ((event.target as HTMLElement | null)?.closest('input, textarea, select')) return

  backToList()
}

onMounted(() => window.addEventListener('keydown', onWindowKeydown))
onMounted(() => {
  mounted.value = true
})
onUnmounted(() => window.removeEventListener('keydown', onWindowKeydown))

// Arrow keys move between map cells; Enter and Space (native buttons) select
function onMapKeydown(event: KeyboardEvent, position: number) {
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -MAP_COLUMNS, ArrowDown: MAP_COLUMNS }
  const direction = steps[event.key]
  if (direction === undefined) return

  event.preventDefault()

  const row = (value: number) => Math.floor(value / MAP_COLUMNS)
  const sideways = Math.abs(direction) === 1

  // Skips the centre and empty placeholders; a sideways move stays on its row
  for (let next = position + direction; next >= 0 && next < mapCells.value.length; next += direction) {
    if (sideways && row(next) !== row(position)) return

    if (isMapCategory(next)) {
      document.querySelector<HTMLElement>(`[data-map-position="${next}"]`)?.focus()
      return
    }
  }
}

function onListKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

  const rows = [...(listEl.value?.querySelectorAll<HTMLButtonElement>('.cat-row') ?? [])]
  const index = rows.indexOf(event.target as HTMLButtonElement)
  if (index === -1) return

  event.preventDefault()
  rows[event.key === 'ArrowDown' ? index + 1 : index - 1]?.focus()
}

// ── Add category: progressive disclosure under the list (FR-GOALS-19)
const addOpen = ref(false)
const addName = ref('')
const addColor = ref(DESIGN_COLORS[0]!.bg)
const addError = ref('')
const addTrigger = ref<HTMLButtonElement | null>(null)
const addNameInput = ref<HTMLInputElement | null>(null)
const addPanel = ref<HTMLFormElement | null>(null)

function openAdd() {
  addName.value = ''
  addColor.value = DESIGN_COLORS[0]!.bg
  addError.value = ''
  addOpen.value = true
  nextTick(() => focusEditField(addNameInput.value, addPanel.value))
}

function closeAdd() {
  addOpen.value = false
  nextTick(() => addTrigger.value?.focus())
}

// The new category opens selected in edit mode, with its name field focused
function submitAdd() {
  if (!addName.value.trim()) {
    addError.value = 'Name can\'t be empty'
    return
  }

  const id = planner.addCategory(addName.value, addColor.value)
  if (!id) return

  addOpen.value = false
  setSelection({ item: id, edit: true }).then(() => nextTick(() => focusEditById('cat-edit-name', 'cat-detail')))
}
</script>

<template>
  <div class="view harada-view" :data-selected="selected ? 'true' : 'false'">
    <header class="page-head">
      <h1 class="page-title">Goals</h1>
    </header>

    <div class="goals-top">
      <!-- Ambition: view mode by default; Edit applies at once, Done leaves. Without one, the prompt writes it -->
      <section v-if="!ambition" class="vision vision-new">
        <div class="vision-head">
          <h2 class="section-title">Ambition, {{ horizonText }}</h2>
        </div>

        <form class="vision-form" @submit.prevent="saveNewAmbition">
          <AutoTextarea
            v-model="newAmbition"
            label="Write your 5-year ambition"
            placeholder="For example, be a present father and run a half marathon"
            class="vision-input"
          />
          <div class="vision-actions">
            <button type="submit" class="btn btn-sm btn-primary" :disabled="!newAmbition.trim()">Save ambition</button>
          </div>
        </form>
      </section>

      <section v-else class="vision" @keydown="onVisionKeydown">
        <div class="vision-head">
          <h2 class="section-title">Ambition, {{ horizonText }}</h2>
          <EditButton v-if="!visionEditing" ref="visionEditButton" label="Edit ambition" @click="startVisionEdit" />
          <button v-else type="button" class="btn btn-sm btn-primary" @click="finishVisionEdit">Done</button>
        </div>

        <p v-if="!visionEditing" class="vision-statement" :class="{ 'is-empty': !ambition.statement }">
          {{ ambition.statement || 'No ambition written yet.' }}
        </p>
        <AutoTextarea
          v-else
          :model-value="ambition.statement"
          label="Ambition statement"
          class="vision-input"
          @update:model-value="planner.updateAmbition({ statement: $event })"
        />
      </section>

      <!-- List or Grid: the toggle shows from 1100px only; below it the list is the only view -->
      <div v-if="categories.length" class="goals-view-toggle">
        <div class="segmented" role="group" aria-label="Life areas view">
          <button type="button" :data-active="!gridView" :aria-pressed="!gridView" @click="view = 'list'">List</button>
          <button type="button" :data-active="gridView" :aria-pressed="gridView" @click="view = 'grid'">Grid</button>
        </div>
      </div>

      <!-- Harada map (Grid view, from 1100px): read-only, the ambition in the centre; a cell selects its life area -->
      <section v-if="categories.length && gridView" class="section harada-map">
        <div class="harada-grid">
          <template v-for="(cell, position) in mapCells" :key="position">
            <div v-if="cell === 'centre'" class="harada-cell harada-centre">
              <span class="cell-num">Ambition, {{ horizonText }}</span>
              <span class="cell-title">{{ ambition?.statement }}</span>
            </div>

            <button
              v-else-if="cell"
              type="button"
              class="harada-cell"
              :class="{ 'is-active': selected?.id === cell.id }"
              :aria-pressed="selected?.id === cell.id"
              :data-map-position="position"
              :data-map-id="cell.id"
              @click="openCategory(cell.id)"
              @keydown="onMapKeydown($event, position)"
            >
              <span class="cell-head">
                <span class="dot dot-lg" :style="{ background: cell.color ?? '#888' }" aria-hidden="true" />
                <span class="cell-num">{{ String(cell.order).padStart(2, '0') }}</span>
              </span>
              <span class="cell-title">{{ cell.name }}</span>
              <span class="cell-status">{{ cell.targetTbd ? 'To define' : '' }}</span>
            </button>

            <div v-else class="harada-cell harada-empty" aria-hidden="true" />
          </template>
        </div>
      </section>
    </div>

    <div v-if="!categories.length" class="empty-state">
      <p>No goals yet. Start from the starter grid and adapt it.</p>
      <button type="button" class="btn btn-primary" @click="planner.seedHaradaGoals()">Load starter grid</button>
    </div>

    <!-- Categories: list on the left, the selected category's detail beside it (stacked on phones) -->
    <section v-else class="section browse" :class="{ 'is-grid': gridView }">
      <div class="browse-list">
        <ul ref="listEl" class="cat-list" @keydown="onListKeydown">
          <li v-for="category in listCategories" :key="category.id">
            <button
              v-if="hasContentArea(category)"
              type="button"
              class="cat-row"
              :data-category-id="category.id"
              :aria-current="selected?.id === category.id ? 'true' : undefined"
              @click="openCategory(category.id)"
            >
              <span class="dot dot-lg" :style="{ background: category.color ?? '#888' }" aria-hidden="true" />
              <span class="cat-main">
                <span class="cat-row-name">{{ category.name }}</span>
                <span class="cat-meta" :class="{ 'is-warn': targetLine(category).warn }">{{ targetLine(category).text }}</span>
                <HaradaNeededPlannedBar
                  v-if="mounted"
                  :needed-minutes="alignments.get(category.id)?.neededMinutes ?? 0"
                  :planned-minutes="alignments.get(category.id)?.allocatedMinutes ?? 0"
                  :color="category.color"
                />
              </span>
            </button>

            <!-- An empty life area: its name and a quiet way to add the goal, nothing to compare yet -->
            <div v-else class="cat-empty">
              <button
                type="button"
                class="cat-row"
                :data-category-id="category.id"
                :aria-current="selected?.id === category.id ? 'true' : undefined"
                @click="openCategory(category.id)"
              >
                <span class="dot dot-lg" :style="{ background: category.color ?? '#888' }" aria-hidden="true" />
                <span class="cat-main">
                  <span class="cat-row-name">{{ category.name }}</span>
                </span>
              </button>
              <button type="button" class="chip-add cat-add-goal" :aria-label="`Add a goal to ${category.name}`" @click="addGoal(category.id)">Add a goal</button>
            </div>
          </li>
          <li v-if="filledCount && emptyCount">
            <button type="button" class="cat-more" :aria-expanded="showAll" @click="toggleEmpty">
              {{ emptyCount }} more life {{ emptyCount === 1 ? 'area' : 'areas' }} · add a goal
            </button>
          </li>
        </ul>

        <div class="add-category">
          <button v-if="!addOpen" ref="addTrigger" type="button" class="chip-add" @click="openAdd">+ Add life area</button>

          <form v-else ref="addPanel" class="form-stack" tabindex="-1" @submit.prevent="submitAdd" @keydown.escape="closeAdd">
            <div class="field">
              <label class="field-label" for="new-category-name">Name</label>
              <input
                id="new-category-name"
                ref="addNameInput"
                v-model="addName"
                class="timely-input"
                placeholder="e.g. Wellness"
                :aria-invalid="!!addError"
                aria-describedby="new-category-error"
                @input="addError = ''"
              />
              <p v-if="addError" id="new-category-error" class="field-error">{{ addError }}</p>
            </div>

            <div class="field">
              <span class="field-label">Colour</span>
              <div class="color-pop color-pop-inline">
                <button
                  v-for="dc in DESIGN_COLORS"
                  :key="dc.id"
                  type="button"
                  :style="{ background: dc.bg }"
                  :data-active="addColor === dc.bg"
                  :aria-label="`Colour ${dc.id}`"
                  @click="addColor = dc.bg"
                />
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-sm btn-primary">Add life area</button>
              <button type="button" class="btn btn-sm" @click="closeAdd">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <div class="browse-detail">
        <HaradaCategoryDetail
          v-if="selected"
          :key="selected.id"
          :category-id="selected.id"
          :editing="editing"
          @back="backToList"
        />
        <p v-else class="browse-placeholder">Select a life area to see its goals, activities and habits.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.vision-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.vision-head .section-title {
  margin: 0;
}

.vision-statement {
  max-width: 44em;
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: 500;
  line-height: 1.45;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.vision-statement.is-empty {
  font-weight: 400;
  color: var(--ink-3);
}

.vision-input {
  max-width: 720px;
}

.vision-actions {
  margin-top: var(--space-3);
}

/* 3x3 map separated by hairlines, as in the prototype; read-only. Large screens only: hidden, not squeezed, below 1100px */
.harada-map { display: none; }

.goals-view-toggle {
  display: none;
  margin: var(--space-4) 0;
}

/* Grid view: the map above, the selected life area's detail below it, the list hidden (the list stays below 1100px) */
@media (min-width: 1100px) {
  .harada-map { display: block; }

  .goals-view-toggle { display: flex; }

  .browse.is-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .browse.is-grid .cat-list {
    display: none;
  }

  .browse.is-grid .browse-detail {
    padding-left: 0;
    border-left: none;
  }
}

.harada-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}

.harada-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 128px;
  padding: var(--space-5);
  background: var(--bg);
  color: var(--ink);
  text-align: left;
  transition: background 0.15s ease;
}

button.harada-cell:hover {
  background: var(--bg-3);
}

/* Inset ring: the grid frame has overflow hidden, so an outside outline would be clipped */
button.harada-cell:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.harada-cell.is-active {
  background: var(--bg-4);
}

.harada-cell.is-active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent);
}

.harada-centre {
  justify-content: center;
  background: var(--accent);
  color: var(--on-accent);
}

.harada-empty {
  background: var(--bg-2);
}

.cell-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.cell-num {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.harada-centre .cell-num {
  color: var(--on-accent);
}

.cell-title {
  font-size: var(--fs-md);
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.harada-centre .cell-title {
  font-weight: 500;
  line-height: 1.45;
}

/* Reserved on every cell so titles line up across the map */
.cell-status {
  min-height: 1.25em;
  margin-top: auto;
  font-size: var(--fs-xs);
  font-weight: 500;
  line-height: 1.25;
  color: var(--warn);
}

/* Categories: list and detail side by side */
.browse {
  display: grid;
  grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
  gap: var(--space-7);
  align-items: start;
}

.browse-detail {
  min-width: 0;
  padding-left: var(--space-6);
  border-left: 1px solid var(--rule-2);
}

.cat-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.cat-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--rule-2);
  color: var(--ink);
  text-align: left;
  transition: background 0.12s;
}

.cat-row:hover {
  background: var(--bg-3);
}

.cat-row[aria-current="true"] {
  background: var(--bg-4);
  box-shadow: inset 3px 0 0 var(--accent);
}

/* The dot sits on the first line of the name, whatever the height of the row */
.cat-row > .dot { margin-top: 3px; }

.cat-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

/* Names and targets wrap: the list row grows with its text, nothing is cut off */
/* An empty life area: the name row and the quiet Add a goal control share one hairline */
.cat-empty {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-right: var(--space-3);
  border-bottom: 1px solid var(--rule-2);
}

.cat-empty .cat-row {
  flex: 1;
  min-width: 0;
  border-bottom: none;
}

.cat-add-goal {
  flex-shrink: 0;
}

.cat-more {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--rule-2);
  font-size: var(--fs-sm);
  color: var(--ink-2);
  text-align: left;
}

.cat-more:hover {
  background: var(--bg-3);
}

.cat-row-name {
  overflow-wrap: anywhere;
  font-size: var(--fs-md);
  font-weight: 500;
}

.cat-meta {
  font-size: var(--fs-xs);
  color: var(--ink-3);
  overflow-wrap: anywhere;
}

.cat-meta.is-warn {
  color: var(--warn);
}

.browse-placeholder {
  margin: 0;
  font-size: var(--fs-md);
  color: var(--ink-3);
}

/* On the tinted selected row, secondary text uses --ink-2 (contrast on bg-4) */
.cat-row[aria-current="true"] .cat-meta {
  color: var(--ink-2);
}

.add-category {
  margin-top: var(--space-4);
}

.add-category .form-stack {
  padding-top: var(--space-2);
}

@media (max-width: 768px) {
  .browse {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
  }

  .browse-detail {
    padding-left: 0;
    border-left: none;
  }

  /* Phones: a selected category replaces the map and the list, with Back to list */
  .harada-view[data-selected="true"] .goals-top,
  .harada-view[data-selected="true"] .browse-list {
    display: none;
  }

  .harada-view[data-selected="false"] .browse-detail {
    display: none;
  }

}
</style>
