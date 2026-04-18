<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { DAYS, DESIGN_COLORS, WEEK_DATES_2026, CURRENT_WEEK_INDEX, slotsToBlocks, formatHour } from '~/utils/planner'

const HOUR_PX = 28

const planner = usePlannerStore()
const { activeTemplate, templates, appliedWeeks } = storeToRefs(planner)

// ── Template switcher state ──
const renamingId = ref<string | null>(null)
const colorPickerFor = ref<string | null>(null)
const newTemplateOpen = ref(false)
const newTemplateName = ref('')
const paintTool = ref(templates.value[0]?.id ?? '')

// ── Drag state ──
const draggingActivityId = ref<string | null>(null)
const dropPreview = ref<{ activityId: string; day: number; start: number; end: number } | null>(null)
const dragAnchor = ref<{ day: number; hour: number } | null>(null)

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
  for (let d = 0; d < 7; d++) {
    result[d] = slotsToBlocks(activeTemplate.value.slots, d)
  }
  return result
})

const activityMap = computed(() => new Map(planner.activities.map(a => [a.id, a])))

const templateColor = (t: typeof templates.value[0]) =>
  t.color ?? '#5d6b7a'

// ── Year painter ──
const isPainting = ref(false)
const hoverWeek = ref<number | null>(null)

const appliedByDate = computed(() => {
  const m = new Map<string, string>()
  for (const w of appliedWeeks.value) m.set(w.startDate, w.templateId)
  return m
})

const templateById = computed(() => new Map(templates.value.map(t => [t.id, t])))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Drag from palette ──
const onPaletteDragStart = (e: DragEvent, activityId: string) => {
  draggingActivityId.value = activityId
  e.dataTransfer!.effectAllowed = 'copy'
  const act = activityMap.value.get(activityId)
  if (!act) return
  const ghost = document.createElement('div')
  ghost.textContent = act.name
  ghost.style.cssText = `position:fixed;top:-9999px;padding:6px 12px;background:${act.color};color:#fff;font:500 12px sans-serif;border-radius:3px;`
  document.body.appendChild(ghost)
  e.dataTransfer!.setDragImage(ghost, 40, 14)
  setTimeout(() => ghost.remove(), 0)
}

const onPaletteDragEnd = () => {
  draggingActivityId.value = null
  dropPreview.value = null
  dragAnchor.value = null
}

const onSlotDragOver = (e: DragEvent, day: number, hour: number) => {
  if (!draggingActivityId.value) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  const activityId = draggingActivityId.value
  if (dropPreview.value?.day !== day) {
    dragAnchor.value = { day, hour }
    dropPreview.value = { activityId, day, start: hour, end: hour + 1 }
  } else {
    const anchor = dragAnchor.value?.day === day ? dragAnchor.value.hour : hour
    dropPreview.value = {
      activityId,
      day,
      start: Math.min(anchor, hour),
      end: Math.max(anchor, hour) + 1
    }
  }
}

const onSlotDrop = (e: DragEvent, day: number, hour: number) => {
  e.preventDefault()
  const activityId = draggingActivityId.value
  if (!activityId || !activeTemplate.value) return
  const start = dropPreview.value?.day === day ? dropPreview.value.start : hour
  const end   = dropPreview.value?.day === day ? dropPreview.value.end   : hour + 1
  planner.applyTimeRange(activityId, [day], start, end)
  dropPreview.value = null
  draggingActivityId.value = null
}

const onGridDragLeave = (e: DragEvent, el: HTMLElement | null) => {
  if (!el?.contains(e.relatedTarget as Node)) {
    dropPreview.value = null
    dragAnchor.value = null
  }
}

const removeBlock = (day: number, start: number, end: number) => {
  planner.clearTimeRange([day], start, end)
}

// ── Template management ──
const handleNewTemplate = () => {
  if (!newTemplateName.value.trim()) return
  planner.createTemplate()
  const newId = planner.templates[0]?.id
  if (newId) planner.renameActiveTemplate(newTemplateName.value.trim())
  newTemplateName.value = ''
  newTemplateOpen.value = false
}

// ── Year painter ──
const paintWeek = (weekIdx: number) => {
  const startDate = WEEK_DATES_2026[weekIdx]
  if (!startDate) return
  if (paintTool.value === 'erase') {
    planner.setWeekTemplate(startDate, null)
  } else {
    planner.setWeekTemplate(startDate, paintTool.value)
  }
}

const gridRef = ref<HTMLElement | null>(null)
</script>

