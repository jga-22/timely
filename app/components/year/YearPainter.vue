<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { FALLBACK_TEMPLATE_COLOR } from '~/utils/palette'
import { focusEditField } from '~/utils/focus'
import { weeksUsing } from '~/utils/insights'
import { ERASE_TOOL, scheduleOfWeek, toolTemplateId, weekRangeError, weekRangeHint, weekRangeResult, yearRows } from '~/utils/yearGrid'
import type { WeekTemplate } from '~/types/planner'

/**
 * The year painter of the Year tab (FR-YEAR-7, A2 words and look, slice 7): the paint tools (a schedule, or Clear to the active one), the
 * schedule card with the year grid, its legend and the count of weeks each schedule uses, and the "Apply to several weeks" options that apply
 * the paint tool to a range of weeks. The card is open by default. The paint tool is the schedule a range gets: there is no second choice.
 * A schedule id in the URL (the Week tab's link after a new schedule) preselects it in Paint with and opens the options.
 */
const planner = usePlannerStore()
const { templates, appliedWeeks, activeTemplate } = storeToRefs(planner)
const { year, weeks, currentWeekIndex } = usePlannerYear()
const { areaVars } = usePlannerFill()

// The active schedule: the one a week without its own uses (named by Clear and in the lede)
const activeId = computed(() => activeTemplate.value?.id ?? null)
const activeName = computed(() => activeTemplate.value?.name ?? null)

// ── Year painter ──
const paintTool = ref(templates.value[0]?.id ?? '')
const isYearPainting = ref(false)
const hoverWeek = ref<number | null>(null)
// Year opens by default; its state lasts while the view is mounted (in memory, not saved)
const yearOpen = ref(true)
const appliedByDate = computed(() => {
  const m = new Map<string, string>()
  for (const w of appliedWeeks.value) m.set(w.startDate, w.templateId)
  return m
})
/** With one schedule every week uses it: its own weeks, and the unassigned ones, which use the active schedule (the only one) */
const yearLine = computed(() => {
  const only = templates.value[0]
  if (!only) return ''

  return `Every week of ${year.value} uses ${only.name}.`
})
const templateById = computed(() => new Map(templates.value.map(t => [t.id, t])))

/** The count of weeks each schedule uses this year, in the order of the schedules: "48 Standard Week · 2 Vacation" (weeksUsing, FR-INS-P3) */
const usageLine = computed(() => {
  if (year.value === null) return ''

  return templates.value.map(t => `${weeksUsing(planner.$state, t.id, year.value!)} ${t.name}`).join(' · ')
})

/** The name of the schedule the paint tool applies, or null for Clear: what a range of weeks gets */
const paintName = computed(() => {
  const id = toolTemplateId(paintTool.value)
  return id ? (templateById.value.get(id)?.name ?? null) : null
})

/** Rows of the year grid, 14 weeks each (four rows a year), with their month labels */
const gridRows = computed(() => yearRows(weeks.value, 14))

/** The schedule a week's cell shows: its own, else the active one (an unassigned week uses the active schedule) */
const scheduleOfCell = (startDate: string): WeekTemplate | undefined =>
  templateById.value.get(scheduleOfWeek(appliedByDate.value.get(startDate), activeId.value) ?? '')

function paintWeek(wi: number) {
  const startDate = weeks.value[wi]
  if (startDate) planner.setWeekTemplate(startDate, toolTemplateId(paintTool.value))
}

// The colour of a year cell: the schedule the week uses, painted with the area variables (--c); no colour when there is no schedule
const cellStyle = (startDate: string) => {
  const tpl = scheduleOfCell(startDate)
  return tpl ? areaVars(tpl.color ?? FALLBACK_TEMPLATE_COLOR) : {}
}

const cellTitle = (startDate: string, wi: number) => {
  const tpl = scheduleOfCell(startDate)
  const own = appliedByDate.value.has(startDate)
  return `Week ${wi + 1} · ${tpl?.name ?? 'no schedule'}${own ? '' : ' by default'}`
}

// ── Apply to several weeks (FR-YEAR-7): the paint tool's schedule for a range of weeks. Closed by default ──
const weeksOpen = ref(false)
const weeksToggle = ref<HTMLButtonElement | null>(null)
const weeksPanel = ref<HTMLElement | null>(null)
const weekFrom = ref(1)
const weekTo = ref(1)
const weekFromInput = ref<HTMLInputElement | null>(null)
const rangeError = ref('')
const rangeResult = ref('')
const weekCount = computed(() => weeks.value.length)

// Opening focuses "for weeks" on a desktop; on a phone the panel takes focus instead (FR-UX-9)
function openWeeks() {
  weeksOpen.value = true
  nextTick(() => focusEditField(weekFromInput.value, weeksPanel.value))
}

// Escape, or the button again, closes the options; focus returns to the button
function closeWeeks() {
  weeksOpen.value = false
  nextTick(() => weeksToggle.value?.focus())
}

function toggleWeeks() {
  if (weeksOpen.value) closeWeeks()
  else openWeeks()
}

// The item in the URL is a schedule id (a time-off schedule is usually applied next): it is chosen in Paint with, and the options open
// with "for weeks" focused on a desktop (FR-UX-9). The item is then cleared from the URL, so a reload does not repeat it.
// An id this year does not know is ignored
const { item, setSelection } = useNav()
onMounted(() => {
  const templateId = item.value
  if (!templateId || !templateById.value.has(templateId)) return

  paintTool.value = templateId
  setSelection({}, true)
  openWeeks()
})

