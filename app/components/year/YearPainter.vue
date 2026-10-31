<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { inkOn } from '~/utils/palette'
import { focusEditField } from '~/utils/focus'
import { ERASE_TOOL, toolTemplateId, weekRangeError, weekRangeHint, weekRangeResult, yearRows } from '~/utils/yearGrid'
import type { WeekTemplate } from '~/types/planner'

/**
 * The year painter of the Year tab (FR-YEAR-7): the year grid to paint weeks with a week type, the "Apply to several weeks" options to
 * apply the paint tool to a range of weeks, and the count of assigned weeks. Collapsible, open by default. The paint tool is the week type
 * a range gets: there is no second choice. A week type id in the URL (the Week tab's link after a new week type) preselects it in
 * Paint with and opens the options.
 */
const planner = usePlannerStore()
const { templates, appliedWeeks } = storeToRefs(planner)
const { year, weeks, currentWeekIndex } = usePlannerYear()
const { fill } = usePlannerFill()

// The paint colour of a template: the same fill on the year grid, in the paint tools and in the switcher
const templateFill = (t: WeekTemplate) => fill(t.color ?? '#5d6b7a')

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
const assignedInYear = computed(() => weeks.value.filter(startDate => appliedByDate.value.has(startDate)).length)
/** With one week type: every week uses it when all are assigned to it; otherwise unassigned weeks use the active one (named generically) */
const yearLine = computed(() => {
  const only = templates.value[0]
  if (!only) return ''

  const uses = assignedInYear.value === weeks.value.length ? only.name : 'the active week type'
  return `Every week of ${year.value} uses ${uses}.`
})
const templateById = computed(() => new Map(templates.value.map(t => [t.id, t])))

/** The name of the week type the paint tool applies, or null for Erase: what a range of weeks gets */
const paintName = computed(() => {
  const id = toolTemplateId(paintTool.value)
  return id ? (templateById.value.get(id)?.name ?? null) : null
})

/** Rows of the year grid (13 weeks each), with their month labels */
const gridRows = computed(() => yearRows(weeks.value))

function paintWeek(wi: number) {
  const startDate = weeks.value[wi]
  if (startDate) planner.setWeekTemplate(startDate, toolTemplateId(paintTool.value))
}

// Background colour for a year cell: the template painted on that week
const cellStyle = (startDate: string) => {
  const tpl = templateById.value.get(appliedByDate.value.get(startDate) ?? '')
  if (!tpl) return undefined

  const color = templateFill(tpl)
  return { '--c': color, '--c-ink': inkOn(color) }
}

// ── Apply to several weeks (FR-YEAR-7): the paint tool's week type for a range of weeks. Closed by default ──
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

// The item in the URL is a week type id (a time-off week type is usually applied next): it is chosen in Paint with, and the options open
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
  rangeResult.value = weekRangeResult(from, to, paintName.value)
}
</script>

<template>
  <!-- Year: full width, collapsible, open by default with any number of week types. With one week type a line says which one the year uses -->
  <section class="section year-section" aria-labelledby="year-title">
    <details class="year-details" :open="yearOpen" @toggle="yearOpen = ($event.currentTarget as HTMLDetailsElement).open">
      <summary class="year-summary">
        <h2 id="year-title" class="section-title">Plan your year</h2>
        <span v-if="year !== null" class="year-count">{{ assignedInYear }} of {{ weeks.length }} weeks assigned</span>
      </summary>

      <div class="year-body">
        <p v-if="templates.length === 1 && year !== null" class="year-line">{{ yearLine }}</p>

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
          <button class="chip" :data-active="paintTool === ERASE_TOOL" @click="paintTool = ERASE_TOOL">
            <span class="dot dot-erase" />
            Erase
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

        <!-- The range: the paint tool's week type (or Erase) for the weeks from and to; typed rather than painted -->
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
          <p class="weeks-hint">{{ weekRangeHint(paintName) }}</p>
          <p v-if="rangeError" id="weeks-error" class="field-error" role="alert">{{ rangeError }}</p>
          <p v-else-if="rangeResult" class="weeks-result" role="status">{{ rangeResult }}</p>
        </div>

        <div v-if="weeks.length" class="year-grid-scroll">
          <div class="year-grid" @mouseup="isYearPainting = false" @mouseleave="isYearPainting = false">
            <div v-for="(row, r) in gridRows" :key="r" class="year-row">
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
</template>
