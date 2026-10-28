<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { isoWeekOf } from '~/utils/dates'
import { formatHour } from '~/utils/planner'
import { dayBlocks, dayHours, formatDayLabel } from '~/utils/home'

// Read-only (FR-HOME-1) except the journal card (a separate component); every item has an Edit link to its owner.
const planner = usePlannerStore()
const { today } = usePlannerYear()
const { link } = useNav()
const { categoryMap, getActivityColor } = usePlannerMaps()
const { fill } = usePlannerFill()
// Sleep is hidden unless 'Show sleep' is on (FR-SLEEP-4): its hours then count as unplanned, and its rows are left out
const { showSleep } = useShowSleep()

// Hour of day for the "Now" mark; null until mounted (FR-DATE-6)
const nowHour = ref<number | null>(null)
let clock: number | undefined

const readNow = () => {
  nowHour.value = new Date().getHours()
}

onMounted(() => {
  readNow()
  clock = window.setInterval(readNow, 60_000)
})

onUnmounted(() => window.clearInterval(clock))

// Date-dependent output is null until mounted, so the first server and client passes agree (FR-DATE-6)
const weekNumber = computed(() => (today.value ? isoWeekOf(today.value).week : null))
// Small text under the title: the date and the ISO week, e.g. "Tuesday 27 October · Week 44"
const headerLine = computed(() => {
  if (!today.value || weekNumber.value === null) return null

  return [formatDayLabel(today.value), `Week ${weekNumber.value}`].join(' · ')
})

// Today's blocks in time order, each with its activity, category and duration
const dayRows = computed(() => {
  if (!today.value) return []

  return dayBlocks(planner.$state, today.value, showSleep.value).map(block => {
    const activity = planner.activities.find(item => item.id === block.activityId)!

    return {
      block,
      activity,
      category: categoryMap.value.get(activity.categoryId)!,
      now: nowHour.value !== null && nowHour.value >= block.start && nowHour.value < block.end
    }
  })
})

// Timeline: the 24 hours of today in order, one flex segment per hour (FR-HOME-4). Unplanned hours have no colour
interface TimelineSegment {
  key: string
  color: string
  title: string
}

const timeline = computed<TimelineSegment[]>(() => {
  if (!today.value) return []

  return dayHours(planner.$state, today.value, showSleep.value).map((activityId, hour) => {
    const name = activityId ? planner.activities.find(item => item.id === activityId)?.name ?? '' : ''

    return {
      key: `h${hour}`,
      color: activityId ? fill(getActivityColor(activityId)) : '',
      title: `${formatHour(hour)}, ${name || 'unplanned'}`
    }
  })
})

// Hour labels on the timeline axis, positioned on a 24-hour scale
const AXIS_HOURS = [9, 12, 18, 22]
const axisLeft = (hour: number) => `${(hour / 24) * 100}%`
</script>

<template>
  <div class="view">
    <header class="page-head">
      <h1 class="page-title">Today</h1>
      <p v-if="headerLine" class="page-meta">{{ headerLine }}</p>
    </header>

    <template v-if="today">
      <!-- Timeline directly below the title: coloured hours only; the text is in each segment's title and aria-label -->
      <div class="home-sleep-line">
        <p v-if="!showSleep" class="page-meta">Sleep is hidden: those hours count as unplanned.</p>
        <SleepToggle />
      </div>

      <div class="home-timeline" role="group" aria-label="Hours today by activity">
        <div class="home-timeline-bar">
          <span
            v-for="segment in timeline"
            :key="segment.key"
            class="home-timeline-seg"
            :class="{ 'is-unplanned': !segment.color }"
            :style="{ background: segment.color || undefined }"
            role="img"
            :title="segment.title"
            :aria-label="segment.title"
          />
        </div>
        <div class="home-axis" aria-hidden="true">
          <span
            v-for="hour in AXIS_HOURS"
            :key="hour"
            class="home-axis-tick"
            :style="{ left: axisLeft(hour) }"
          >{{ hour }}h</span>
        </div>
      </div>

      <!-- Today's activities in time order (FR-HOME-4); the Edit links open the owning item in Planner -->
      <p v-if="!planner.activities.length" class="home-empty">
        No activities yet. <NuxtLink :to="link('planner')">Add activities in Planner</NuxtLink>.
      </p>

      <template v-else>
        <ol v-if="dayRows.length" class="home-rows" aria-label="Activities today">
          <li
            v-for="(row, index) in dayRows"
            :key="index"
            class="home-row"
            :class="{ 'is-now': row.now }"
          >
            <span class="home-row-time">{{ formatHour(row.block.start) }}–{{ formatHour(row.block.end) }}</span>
            <div class="home-row-main">
              <span class="home-row-name">
                <span class="dot" :style="{ background: getActivityColor(row.activity.id) }" />
                {{ row.activity.name }}
                <span v-if="row.now" class="home-now">Now</span>
              </span>
              <NuxtLink class="home-row-cat" :to="link('goals', { item: row.category.id })">{{ row.category.name }}</NuxtLink>
            </div>
            <span class="home-row-hours">{{ row.block.end - row.block.start }} h</span>
            <EditButton :to="link('planner', { item: row.activity.id, edit: true })" :label="`Edit ${row.activity.name}`" />
          </li>
        </ol>
        <p v-else class="home-empty">
          Nothing planned today. <NuxtLink :to="link('planner')">Plan your time in Planner</NuxtLink>.
        </p>
      </template>
    </template>

    <HomeJournalCard />
  </div>
</template>
