<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { addDays, isoWeekOf } from '~/utils/dates'
import { blockDoneKey, habitDoneKey, isDone } from '~/utils/done'
import { formatHour } from '~/utils/planner'
import { dayBlocks, dayHabits, dayHours, dayRange, formatDayLabel, habitProgressText, habitTicked } from '~/utils/home'

/**
 * Home (FR-HOME-1): the day's blocks and habits, each ticked as done with one tap (FR-HOME-14 to 17). The day shown is today
 * until the user steps back (previous, next, Today); it is session state and never a future day (FR-HOME-18).
 * Everything date-dependent waits for mount (FR-DATE-6), so the first server and client passes agree.
 */
const planner = usePlannerStore()
const { today } = usePlannerYear()
const { link } = useNav()
const { categoryMap, getActivityColor } = usePlannerMaps()
const { fill } = usePlannerFill()
// Sleep is hidden unless 'Show sleep' is on (FR-SLEEP-4): its hours then count as unplanned, and its rows are left out
const { showSleep } = useShowSleep()

// The day shown: null follows today; a date is set only when the user steps to another day (session state)
const chosenDay = useState<string | null>('home-day', () => null)
// How far back the day switch goes (FR-HOME-18)
const BACK_DAYS = 60

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

// The viewed day: null until mounted, like today
const viewed = computed(() => chosenDay.value ?? today.value)
const isToday = computed(() => !!today.value && viewed.value === today.value)
const earliest = computed(() => (today.value ? addDays(today.value, -BACK_DAYS) : null))
const canPrevious = computed(() => !!viewed.value && !!earliest.value && viewed.value > earliest.value)
const canNext = computed(() => !!viewed.value && !isToday.value)

// Moves the viewed day; a future day is refused, and today is stored as "follow today" (null)
const selectDay = (key: string) => {
  if (!today.value || key > today.value || (earliest.value && key < earliest.value)) return

  chosenDay.value = key === today.value ? null : key
}
const goPrevious = () => viewed.value && selectDay(addDays(viewed.value, -1))
const goNext = () => viewed.value && selectDay(addDays(viewed.value, 1))
const goToday = () => selectDay(today.value ?? '')

// Date-dependent output is null until mounted, so the first server and client passes agree (FR-DATE-6)
const weekNumber = computed(() => (viewed.value ? isoWeekOf(viewed.value).week : null))
// Title: "Today" or the day label; the line under it gives the date (when today) and the ISO week
const dayTitle = computed(() => (viewed.value ? (isToday.value ? 'Today' : formatDayLabel(viewed.value)) : 'Today'))
const headerLine = computed(() => {
  if (!viewed.value || weekNumber.value === null) return null

  return [isToday.value ? formatDayLabel(viewed.value) : null, `Week ${weekNumber.value}`].filter(Boolean).join(' · ')
})

// The viewed day's blocks in time order, each with its activity, category and done state (FR-HOME-4, 14)
const dayRows = computed(() => {
  if (!viewed.value) return []

  return dayBlocks(planner.$state, viewed.value, showSleep.value).map(block => {
    const activity = planner.activities.find(item => item.id === block.activityId)!
    const key = blockDoneKey(block.activityId, block.start)

    return {
      key,
      block,
      activity,
      category: categoryMap.value.get(activity.categoryId),
      done: isDone(planner.$state, viewed.value!, key),
      now: isToday.value && nowHour.value !== null && nowHour.value >= block.start && nowHour.value < block.end
    }
  })
})

// Habits not already a block of the day (FR-HOME-15), with their period progress (FR-HOME-16)
const habitRows = computed(() => {
  if (!viewed.value) return []

  return dayHabits(planner.$state, viewed.value, showSleep.value).map(habit => ({
    key: habitDoneKey(habit.id),
    habit,
    name: habit.name,
    category: categoryMap.value.get(habit.categoryId),
    progress: habitProgressText(planner.$state, habit, viewed.value!),
    done: habitTicked(planner.$state, habit, viewed.value!),
    daily: habit.frequency.period === 'day'
  }))
})

// Progress line (FR-HOME-17): the blocks and the daily habits of the day
const total = computed(() => dayRows.value.length + habitRows.value.filter(row => row.daily).length)
const doneCount = computed(() => dayRows.value.filter(row => row.done).length + habitRows.value.filter(row => row.daily && row.done).length)
const allDone = computed(() => total.value > 0 && doneCount.value === total.value)
const completeFor = computed(() => (isToday.value ? 'today' : formatDayLabel(viewed.value ?? '')))

const toggle = (key: string) => {
  if (viewed.value) planner.toggleDone(viewed.value, key)
}

// The hours the bar spans: all 24, or without the sleep at the day's edges while sleep is hidden (FR-SLEEP-4, 5)
const range = computed(() => (viewed.value ? dayRange(planner.$state, viewed.value, showSleep.value) : { start: 0, end: 24 }))

// Timeline: the hours of the day in order, one flex segment per hour (FR-HOME-4). Unplanned hours have no colour
interface TimelineSegment {
  key: string
  color: string
  title: string
}

const timeline = computed<TimelineSegment[]>(() => {
  if (!viewed.value) return []

  return dayHours(planner.$state, viewed.value, showSleep.value).slice(range.value.start, range.value.end).map((activityId, index) => {
    const hour = range.value.start + index
    const name = activityId ? planner.activities.find(item => item.id === activityId)?.name ?? '' : ''

    return {
      key: `h${hour}`,
      color: activityId ? fill(getActivityColor(activityId)) : '',
      title: `${formatHour(hour)}, ${name || 'unplanned'}`
    }
  })
})

