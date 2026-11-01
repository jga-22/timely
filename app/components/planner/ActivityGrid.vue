<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { useGridEdge } from '~/composables/useGridEdge'
import { useGridEdit } from '~/composables/useGridEdit'
import { useGridPopups } from '~/composables/useGridPopups'
import { useGridSelection } from '~/composables/useGridSelection'
import { DAYS, formatHour } from '~/utils/planner/format'
import { aggregateTemplate } from '~/utils/planner/aggregate'
import { isHourlyTemplate } from '~/utils/planner/templates'
import { slotsToBlocks } from '~/utils/planner/slots'
import { isSleepActivity, sleepActivityId } from '~/utils/sleep'
import { GAP_PX, HOUR_PX, HOURS, type Cell, type Range, collapsedBandLabels, collapsedHours, coversCollapsed, flowRows, hourTops, nearestShown, withoutSleep } from '~/utils/weekGrid'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * closeToken: the parent bumps it when another editor opens (the entry form), so a box or menu open here closes (PRD 11.2).
 * open: a box or menu opened here, so the parent closes its own editors (the week type panel and the entry form)
 */
const props = defineProps<{ closeToken?: number }>()
const emit = defineEmits<{ open: [] }>()

const planner = usePlannerStore()
const { activeTemplate } = storeToRefs(planner)

// Sleep (FR-SLEEP-3 to 5): while hidden it reads as empty, is not counted, and its rows collapse. The real slots stay the undo's source
const { showSleep, setShowSleep } = useShowSleep()
const sleepId = computed(() => sleepActivityId(planner.$state))
const sleepHidden = computed(() => !!sleepId.value && !showSleep.value)
const slots = computed(() => activeTemplate.value?.slots ?? [])
const shownSlots = computed(() => (sleepHidden.value ? withoutSleep(slots.value, sleepId.value) : slots.value))
const hourly = computed(() => isHourlyTemplate(activeTemplate.value))
const templateName = computed(() => activeTemplate.value?.name ?? 'no week type')
const plannedHours = computed(() => shownSlots.value.filter(Boolean).length)
const metaText = computed(() => (sleepHidden.value ? `${plannedHours.value} h planned, sleep hidden` : `${plannedHours.value} of 168 h planned`))
const hoursPerDay = computed(() => DAYS.map((_, day) => shownSlots.value.slice(day * 24, day * 24 + 24).filter(Boolean).length))
const blocksByDay = computed(() => DAYS.map((_, day) => slotsToBlocks(shownSlots.value, day)))
const menuActivities = computed(() => planner.activities.filter(activity => showSleep.value || !isSleepActivity(activity)))
const activityMap = computed(() => new Map(planner.activities.map(activity => [activity.id, activity])))
const activityHours = computed(() => (activeTemplate.value ? aggregateTemplate(activeTemplate.value, planner.activities) : new Map<string, number>()))

/**
 * Hours that are sleep on all seven days while sleep is hidden: their rows collapse, so the grid is shorter (FR-SLEEP-5).
 * The rules are in utils/weekGrid.ts; the component reads the store and lays the rows out
 */
const collapsed = computed(() => collapsedHours(slots.value, sleepHidden.value ? sleepId.value : null))
const isCollapsed = (hour: number) => collapsed.value[hour] === true
const shownHours = computed(() => HOURS.filter(hour => !isCollapsed(hour)))
const firstShown = computed(() => shownHours.value[0] ?? 0)
const lastShown = computed(() => shownHours.value[shownHours.value.length - 1] ?? 23)

/** The rows of the grid: each shown hour, and one thin band for each run of collapsed hours between shown ones */
const flow = computed(() => flowRows(collapsed.value))
/** Top of each shown hour inside the day columns, in px */
const hourTop = computed<number[]>(() => hourTops(flow.value, HOUR_PX, GAP_PX))
const nearestShownHour = (hour: number) => nearestShown(shownHours.value, hour)

