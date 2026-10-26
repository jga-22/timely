<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Category } from '~/types/planner'
import { usePlannerStore } from '~/stores/planner'
import { DESIGN_COLORS, categoryAlignments, hoursLabel } from '~/utils/planner'

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

// Quiet flag in the list: the habits ask for more time than their linked activities hold
// Under or over the time target: the list row and the map cell get the attention border (FR-GOALS-23)
const needsAttention = (categoryId: string) => {
  const status = alignments.value.get(categoryId)?.status
  return status === 'under' || status === 'over'
}

// Text beside the list row, so the state is not colour only
const attentionLabel = (categoryId: string): string | null => {
  const row = alignments.value.get(categoryId)
  if (row?.status === 'under') return `Missing ${hoursLabel(-row.gapMinutes)}/wk`
  if (row?.status === 'over') return `${hoursLabel(row.gapMinutes)}/wk over`
  return null
}

// Short line under each name in the list: the 1-year target, or that it is still to be defined
const targetLine = (category: Category) => category.targetTbd
  ? { text: 'Target to define', warn: true }
  : { text: category.target1y || 'No target written yet', warn: false }

// ── Vision: the only place the ambition is edited (FR-GOALS-13). Edit mode is local: one field, one edit at a time
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

// The list is laid out after the route changes, so the scroll waits for the next frame
function backToList() {
  setSelection({}).then(() => nextTick(() => requestAnimationFrame(() => {
    window.scrollTo({ top: listScroll })
    document.querySelector<HTMLElement>(`[data-category-id="${lastOpened}"]`)?.focus({ preventScroll: true })
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

function openAdd() {
  addName.value = ''
  addColor.value = DESIGN_COLORS[0]!.bg
  addError.value = ''
  addOpen.value = true
  nextTick(() => addNameInput.value?.focus())
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
  setSelection({ item: id, edit: true }).then(() => nextTick(() => document.getElementById('cat-edit-name')?.focus()))
}
</script>

<template>
  <div class="view harada-view" :data-selected="selected ? 'true' : 'false'">
    <header class="page-head">
      <h1 class="page-title">The best version of me</h1>
      <p class="page-lede">
        Why the plan exists: one five-year ambition and the eight life areas that serve it. Select an area to see its goals,
        habits and planned time.
      </p>
    </header>

    <div class="goals-top">
      <!-- Vision: view mode by default; Edit applies at once, Done leaves -->
      <section v-if="ambition" class="vision" @keydown="onVisionKeydown">
        <div class="vision-head">
          <h2 class="section-title">Vision, {{ horizonText }}</h2>
          <button
            v-if="!visionEditing"
            ref="visionEditButton"
            type="button"
            class="btn btn-sm btn-outline"
            aria-label="Edit ambition"
            @click="startVisionEdit"
          >Edit</button>
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

      <!-- Harada map: read-only, the ambition in the centre; a cell selects its category -->
      <section v-if="categories.length" class="section harada-map">
        <div class="section-head">
          <h2 class="section-title">Life areas</h2>
          <p class="section-lede">Select an area to open it below. The map shows the first eight by order.</p>
        </div>

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
              :class="{ 'is-active': selected?.id === cell.id, 'needs-attention': needsAttention(cell.id) }"
              :aria-pressed="selected?.id === cell.id"
              :data-map-position="position"
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
    <section v-else class="section browse">
      <div class="browse-list">
        <div class="section-head">
          <h2 class="section-title">Categories</h2>
          <p class="section-lede">Select one to see its goals, habits and planned time.</p>
        </div>
        <ul class="goals-legend" aria-label="Legend">
          <li><span class="legend-swatch is-attention" aria-hidden="true" />Needs attention: under or over its time target</li>
          <li><span class="legend-swatch" aria-hidden="true" />On track or no target</li>
        </ul>

        <ul ref="listEl" class="cat-list" @keydown="onListKeydown">
          <li v-for="category in sortedCategories" :key="category.id">
            <button
              type="button"
              class="cat-row"
              :class="{ 'needs-attention': needsAttention(category.id) }"
              :data-category-id="category.id"
              :aria-current="selected?.id === category.id ? 'true' : undefined"
              @click="openCategory(category.id)"
            >
              <span class="dot dot-lg" :style="{ background: category.color ?? '#888' }" aria-hidden="true" />
              <span class="cat-main">
                <span class="cat-row-name">{{ category.name }}</span>
                <span class="cat-meta" :class="{ 'is-warn': targetLine(category).warn }">{{ targetLine(category).text }}</span>
              </span>
              <span v-if="attentionLabel(category.id)" class="cat-flag">{{ attentionLabel(category.id) }}</span>
            </button>
          </li>
        </ul>

        <p v-if="sortedCategories.length > MAP_SIZE" class="browse-note">
          Only the first {{ MAP_SIZE }} categories appear on the Harada map. The others work everywhere else.
        </p>

        <div class="add-category">
          <button v-if="!addOpen" ref="addTrigger" type="button" class="chip-add" @click="openAdd">+ Add category</button>

          <form v-else class="form-stack" @submit.prevent="submitAdd" @keydown.escape="closeAdd">
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
              <button type="submit" class="btn btn-sm btn-primary">Add category</button>
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
        <p v-else class="browse-placeholder">Select a category to see its goals, habits and planned time.</p>
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

/* 3x3 map separated by hairlines, as in the prototype; read-only. Large screens only: hidden, not squeezed, below 1100px */
.harada-map { display: none; }

@media (min-width: 1100px) {
  .harada-map { display: block; }
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
  align-items: center;
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

.cat-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cat-row-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-md);
  font-weight: 500;
}

.cat-meta,
.cat-flag {
  font-size: var(--fs-xs);
  color: var(--ink-3);
}

.cat-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-meta.is-warn {
  color: var(--warn);
}

.browse-placeholder {
  margin: 0;
  font-size: var(--fs-md);
  color: var(--ink-3);
}

.cat-flag {
  flex: none;
  white-space: nowrap;
}

/* Attention: an outline in --attention, inside the box so the grid frame does not clip it */
.cat-row.needs-attention,
.harada-cell.needs-attention {
  outline: 2px solid var(--attention);
  outline-offset: -2px;
}

.goals-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-4);
  margin: 0 0 var(--space-3);
  padding: 0;
  list-style: none;
  font-size: var(--fs-xs);
  color: var(--ink-3);
}

.goals-legend li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.legend-swatch {
  flex: none;
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 1px solid var(--cell-line);
  border-radius: 3px;
}

.legend-swatch.is-attention {
  border: 2px solid var(--attention);
}

/* On the tinted selected row, secondary text uses --ink-2 (contrast on bg-4) */
.cat-row[aria-current="true"] .cat-meta,
.cat-row[aria-current="true"] .cat-flag {
  color: var(--ink-2);
}

.browse-note {
  margin: var(--space-3) 0 0;
  font-size: var(--fs-sm);
  color: var(--ink-3);
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
