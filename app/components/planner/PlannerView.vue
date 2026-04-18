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

// ── Context menu ──
const showMenu = ref(false)
const menuPos = ref({ x: 0, y: 0 })

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
  openMenuAt(e.clientX, e.clientY)
}

function applyActivity(activityId: string) {
  if (!selection.value) return
  planner.applyTimeRange(activityId, [selection.value.day], selection.value.start, selection.value.end)
  closeMenu()
}

function clearSelection() {
  if (!selection.value) return
  planner.clearTimeRange([selection.value.day], selection.value.start, selection.value.end)
  closeMenu()
}

function closeMenu() {
  showMenu.value = false
  selection.value = null
}

// ── Block actions ──
function editBlock(day: number, start: number, end: number, e: MouseEvent) {
  selection.value = { day, start, end }
  openMenuAt(e.clientX, e.clientY)
}

function deleteBlock(day: number, start: number, end: number) {
  planner.clearTimeRange([day], start, end)
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
    selection.value = {
      day: +blockEl.dataset.blockDay!,
      start: +blockEl.dataset.blockStart!,
      end: +blockEl.dataset.blockEnd!,
    }
    openMenuAt(t.clientX, t.clientY)
    return
  }

  // Tap on an empty slot → select that single hour
  const slot = slotFromPoint(t.clientX, t.clientY)
  if (!slot) return
  selection.value = { day: slot.day, start: slot.hour, end: slot.hour + 1 }
  openMenuAt(t.clientX, t.clientY)
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
</script>

<template>
  <div class="view" @click="colorPickerFor = null">
    <!-- Page header -->
    <div class="page-head">
      <div>
        <div class="page-kicker">01 · Planner</div>
        <h1 class="page-title">Design your <em>ideal</em> week,<br>hour by hour.</h1>
        <p class="page-lede">
          Click and drag a range of slots, then pick an activity from the menu.
          Hover an existing block to edit or delete it.
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
        class="btn btn-xs btn-ghost btn-danger"
        style="margin-left: auto"
        @click="() => { if (confirm(`Delete '${activeTemplate?.name}'?`)) planner.deleteTemplate(activeTemplate?.id ?? '') }"
      >
        Delete "{{ activeTemplate?.name }}"
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
            :style="{
              top: `${selection.start * HOUR_PX}px`,
              height: `${(selection.end - selection.start) * HOUR_PX}px`,
            }"
          />

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
          >
            <div class="block-title">{{ activityMap.get(block.activityId)?.name }}</div>
            <div class="block-meta">{{ formatHour(block.start) }}–{{ formatHour(block.end) }}</div>

            <div v-if="isBlockHovered(dayIndex, block)" class="block-actions">
              <button
                class="block-action-btn"
                title="Edit"
                @click.stop="editBlock(dayIndex, block.start, block.end, $event)"
              >✎</button>
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

  <!-- Activity picker menu (teleported to body to avoid overflow clipping) -->
  <Teleport to="body">
    <div v-if="showMenu" class="slot-menu-overlay" @click="closeMenu" @contextmenu.prevent="closeMenu" />
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
