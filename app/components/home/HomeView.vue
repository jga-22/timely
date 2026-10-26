<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { isoWeekOf, mondayOf } from '~/utils/dates'
import { formatHour } from '~/utils/planner'
import {
  HOME_PERIODS,
  dayBlocks,
  dayHours,
  formatDayLabel,
  formatMonthLabel,
  formatWeekRange,
  isWeekAssigned,
  periodBreakdown,
  periodTemplates,
  type HomePeriod
} from '~/utils/home'

// Read-only (FR-HOME-1) except the period selector and the journal card (a separate component); every item has an Edit link to its owner.
const planner = usePlannerStore()
const { today } = usePlannerYear()
const { link } = useNav()
const { categoryMap, getActivityColor } = usePlannerMaps()
const { fill } = usePlannerFill()

// Kept in app state, not the URL: the choice survives a tab switch within the session (FR-HOME-2), default Day
const period = useState<HomePeriod>('home-period', () => 'day')

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
const NOUN: Record<HomePeriod, string> = { day: 'today', week: 'this week', month: 'this month' }
const LIST_TITLE: Record<HomePeriod, string> = { day: 'Today', week: 'This week', month: 'This month' }

const weekNumber = computed(() => (today.value ? isoWeekOf(today.value).week : null))

const breakdown = computed(() => (today.value ? periodBreakdown(planner.$state, period.value, today.value) : null))
const templates = computed(() => (today.value ? periodTemplates(planner.$state, period.value, today.value) : []))
const unassignedWeek = computed(() => (today.value !== null && !isWeekAssigned(planner.$state, today.value)))

const headerLine = computed(() => {
  if (!today.value || weekNumber.value === null) return null

  const when = period.value === 'day'
    ? formatDayLabel(today.value)
    : period.value === 'week'
      ? formatWeekRange(mondayOf(today.value))
      : formatMonthLabel(today.value)

  // Month always counts days per template; Week names the templates and counts them only when more than one applies
  const withDays = period.value === 'month' || (period.value === 'week' && templates.value.length > 1)
  const templateText = templates.value
    .map(({ template, days }) => (withDays ? `${template.name} ${days} d` : template.name))
    .join(', ')

  return period.value === 'month'
    ? [when, templateText].join(' · ')
    : [when, `Week ${weekNumber.value}`, templateText].join(' · ')
})

// Day: today's blocks in time order, each with its activity, category and projected duration
const dayRows = computed(() => {
  if (!today.value || period.value !== 'day') return []

  return dayBlocks(planner.$state, today.value).map(block => {
    const activity = planner.activities.find(item => item.id === block.activityId)!

    return {
      block,
      activity,
      category: categoryMap.value.get(activity.categoryId)!,
      now: nowHour.value !== null && nowHour.value >= block.start && nowHour.value < block.end
    }
  })
})

const templateNameToday = computed(() => templates.value[0]?.template.name ?? planner.activeTemplate?.name ?? '')

const formatHours = (hours: number) => hours.toLocaleString('en-US')

// Timeline below the list: the 24 hours of the day in order, or one proportional segment per activity (Week and Month).
// Each segment carries its hours through flex-grow; unplanned time is an empty segment (no colour)
interface TimelineSegment {
  key: string
  hours: number
  color: string
  title: string
}

const timeline = computed<TimelineSegment[]>(() => {
  if (!today.value || !breakdown.value) return []

  if (period.value === 'day') {
    return dayHours(planner.$state, today.value).map((activityId, hour) => {
      const name = activityId ? planner.activities.find(item => item.id === activityId)?.name ?? '' : ''

      return {
        key: `h${hour}`,
        hours: 1,
        color: activityId ? fill(getActivityColor(activityId)) : '',
        title: `${formatHour(hour)}, ${name || 'unplanned'}`
      }
    })
  }

  const segments: TimelineSegment[] = breakdown.value.activities.map(row => ({
    key: row.activity.id,
    hours: row.hours,
    color: fill(getActivityColor(row.activity.id)),
    title: `${row.activity.name}, ${formatHours(row.hours)} h, ${row.share}%`
  }))

  if (breakdown.value.unplannedHours > 0) {
    const unplannedShare = breakdown.value.activities.length
      ? 100 - breakdown.value.activities.reduce((sum, row) => sum + row.share, 0)
      : 100

    segments.push({
      key: 'unplanned',
      hours: breakdown.value.unplannedHours,
      color: '',
      title: `Unplanned, ${formatHours(breakdown.value.unplannedHours)} h, ${unplannedShare}%`
    })
  }

  return segments
})

const timelineLabel = computed(() => `Hours ${NOUN[period.value]} by activity`)