function applyWeekRange() {
  const count = weekCount.value
  const from = weekFrom.value
  const to = weekTo.value

  if (!count) return

  rangeError.value = weekRangeError(from, to, count)
  if (rangeError.value) {
    rangeResult.value = ''
    return
  }

  planner.setWeeksTemplate(weeks.value.slice(from - 1, to), toolTemplateId(paintTool.value))
  rangeResult.value = weekRangeResult(from, to, paintName.value, activeName.value)
}
</script>

<template>
  <div class="year-painter">
    <!-- Paint with: the schedules, and Clear (to the active schedule, the one a week without its own uses) -->
    <div class="paint-tools year-paint" role="group" aria-label="Paint with">
      <span class="field-label">Paint with</span>
      <button
        v-for="t in templates"
        :key="t.id"
        class="chip"
        :data-active="paintTool === t.id"
        @click="paintTool = t.id"
      >
        <span class="dot year-dot" :style="areaVars(t.color ?? FALLBACK_TEMPLATE_COLOR)" />
        {{ t.name }}
      </button>
      <button class="chip" :data-active="paintTool === ERASE_TOOL" @click="paintTool = ERASE_TOOL">
        <span class="dot dot-erase" />
        Clear to {{ activeName ?? 'the active schedule' }}
      </button>
    </div>

    <!-- Apply to several weeks: a disclosure under the paint tools (FR-YEAR-7), closed by default -->
    <div class="weeks-toggle-row">
      <button
        ref="weeksToggle"
        type="button"
        class="btn btn-sm btn-outline"
        :aria-expanded="weeksOpen"
        aria-controls="weeks-panel"
        @click="toggleWeeks"
      >Apply to several weeks</button>
    </div>

    <!-- The range: the paint tool's schedule (or Clear) for the weeks from and to; typed rather than painted -->
    <div
      v-show="weeksOpen"
      id="weeks-panel"
      ref="weeksPanel"
      class="weeks-row"
      role="group"
      aria-label="Apply to several weeks"
      tabindex="-1"
      @keydown.esc="closeWeeks"
    >
      <div class="weeks-row-line">
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
          :aria-invalid="!!rangeError"
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
          :aria-invalid="!!rangeError"
          aria-describedby="weeks-error"
        />
        <button type="button" class="btn btn-sm btn-primary" @click="applyWeekRange">Apply</button>
      </div>
      <p class="weeks-hint">{{ weekRangeHint(paintName, activeName) }}</p>
      <p v-if="rangeError" id="weeks-error" class="field-error" role="alert">{{ rangeError }}</p>
      <p v-else-if="rangeResult" class="weeks-result" role="status">{{ rangeResult }}</p>
    </div>

    <!-- The schedule card: which weeks use which schedule, the year grid and the legend (A2: one card, open by default) -->
    <section class="year-card" aria-labelledby="year-title">
      <details class="year-details" :open="yearOpen" @toggle="yearOpen = ($event.currentTarget as HTMLDetailsElement).open">
        <summary class="year-summary">
          <h2 id="year-title" class="section-title">Which weeks use which schedule</h2>
          <span v-if="year !== null" class="year-count">{{ usageLine }}</span>
        </summary>

        <div class="year-body">
          <p class="year-hint">
            Pick a schedule above, then click or drag across the weeks.
            <template v-if="currentWeekIndex >= 0">Week {{ currentWeekIndex + 1 }} is outlined.</template>
          </p>
          <p v-if="templates.length === 1 && year !== null" class="year-line">{{ yearLine }}</p>

          <div v-if="weeks.length" class="year-grid-scroll">
            <div class="year-grid" @mouseup="isYearPainting = false" @mouseleave="isYearPainting = false">
              <div v-for="(row, r) in gridRows" :key="r" class="year-row">
                <span class="year-row-label">{{ row.label }}</span>
                <div
                  v-for="week in row.weeks"
                  :key="week.wi"
                  class="week-cell"
                  :class="{ 'is-filled': !!scheduleOfCell(week.startDate), 'is-current': week.wi === currentWeekIndex }"
                  :style="{ ...cellStyle(week.startDate), '--i': week.wi }"
                  :title="cellTitle(week.startDate, week.wi)"
                  @mousedown="isYearPainting = true; paintWeek(week.wi)"
                  @mouseenter="hoverWeek = week.wi; isYearPainting && paintWeek(week.wi)"
                  @mouseleave="hoverWeek = null"
                >{{ week.wi + 1 }}</div>
              </div>
            </div>
          </div>

          <!-- The legend: each schedule's colour, and the outline of this week -->
          <ul class="year-legend" aria-label="Legend">
            <li v-for="t in templates" :key="t.id">
              <span class="year-swatch" :style="areaVars(t.color ?? FALLBACK_TEMPLATE_COLOR)" aria-hidden="true" />{{ t.name }}
            </li>
            <li><span class="year-swatch is-current" aria-hidden="true" />This week</li>
          </ul>

          <div v-if="hoverWeek !== null" class="week-readout">
            Week {{ hoverWeek + 1 }} ·
            <span v-if="appliedByDate.get(weeks[hoverWeek]!)">
              {{ templateById.get(appliedByDate.get(weeks[hoverWeek]!)!)?.name }}
            </span>
            <span v-else class="muted">{{ scheduleOfCell(weeks[hoverWeek]!)?.name ?? 'no schedule' }} by default, click to paint</span>
          </div>
        </div>
      </details>
    </section>
  </div>
</template>