// The bands above and below the rows say which hours are collapsed; clicking one shows sleep
const bands = computed(() => collapsedBandLabels(firstShown.value, lastShown.value))

// The state the selection and the edit share: one run of hours in one day column, the run as it was made, the keyboard cursor and its anchor
const selection = ref<Range | null>(null)
const baseline = ref<Range | null>(null)
const anchor = ref<Cell | null>(null)
const cursor = ref<Cell>({ day: 0, hour: 8 })
const gridEl = ref<HTMLElement | null>(null)

// The box and menu (composables/useGridPopups.ts), the edge handles (useGridEdge.ts), the edit and the undo line (useGridEdit.ts);
// the selection (useGridSelection.ts). The popups and the edge come first: the edit composes them
const popups = useGridPopups({ selection, cursor, gridEl, hourTop, onOpen: () => emit('open') })
const edge = useGridEdge({ selection, baseline, gridEl, shownSlots, collapsed, hourTop, popups })
const edit = useGridEdit({
  selection,
  baseline,
  anchor,
  activeTemplate,
  slots,
  shownSlots,
  sleepId,
  sleepHidden,
  showSleep,
  activityMap,
  paintCells: (templateId, cells, activityId) => planner.paintCells(templateId, cells, activityId),
  popups,
  edge,
})
const { barRef, menuRef, barOpen, menuOpen, barPos, editing, handles, moved, selectionHasActivity, undo, dismissUndo, undoLast, focusCursor, placeAt, endEdit, closeAll, pickFromBar, applyActivity, clearRange, clearSelection, clearDay, editActivity, cancelEdit, saveEdit, startResize, onHandleKey, onHandleTab, onBarKey } = edit

const { setCursor, onPointerDown, onPointerMove, onKeydown } = useGridSelection({ selection, baseline, anchor, cursor, hourly, shownSlots, collapsed, hourTop, endEdit, placeAt, focusCursor })

/** Keys on the grid body: Tab from a focused handle goes to the box (the edit's); every other key is the selection's */
const onGridKeydown = (event: KeyboardEvent) => {
  if ((event.target as HTMLElement).classList.contains('wk-handle')) onHandleTab(event)
  else onKeydown(event)
}

// Switching template closes any open popup and forgets the undo step (it belongs to the old template)
watch(() => activeTemplate.value?.id, () => {
  dismissUndo()
  if (editing.value) closeAll()
})

// Rows collapse or come back with Show sleep: the cursor moves to a shown hour; a selection that now covers a collapsed hour is dropped.
// Showing sleep again restores every row and keeps the selection
watch(collapsed, () => {
  if (isCollapsed(cursor.value.hour)) setCursor({ day: cursor.value.day, hour: nearestShownHour(cursor.value.hour) })

  const range = selection.value
  if (range && coversCollapsed(range, collapsed.value)) closeAll()
})

// The week grid's disclosure (open by default, in memory only). Collapsing it hides the grid, so a bar or menu open on it closes;
// the selection and the cursor stay and show again when it opens
const weekOpen = ref(true)
watch(weekOpen, (open) => {
  if (!open && editing.value) closeAll()
})

// Another editor opened (the entry form, through the parent): this box or menu closes without moving focus
watch(() => props.closeToken, () => {
  if (editing.value) closeAll({ focus: false })
})
</script>

