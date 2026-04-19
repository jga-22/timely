<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { DAYS, DESIGN_COLORS, WEEK_DATES_2026, CURRENT_WEEK_INDEX, slotsToBlocks, formatHour } from '~/utils/planner'

const HOUR_PX = 28

const planner = usePlannerStore()
const { activeTemplate, templates, appliedWeeks } = storeToRefs(planner)

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
  const work = acts.find(a => a.categoryId === 'work') ?? acts.find(a => /work/i.test(a.name))
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
  const t = e.touches[0]
  touchOrigin.value = { x: t.clientX, y: t.clientY }
}

function onTouchMove(_e: TouchEvent) {
  // intentionally empty — browser handles scroll natively
}

function onTouchEnd(e: TouchEvent) {
  if (!touchOrigin.value) return
  const t = e.changedTouches[0]
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
const templateById = computed(() => new Map(templates.value.map(t => [t.id, t])))
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function paintWeek(wi: number) {
  const startDate = WEEK_DATES_2026[wi]
  if (startDate) planner.setWeekTemplate(startDate, paintTool.value === 'erase' ? null : paintTool.value)
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
</script>

<template>
  <div class="view" @click="colorPickerFor = null">
    <!-- Page header -->
    <div class="page-head">
      <div>
        <div class="page-kicker">01 · Planner</div>
        <h1 class="page-title">Design your <em>ideal</em> week,<br>hour by hour.</h1>
        <p class="page-lede">
          Drag across empty slots to select a range, or tap a block to modify it.
          Use the handles to resize, then apply a category.
        </p>
      </div>
      <div style="text-align: right">
        <div class="page-kicker" style="margin-bottom: 6px">Planned this week</div>
        <div style="font-family: var(--font-display); font-size: 64px; font-style: italic; line-height: 0.9; letter-spacing: -0.02em">
          {{ totalPlanned }}<span style="font-family: var(--font-mono); font-style: normal; font-size: 12px; color: var(--ink-3); margin-left: 6px; letter-spacing: 0.1em; text-transform: uppercase">/ 168 hrs</span>
        </div>
      </div>
    </div>

    <!-- Template switcher -->
    <div class="template-switch" style="margin-bottom: 20px">
      <span class="panel-sub" style="margin-right: 6px">Template</span>

      <div v-for="t in templates" :key="t.id" style="position: relative">
        <input
          v-if="renamingId === t.id"
          class="timely-input"
          autofocus
          :value="t.name"
          style="height: 30px; width: 140px; font-size: 12px"
          @blur="(e) => { planner.renameActiveTemplate((e.target as HTMLInputElement).value.trim() || t.name); renamingId = null }"
          @keydown.enter="(e) => { planner.renameActiveTemplate((e.target as HTMLInputElement).value.trim() || t.name); renamingId = null }"
          @keydown.escape="renamingId = null"
        />
        <button
          v-else
          class="template-pill"
          :data-active="t.id === activeTemplate?.id"
          :style="t.id === activeTemplate?.id ? { background: templateColor(t), borderColor: templateColor(t), color: '#fff' } : {}"
          :title="`Click to select · double-click to rename`"
          @click="planner.selectTemplate(t.id)"
          @dblclick="renamingId = t.id"
        >
          <span
            :style="{ width: '12px', height: '12px', borderRadius: '3px', background: templateColor(t), border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer', flexShrink: 0, boxShadow: t.id === activeTemplate?.id ? 'inset 0 0 0 1.5px rgba(255,255,255,0.7)' : 'none' }"
            @click.stop="colorPickerFor = colorPickerFor === t.id ? null : t.id"
          />
          <span class="t-name">{{ t.name }}</span>
          <span style="font-family: var(--font-mono); font-size: 10px; opacity: 0.7">{{ t.slots.filter(Boolean).length }}h</span>
        </button>

        <div v-if="colorPickerFor === t.id" class="color-pop" style="top: 34px; left: 0" @click.stop>
          <button
            v-for="col in DESIGN_COLORS"
            :key="col.id"
            :style="{ background: col.bg }"
            :data-active="t.color === col.bg"
            @click="planner.setTemplateColor(t.id, col.bg); colorPickerFor = null"
          />
        </div>
      </div>

      <div v-if="newTemplateOpen" style="display: flex; gap: 4px">
        <input
          v-model="newTemplateName"
          class="timely-input"
          autofocus
          placeholder="e.g. Launch week"
          style="height: 30px; width: 150px; font-size: 12px"
          @keydown.enter="handleNewTemplate"
          @keydown.escape="newTemplateOpen = false; newTemplateName = ''"
        />
        <button class="btn btn-sm btn-primary" @click="handleNewTemplate">Add</button>
      </div>
      <button v-else class="template-pill-add" @click="newTemplateOpen = true">+ New template</button>

      <button
        v-if="templates.length > 1"
        type="button"
        class="btn btn-xs btn-ghost btn-danger delete-template-btn"
        @click.stop="confirmDeleteActiveTemplate"
      >
        <span class="delete-template-btn-label">Delete "{{ activeTemplate?.name }}"</span>
        <span class="delete-template-btn-icon" aria-hidden="true">✕</span>
      </button>
    </div>

    <!-- Week grid (no palette panel — activities are in the context menu) -->
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
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span class="day-name">{{ day }}</span>
            <button
              class="btn btn-ghost btn-xs"
              style="width:16px;height:16px;padding:0;opacity:0;transition:opacity 0.1s;font-size:10px;color:var(--ink-4)"
              :title="`Clear ${day}`"
              @click.stop="planner.clearTimeRange([di], 0, 24)"
              @mouseenter="($event.target as HTMLElement).style.opacity='1'"
              @mouseleave="($event.target as HTMLElement).style.opacity='0'"
            >✕</button>
          </div>
          <span class="day-hours-label">
            {{ hoursPerDay[di] }}<span class="unit">hr</span>
          </span>
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
            :class="{ major: (h - 1) % 3 === 0 }"
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
              background: activityMap.get(block.activityId)?.color ?? '#999',
              color: '#fff',
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
                class="block-action-btn"
                title="Delete"
                @click.stop="deleteBlock(dayIndex, block.start, block.end)"
              >✕</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Week stats bar -->
    <div class="week-stats">
      <div v-for="activity in planner.activities" :key="activity.id" class="stat">
        <div class="stat-label">
          <span :style="{ width: '8px', height: '8px', borderRadius: '2px', background: activity.color, flexShrink: 0 }" />
          {{ activity.name }}
        </div>
        <div class="stat-value">
          {{ activityHours[activity.id] || 0 }}<span class="unit">hr</span>
        </div>
      </div>
    </div>

    <!-- Year painter -->
    <div class="year-paint">
      <div class="year-paint-head">
        <div>
          <div class="page-kicker">Assign templates</div>
          <h2 class="title">Paint your <em>2026</em> — week by week.</h2>
          <p class="page-lede" style="margin-top: 10px">
            Choose a template below, then click or drag across weeks to assign it.
          </p>
        </div>
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); text-align: right">
          {{ appliedWeeks.length }} / 52 assigned
        </div>
      </div>

      <div class="paint-tools" style="margin-bottom: 18px">
        <span class="panel-sub" style="margin-right: 6px">Paint with</span>
        <button
          v-for="t in templates"
          :key="t.id"
          class="paint-tool"
          :data-active="paintTool === t.id"
          @click="paintTool = t.id"
        >
          <span class="dot" :style="{ background: templateColor(t) }" />
          {{ t.name }}
        </button>
        <button class="paint-tool" :data-active="paintTool === 'erase'" @click="paintTool = 'erase'">
          <span class="dot" style="background: var(--bg-3); border: 1px dashed var(--ink-3)" />
          Erase
        </button>
      </div>

      <div class="year-grid-scroll">
        <div class="year-months">
          <div v-for="m in MONTHS" :key="m" class="m">{{ m }}</div>
        </div>

        <div class="year-grid" @mouseup="isYearPainting = false" @mouseleave="isYearPainting = false">
          <div
            v-for="(startDate, wi) in WEEK_DATES_2026"
            :key="wi"
            class="week-cell"
            :class="{ empty: !appliedByDate.get(startDate), 'is-current': wi === CURRENT_WEEK_INDEX }"
            :style="appliedByDate.get(startDate) ? { background: templateColor(templateById.get(appliedByDate.get(startDate)!)!) } : {}"
            :title="appliedByDate.get(startDate) ? `Week ${wi + 1} · ${templateById.get(appliedByDate.get(startDate)!)?.name}` : `Week ${wi + 1} · unassigned`"
            @mousedown="isYearPainting = true; paintWeek(wi)"
            @mouseenter="hoverWeek = wi; isYearPainting && paintWeek(wi)"
            @mouseleave="hoverWeek = null"
          >
            <span class="wnum">{{ wi + 1 }}</span>
          </div>
        </div>
      </div>

      <div v-if="hoverWeek !== null" style="margin-top: 14px; font-size: 13px; color: var(--ink-2)">
        <span class="panel-sub" style="margin-right: 8px">Week {{ hoverWeek + 1 }}</span>
        <span v-if="appliedByDate.get(WEEK_DATES_2026[hoverWeek])">
          {{ templateById.get(appliedByDate.get(WEEK_DATES_2026[hoverWeek])!)?.name }}
        </span>
        <span v-else style="color: var(--ink-3); font-style: italic">unassigned — click to paint</span>
      </div>
    </div>
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
      <p class="selection-bar-hint">Pick an action below — use Edit to adjust the range.</p>
      <div class="selection-bar-actions">
        <button class="btn btn-sm btn-primary" @click="pickFromActionBar">
          {{ selectionHasActivity ? 'Change…' : 'Apply…' }}
        </button>
        <button class="btn btn-sm btn-ghost" @click="enterSizeEdit">
          <span aria-hidden="true">✎</span> Edit
        </button>
        <button
          v-if="selectionHasActivity"
          class="btn btn-sm btn-ghost btn-danger"
          @click="clearSelection"
        >Delete</button>
        <button class="btn btn-sm btn-ghost" @click="closeAll">Cancel</button>
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
          :style="{ '--chip-bg': act.color }"
          @click="applyActivity(act.id)"
        >
          <span class="chip-dot" :style="{ background: act.color }" />
          <span class="chip-name">{{ act.name }}</span>
          <span class="chip-hrs" style="font-family: var(--font-mono); font-size: 10px; color: var(--ink-3); margin-left: auto">{{ activityHours[act.id] || 0 }}h</span>
        </button>
        <div class="slot-menu-divider" />
        <button class="slot-menu-chip slot-menu-clear" @click="clearSelection">
          <span class="chip-dot" style="background: var(--bg-3); border: 1px solid var(--rule)" />
          <span class="chip-name">Clear slot</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