// Hour labels on the timeline axis, positioned on the span the bar shows. The range's own ends are labelled when they are trimmed
const AXIS_HOURS = [9, 12, 18, 22]
const axisTicks = computed(() => AXIS_HOURS.filter(hour => hour > range.value.start && hour < range.value.end))
const axisLeft = (hour: number) => `${((hour - range.value.start) / (range.value.end - range.value.start)) * 100}%`
</script>

<template>
  <div class="view">
    <header class="page-head home-head">
      <div>
        <h1 class="page-title">{{ dayTitle }}</h1>
        <p v-if="headerLine" class="page-meta">{{ headerLine }}</p>
      </div>
      <div v-if="today" class="home-day-nav">
        <button type="button" class="btn btn-sm btn-outline" aria-label="Previous day" :disabled="!canPrevious" @click="goPrevious">‹</button>
        <button v-if="!isToday" type="button" class="btn btn-sm btn-outline" @click="goToday">Today</button>
        <button type="button" class="btn btn-sm btn-outline" aria-label="Next day" :disabled="!canNext" @click="goNext">›</button>
      </div>
    </header>

    <template v-if="viewed">
      <!-- Timeline directly below the title: coloured hours only; the text is in each segment's title and aria-label -->
      <div class="home-sleep-line">
        <p v-if="!showSleep" class="page-meta">Sleep is hidden: its hours are left off the bar, and a nap counts as unplanned.</p>
        <SleepToggle />
      </div>

      <div class="home-timeline" role="group" aria-label="Hours by activity">
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
            v-for="hour in axisTicks"
            :key="hour"
            class="home-axis-tick"
            :style="{ left: axisLeft(hour) }"
          >{{ hour }}h</span>
          <span v-if="range.start > 0" class="home-axis-tick is-start" :style="{ left: '0%' }">{{ range.start }}h</span>
          <span v-if="range.end < 24" class="home-axis-tick is-end" :style="{ left: '100%' }">{{ range.end }}h</span>
        </div>
      </div>

      <!-- Progress of the day's blocks and daily habits (FR-HOME-17): a quiet line, no streak -->
      <p v-if="total" class="home-progress" :class="{ 'is-complete': allDone }" aria-live="polite">
        <svg v-if="allDone" class="home-progress-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
        <span v-if="allDone">All done for {{ completeFor }}</span>
        <span v-else>{{ doneCount }} of {{ total }} done</span>
      </p>

      <!-- The day's activities in time order (FR-HOME-4); each row ticks as done (FR-HOME-14) -->
      <p v-if="!planner.activities.length" class="home-empty">
        No activities yet. <NuxtLink :to="link('planner')">Add activities in Planner</NuxtLink>.
      </p>

      <template v-else>
        <ol v-if="dayRows.length" class="home-rows" aria-label="Activities">
          <li
            v-for="row in dayRows"
            :key="row.key"
            class="home-row"
            :class="{ 'is-now': row.now, 'is-done': row.done }"
          >
            <span class="home-row-time">{{ formatHour(row.block.start) }}–{{ formatHour(row.block.end) }}</span>
            <div class="home-row-main">
              <span class="home-row-name">
                <span class="dot" :style="{ background: getActivityColor(row.activity.id) }" />
                {{ row.activity.name }}
                <span v-if="row.now" class="home-now">Now</span>
              </span>
              <NuxtLink v-if="row.category" class="home-row-cat" :to="link('goals', { item: row.category.id })">{{ row.category.name }}</NuxtLink>
            </div>
            <span class="home-row-hours">{{ row.block.end - row.block.start }} h</span>
            <button
              type="button"
              class="home-check"
              role="checkbox"
              :aria-checked="row.done ? 'true' : 'false'"
              :aria-label="`Mark ${row.activity.name} done`"
              @click="toggle(row.key)"
            >
              <span class="home-check-box" aria-hidden="true">
                <svg v-if="row.done" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
              </span>
            </button>
          </li>
        </ol>
        <p v-else class="home-empty">
          {{ isToday ? 'Nothing planned today.' : 'Nothing planned on this day.' }} <NuxtLink :to="link('planner')">Plan your time in Planner</NuxtLink>.
        </p>
      </template>

      <!-- Habits not already a block of the day (FR-HOME-15): ticked for the day, progress for weekly and monthly habits -->
      <section v-if="habitRows.length" class="home-habits" aria-labelledby="home-habits-title">
        <h2 id="home-habits-title" class="section-title">Habits</h2>
        <ol class="home-rows" aria-label="Habits">
          <li
            v-for="row in habitRows"
            :key="row.key"
            class="home-row is-habit"
            :class="{ 'is-done': row.done }"
          >
            <div class="home-row-main">
              <span class="home-row-name">{{ row.name }}</span>
              <span class="home-row-meta">
                <NuxtLink v-if="row.category" class="home-row-cat" :to="link('goals', { item: row.category.id })">{{ row.category.name }}</NuxtLink>
                <span v-if="row.progress" class="home-row-progress">{{ row.progress }}</span>
              </span>
            </div>
            <button
              type="button"
              class="home-check"
              role="checkbox"
              :aria-checked="row.done ? 'true' : 'false'"
              :aria-label="`Mark ${row.name} done`"
              @click="toggle(row.key)"
            >
              <span class="home-check-box" aria-hidden="true">
                <svg v-if="row.done" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
              </span>
            </button>
          </li>
        </ol>
      </section>
    </template>

    <HomeJournalCard />
  </div>
</template>