<template>
  <section class="section wk-section" aria-labelledby="week-title">
    <!-- Collapsible like the Year section (open by default, in memory only); the Show sleep button is inside it, above the grid -->
    <div class="wk-head-line">
      <details class="wk-details" :open="weekOpen" @toggle="weekOpen = ($event.currentTarget as HTMLDetailsElement).open">
        <summary class="section-summary wk-summary">
          <h2 id="week-title" class="section-title">Week</h2>
          <p class="wk-meta">{{ templateName }} · {{ metaText }}</p>
        </summary>

        <p v-if="!hourly" class="wk-helper">This week type has 30-minute slots, and this grid edits hourly week types only.</p>

        <template v-else>
          <div v-if="sleepId" class="wk-tools">
            <SleepToggle />
          </div>

          <div class="wk-scroll">
            <div class="wk" :data-editing="handles ? 'true' : 'false'">
              <div class="wk-head">
                <div class="wk-corner" aria-hidden="true" />
                <div v-for="(day, index) in DAYS" :key="day" class="wk-day-head">
                  <span class="wk-day-name">{{ day }}</span>
                  <span class="wk-day-hours">{{ hoursPerDay[index] }} h</span>
                  <button
                    type="button"
                    class="wk-clear-day"
                    :title="`Clear ${DAY_NAMES[index]}`"
                    :aria-label="`Clear ${DAY_NAMES[index]}`"
                    @click="clearDay(index)"
                  >✕</button>
                </div>
              </div>

              <!-- The band above the rows: the leading run of collapsed hours (sleep hidden), clicking it shows sleep -->
              <button v-if="bands.top" type="button" class="wk-band is-top" @click="setShowSleep(true)">
                <span>Sleep hidden: {{ bands.top }}</span>
                <span class="wk-band-action">Show sleep</span>
              </button>

              <div
                ref="gridEl"
                class="wk-body"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @keydown="onGridKeydown"
              >
                <div class="wk-hours" aria-hidden="true">
                  <template v-for="row in flow" :key="row.kind === 'hour' ? `h${row.hour}` : `g${row.from}`">
                    <div v-if="row.kind === 'gap'" class="wk-gap" />
                    <div v-else class="wk-hour" :class="{ 'is-major': row.hour % 3 === 0 }">{{ row.hour % 3 === 0 ? formatHour(row.hour) : '' }}</div>
                  </template>
                </div>

                <PlannerWeekGridDay
                  v-for="(day, dayIndex) in DAYS"
                  :key="day"
                  :day="dayIndex"
                  :name="DAY_NAMES[dayIndex] ?? ''"
                  :flow="flow"
                  :tops="hourTop"
                  :shown-slots="shownSlots"
                  :activities="activityMap"
                  :blocks="blocksByDay[dayIndex] ?? []"
                  :cursor="cursor"
                  :selection="selection"
                  :handles="handles"
                  @focus-cell="setCursor"
                  @clear="clearRange"
                  @resize="startResize"
                  @handle-key="onHandleKey"
                />
              </div>
            </div>
          </div>

          <!-- The band below the rows: the trailing run of collapsed hours -->
          <button v-if="bands.bottom" type="button" class="wk-band is-bottom" @click="setShowSleep(true)">
            <span>Sleep hidden: {{ bands.bottom }}</span>
            <span class="wk-band-action">Show sleep</span>
          </button>

          <p v-if="undo" class="wk-undo" role="status">
            <span>{{ undo.text }}</span>
            <button type="button" class="btn btn-xs btn-outline" @click="undoLast">Undo</button>
          </p>
        </template>
      </details>
    </div>

    <Teleport to="body">
      <!-- Closes on pointerdown, not click: the click that follows a tap would otherwise land on the overlay that the tap just opened.
           With handles the grid stays live under the box, so a handle can be dragged -->
      <div v-if="menuOpen || (barOpen && !handles)" class="wk-overlay" @pointerdown="closeAll()" @contextmenu.prevent="closeAll()" />

      <PlannerWeekGridBar
        v-if="barOpen && selection"
        ref="barRef"
        :selection="selection"
        :pos="barPos"
        :has-activity="selectionHasActivity"
        :can-save="moved"
        @pick="pickFromBar"
        @edit="editActivity"
        @delete="clearSelection"
        @save="saveEdit"
        @cancel="cancelEdit"
        @keydown="onBarKey"
      />

      <PlannerWeekGridMenu
        v-if="menuOpen && selection"
        ref="menuRef"
        :selection="selection"
        :pos="barPos"
        :activities="menuActivities"
        :hours="activityHours"
        :has-any="planner.activities.length > 0"
        @apply="applyActivity"
        @clear="clearSelection"
      />
    </Teleport>
  </section>
</template>
