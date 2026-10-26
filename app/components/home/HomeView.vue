<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { isoWeekOf, mondayOf } from '~/utils/dates'
import { countLabel, formatHour } from '~/utils/planner'
import {
  HOME_PERIODS,
  belowTargetCategories,
  dayBlocks,
  formatDayLabel,
  formatMonthLabel,
  formatWeekRange,
  isWeekAssigned,
  periodBreakdown,
  periodTemplates,
  type HomePeriod
} from '~/utils/home'

// Read-only (FR-HOME-1). The period selector is the only control; every item has an Edit link to its owner.
const planner = usePlannerStore()
const { today } = usePlannerYear()
const { link } = useNav()
const { categoryMap, getActivityColor } = usePlannerMaps()

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
const SPAN: Record<HomePeriod, string> = { day: 'the day', week: 'the week', month: 'the month' }
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

// Time per category: one stacked bar and a legend, Unplanned as the last segment (FR-HOME-6)
const soft = (color: string) => `color-mix(in srgb, ${color} 80%, var(--bg))`

const barSegments = computed(() => {
  if (!breakdown.value) return []

  const segments = breakdown.value.categories.map(row => ({
    key: row.category.id,
    label: row.category.name,
    color: soft(row.category.color ?? '#d6d3d1'),
    categoryId: row.category.id,
    hours: row.hours,
    share: row.share
  }))

  if (breakdown.value.unplannedHours > 0) {
    segments.push({
      key: 'unplanned',
      label: 'Unplanned',
      color: '',
      categoryId: '',
      hours: breakdown.value.unplannedHours,
      share: breakdown.value.unplannedShare
    })
  }

  return segments
})

const barLabel = computed(() =>
  barSegments.value.length
    ? `Time per category ${NOUN[period.value]}: ${barSegments.value.map(segment => `${segment.label} ${segment.hours} hours, ${segment.share}%`).join('; ')}.`
    : ''
)

const belowTarget = computed(() => belowTargetCategories(planner.$state))

const formatHours = (hours: number) => hours.toLocaleString('en-US')

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
      <!-- Totals (FR-HOME-7) -->
      <section class="section">
        <div class="metrics">
          <div class="metric">
            <div class="metric-value">{{ formatHours(breakdown.plannedHours) }}<span class="unit">h</span></div>
            <div class="metric-label">Planned {{ NOUN[period] }}</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{ formatHours(breakdown.unplannedHours) }}<span class="unit">h</span></div>
            <div class="metric-label">Unplanned {{ NOUN[period] }}</div>
          </div>
          <div class="metric">
            <div class="metric-value">{{ formatHours(breakdown.periodHours) }}<span class="unit">h</span></div>
            <div class="metric-label">Hours in {{ SPAN[period] }}</div>
          </div>
        </div>
      </section>

      <!-- Time per category (FR-HOME-6) -->
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">Time per category</h2>
          <p class="section-lede">Planned hours {{ NOUN[period] }} by category. Unplanned time is the last segment.</p>
        </div>

        <div class="home-bar" role="img" :aria-label="barLabel">
          <span
            v-for="segment in barSegments"
            :key="segment.key"
            class="home-bar-seg"
            :style="{
              width: `${(segment.hours / breakdown.periodHours) * 100}%`,
              background: segment.color || 'var(--bg-3)'
            }"
          />
        </div>

        <ul class="home-legend">
          <li v-for="segment in barSegments" :key="segment.key" class="total-row">
            <span
              class="dot"
              :style="{ background: segment.color || 'var(--bg-3)' }"
            />
            <NuxtLink
              v-if="segment.categoryId"
              class="name"
              :to="link('goals', { item: segment.categoryId })"
            >{{ segment.label }}</NuxtLink>
            <span v-else class="name">{{ segment.label }}</span>
            <span class="hrs">{{ formatHours(segment.hours) }} h</span>
            <span class="pct">{{ segment.share }}%</span>
          </li>
        </ul>
      </section>

      <!-- Activities: blocks for today, ranked list for the week and month (FR-HOME-4, 5, 8, 10) -->
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

        <!-- Goals signal (FR-HOME-9): one line, hidden when no category is below its habit target -->
        <p v-if="belowTarget.length" class="home-signal">
          {{ countLabel(belowTarget.length, 'category', 'categories') }}
          {{ belowTarget.length === 1 ? 'is' : 'are' }} below their habit target:
          <template v-for="(category, index) in belowTarget" :key="category.id">
            <NuxtLink :to="link('goals', { item: category.id })">{{ category.name }}</NuxtLink>{{ index < belowTarget.length - 1 ? ', ' : '.' }}
          </template>
        </p>
      </section>
    </template>
  </div>
</template>