const onPeriodKey = (event: KeyboardEvent) => {
  const index = HOME_PERIODS.findIndex(option => option.id === period.value)
  const last = HOME_PERIODS.length - 1
  const next: Record<string, number> = {
    ArrowRight: (index + 1) % HOME_PERIODS.length,
    ArrowDown: (index + 1) % HOME_PERIODS.length,
    ArrowLeft: (index + last) % HOME_PERIODS.length,
    ArrowUp: (index + last) % HOME_PERIODS.length,
    Home: 0,
    End: last
  }
  const target = next[event.key]

  if (target === undefined) return

  event.preventDefault()
  period.value = HOME_PERIODS[target]!.id
  ;(event.currentTarget as HTMLElement).querySelectorAll('button')[target]?.focus()
}
</script>

<template>
  <div class="view">
    <header class="page-head">
      <h1 class="page-title">Home</h1>
      <p class="page-lede">Your plan for today, this week and this month. Read-only: Edit opens an item in the screen that owns it.</p>
      <p v-if="headerLine" class="page-meta">{{ headerLine }}</p>
      <p v-if="unassignedWeek" class="section-lede home-note">
        This week has no template of its own, so it uses {{ planner.activeTemplate?.name }}.
      </p>
    </header>

    <div class="home-toolbar">
      <div class="segmented" role="group" aria-label="Period" @keydown="onPeriodKey">
        <button
          v-for="option in HOME_PERIODS"
          :key="option.id"
          type="button"
          :data-active="period === option.id"
          :aria-pressed="period === option.id"
          @click="period = option.id"
        >{{ option.label }}</button>
      </div>
    </div>

    <template v-if="breakdown">
      <!-- Activities of the period: blocks for today, ranked list for the week and month (FR-HOME-4, 5, 8, 10) -->
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">{{ LIST_TITLE[period] }}</h2>
          <p class="section-lede">
            {{ period === 'day' ? `Blocks in time order, from ${templateNameToday}.` : 'Activities by hours, largest first.' }}
          </p>
        </div>

        <p v-if="!planner.activities.length" class="section-lede">
          No activities yet. <NuxtLink :to="link('planner')">Add activities in Planner</NuxtLink>.
        </p>

        <template v-else-if="period === 'day'">
          <ol v-if="dayRows.length" class="home-rows">
            <li
              v-for="(row, index) in dayRows"
              :key="index"
              class="home-row is-block"
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
              <NuxtLink
                class="btn btn-xs btn-outline"
                :to="link('planner', { item: row.activity.id, edit: true })"
                :aria-label="`Edit ${row.activity.name}`"
              >Edit</NuxtLink>
            </li>
          </ol>
          <p v-else class="home-empty section-lede">
            Nothing planned for today in {{ templateNameToday }}. <NuxtLink :to="link('planner')">Plan your time in Planner</NuxtLink>.
          </p>
        </template>

        <template v-else>
          <ul v-if="breakdown.activities.length" class="home-rows">
            <li v-for="row in breakdown.activities" :key="row.activity.id" class="home-row">
              <div class="home-row-main">
                <span class="home-row-name">
                  <span class="dot" :style="{ background: getActivityColor(row.activity.id) }" />
                  {{ row.activity.name }}
                </span>
                <NuxtLink class="home-row-cat" :to="link('goals', { item: row.category.id })">{{ row.category.name }}</NuxtLink>
              </div>
              <span class="home-row-hours">{{ formatHours(row.hours) }} h</span>
              <span class="home-row-share">{{ row.share }}%</span>
              <NuxtLink
                class="btn btn-xs btn-outline"
                :to="link('planner', { item: row.activity.id, edit: true })"
                :aria-label="`Edit ${row.activity.name}`"
              >Edit</NuxtLink>
            </li>
          </ul>
          <p v-else class="home-empty section-lede">
            Nothing planned {{ NOUN[period] }}. <NuxtLink :to="link('planner')">Plan your time in Planner</NuxtLink>.
          </p>
        </template>
      </section>

      <!-- Timeline directly below the list: coloured segments only, the text is in each segment's title and aria-label -->
      <div v-if="timeline.length" class="home-timeline" role="group" :aria-label="timelineLabel">
        <span
          v-for="segment in timeline"
          :key="segment.key"
          class="home-timeline-seg"
          :class="{ 'is-unplanned': !segment.color }"
          :style="{ flexGrow: segment.hours, background: segment.color || undefined }"
          role="img"
          :title="segment.title"
          :aria-label="segment.title"
        />
      </div>
    </template>

    <!-- Journal experiment (FR-HOME-11 to 13): last on the page, shows today whatever the period -->
    <HomeJournalCard />
  </div>
</template>