<template>
  <div class="view">
    <!-- Page header -->
    <div class="page-head">
      <div>
        <div class="page-kicker">01 · Planner</div>
        <h1 class="page-title">Design your <em>ideal</em> week,<br>hour by hour.</h1>
        <p class="page-lede">
          Drag any category from the palette onto the grid to paint your week.
          Click an existing block to remove it.
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
        <!-- Rename input -->
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
          @click="planner.selectTemplate(t.id)"
          @dblclick="renamingId = t.id"
          :title="`Click to select · double-click to rename`"
        >
          <span
            :style="{ width: '12px', height: '12px', borderRadius: '3px', background: templateColor(t), border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer', flexShrink: 0, boxShadow: t.id === activeTemplate?.id ? 'inset 0 0 0 1.5px rgba(255,255,255,0.7)' : 'none' }"
            :title="`Change color`"
            @click.stop="colorPickerFor = colorPickerFor === t.id ? null : t.id"
          />
          <span class="t-name">{{ t.name }}</span>
          <span style="font-family: var(--font-mono); font-size: 10px; opacity: 0.7">{{ Object.values(activityHours).reduce((a, b) => a + b, 0) === 0 ? 0 : (t.slots.filter(Boolean).length) }}h</span>
        </button>

        <!-- Color picker -->
        <div v-if="colorPickerFor === t.id" class="color-pop" style="top: 34px; left: 0">
          <button
            v-for="col in DESIGN_COLORS"
            :key="col.id"
            :style="{ background: col.bg }"
            :data-active="t.color === col.bg"
            @click="planner.setTemplateColor(t.id, col.bg); colorPickerFor = null"
          />
        </div>
      </div>

      <!-- New template -->
      <div v-if="newTemplateOpen" style="display: flex; gap: 4px">
        <input
          class="timely-input"
          autofocus
          placeholder="e.g. Launch week"
          v-model="newTemplateName"
          style="height: 30px; width: 150px; font-size: 12px"
          @keydown.enter="handleNewTemplate"
          @keydown.escape="newTemplateOpen = false; newTemplateName = ''"
        />
        <button class="btn btn-sm btn-primary" @click="handleNewTemplate">Add</button>
      </div>
      <button v-else class="template-pill-add" @click="newTemplateOpen = true">
        + New template
      </button>

      <button
        v-if="templates.length > 1"
        class="btn btn-xs btn-ghost btn-danger"
        style="margin-left: auto"
        @click="() => { if (confirm(`Delete template '${activeTemplate?.name}'?`)) planner.deleteTemplate(activeTemplate?.id ?? '') }"
      >
        Delete "{{ activeTemplate?.name }}"
      </button>
    </div>

    <!-- Planner grid -->
    <div class="planner-grid">
      <!-- Left: Palette -->
      <div class="panel">
        <div class="panel-head">
          <h2 class="panel-title">Palette</h2>
          <span class="panel-sub">Drag onto grid</span>
        </div>

        <div class="palette">
          <div
            v-for="activity in planner.activities"
            :key="activity.id"
            class="palette-chip"
            draggable="true"
            :style="{ background: activity.color, color: '#fff' }"
            @dragstart="onPaletteDragStart($event, activity.id)"
            @dragend="onPaletteDragEnd"
          >
            <span>{{ activity.name }}</span>
            <span class="palette-chip-hrs">{{ activityHours[activity.id] || 0 }}h</span>
          </div>
        </div>

        <div class="divider-label">How it works</div>
        <ul style="margin: 0; padding-left: 16px; font-size: 11.5px; color: var(--ink-3); line-height: 1.7">
          <li>Drag a chip onto any slot to add a block.</li>
          <li>Drag across multiple slots to paint a range.</li>
          <li>Click an existing block to remove it.</li>
        </ul>

        <div class="divider-label" style="margin-top: 16px">Quick actions</div>
        <button
          class="btn btn-xs"
          @click="() => { if (confirm('Clear entire week?')) DAYS.forEach((_, d) => planner.clearTimeRange([d], 0, 24)) }"
        >
          Clear week
        </button>
      </div>

      <!-- Right: Week grid -->
      <div
        class="week"
        ref="gridRef"
        @dragleave="onGridDragLeave($event, gridRef)"
      >
        <!-- Header -->
        <div class="week-head">
          <div class="corner" />
          <div v-for="(day, di) in DAYS" :key="day" class="wday">
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span class="day-name">{{ day }}</span>
              <button
                style="width:16px;height:16px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--ink-4);opacity:0;transition:opacity 0.1s;font-size:10px"
                :title="`Clear ${day}`"
                @click="planner.clearTimeRange([di], 0, 24)"
                @mouseenter="($event.target as HTMLElement).style.opacity='1'"
                @mouseleave="($event.target as HTMLElement).style.opacity='0'"
              >✕</button>
            </div>
            <span class="day-hours-label">
              {{ hoursPerDay[di] }}<span class="unit">hr</span>
            </span>
          </div>
        </div>

        <!-- Body -->
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
            <!-- Slot cells (drop targets) -->
            <div
              v-for="hour in 24"
              :key="hour - 1"
              class="slot"
              :class="{
                major: (hour - 1) % 3 === 0,
                'drop-preview': dropPreview?.day === dayIndex && (hour - 1) >= dropPreview.start && (hour - 1) < dropPreview.end
              }"
              @dragover="onSlotDragOver($event, dayIndex, hour - 1)"
              @drop="onSlotDrop($event, dayIndex, hour - 1)"
            />

            <!-- Blocks -->
            <div
              v-for="block in blocksByDay[dayIndex]"
              :key="`${dayIndex}-${block.start}-${block.activityId}`"
              class="block"
              :class="{
                'block-sm': (block.end - block.start) * HOUR_PX < 40,
                'block-xs': (block.end - block.start) * HOUR_PX < 24,
              }"
              :style="{
                top: `${block.start * HOUR_PX}px`,
                height: `${(block.end - block.start) * HOUR_PX - 2}px`,
                background: activityMap.get(block.activityId)?.color ?? '#999',
                color: '#fff',
              }"
              :title="`${activityMap.get(block.activityId)?.name} — ${formatHour(block.start)} to ${formatHour(block.end)}`"
              @click="removeBlock(dayIndex, block.start, block.end)"
            >
              <div class="block-title">{{ activityMap.get(block.activityId)?.name }}</div>
              <div class="block-meta">{{ formatHour(block.start) }}–{{ formatHour(block.end) }}</div>
              <span class="block-x">✕</span>
            </div>

            <!-- Drop ghost -->
            <div
              v-if="dropPreview?.day === dayIndex"
              class="block"
              style="background: repeating-linear-gradient(45deg, var(--accent) 0 4px, var(--accent-soft) 4px 8px); opacity: 0.5; pointer-events: none; color: #fff; border: 1px dashed rgba(255,255,255,0.6)"
              :style="{
                top: `${dropPreview.start * HOUR_PX}px`,
                height: `${(dropPreview.end - dropPreview.start) * HOUR_PX - 2}px`,
              }"
            >
              <div class="block-title" style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em">
                {{ dropPreview.end - dropPreview.start }}h
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Week stats -->
    <div class="week-stats">
      <div v-for="activity in planner.activities" :key="activity.id" class="stat">
        <div class="stat-label">
          <span :style="{ width: '8px', height: '8px', borderRadius: '2px', background: activity.color }" />
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
            Unassigned weeks show as empty.
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
        <button
          class="paint-tool"
          :data-active="paintTool === 'erase'"
          @click="paintTool = 'erase'"
        >
          <span class="dot" style="background: var(--bg-3); border: 1px dashed var(--ink-3)" />
          Erase
        </button>
      </div>

      <div class="year-months">
        <div v-for="m in MONTHS" :key="m" class="m">{{ m }}</div>
      </div>

      <div
        class="year-grid"
        @mouseup="isPainting = false"
        @mouseleave="isPainting = false"
      >
        <div
          v-for="(startDate, wi) in WEEK_DATES_2026"
          :key="wi"
          class="week-cell"
          :class="{ empty: !appliedByDate.get(startDate), 'is-current': wi === CURRENT_WEEK_INDEX }"
          :style="appliedByDate.get(startDate)
            ? { background: templateColor(templateById.get(appliedByDate.get(startDate)!)!) }
            : {}"
          :title="appliedByDate.get(startDate)
            ? `Week ${wi + 1} · ${templateById.get(appliedByDate.get(startDate)!)?.name}`
            : `Week ${wi + 1} · unassigned`"
          @mousedown="isPainting = true; paintWeek(wi)"
          @mouseenter="hoverWeek = wi; isPainting && paintWeek(wi)"
          @mouseleave="hoverWeek = null"
        >
          <span class="wnum">{{ wi + 1 }}</span>
        </div>
      </div>

      <div v-if="hoverWeek !== null" style="margin-top: 14px; font-size: 13px; color: var(--ink-2)">
        <span class="panel-sub" style="margin-right: 8px">Week {{ hoverWeek + 1 }}</span>
        <span v-if="appliedByDate.get(WEEK_DATES_2026[hoverWeek])">
          {{ templateById.get(appliedByDate.get(WEEK_DATES_2026[hoverWeek])!)?.name }}
        </span>
        <span v-else style="color: var(--ink-3); font-style: italic">
          unassigned — click to paint
        </span>
      </div>
    </div>
  </div>
</template>
