<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { addDays } from '~/utils/dates'
import { blockDoneKey, habitDoneKey, isDone } from '~/utils/done'
import {
  dayAllowed, dayBlocks, dayHabits, dayHeaderLine, dayHours, dayRange, dayTitle, formatDayLabel, habitProgressText, habitTicked, isNowBlock,
  timelineSegments, type HomeDayRow, type HomeHabitRow, type HourRange, type TimelineSegment
} from '~/utils/home'

/**
 * Home (FR-HOME-1): the day's blocks and habits, each ticked as done with one tap (FR-HOME-14 to 17). The day shown is today
 * until the user steps back (previous, next, Today); it is session state and never a future day (FR-HOME-18).
 * Everything date-dependent waits for mount (FR-DATE-6), so the first server and client passes agree.
 * The parts are HomeTimeline, HomeActivities (the blocks and the day's progress) and HomeHabits; this shell holds the day and the store.
 */
const planner = usePlannerStore()
const { today } = usePlannerYear()
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
  if (!dayAllowed(key, today.value, earliest.value)) return

  chosenDay.value = key === today.value ? null : key
}
const goPrevious = () => viewed.value && selectDay(addDays(viewed.value, -1))
const goNext = () => viewed.value && selectDay(addDays(viewed.value, 1))
const goToday = () => selectDay(today.value ?? '')

// Date-dependent output is null until mounted, so the first server and client passes agree (FR-DATE-6)
const title = computed(() => dayTitle(viewed.value, isToday.value))
const headerLine = computed(() => dayHeaderLine(viewed.value, isToday.value))

// The viewed day's blocks in time order, each with its activity, category and done state (FR-HOME-4, 14)
const dayRows = computed<HomeDayRow[]>(() => {
  if (!viewed.value) return []

  return dayBlocks(planner.$state, viewed.value, showSleep.value).map(block => {
    const activity = planner.activities.find(item => item.id === block.activityId)!
    const key = blockDoneKey(block.activityId, block.start)

    return {
      key,
      block,
      activity,
      color: getActivityColor(activity.id),
      category: categoryMap.value.get(activity.categoryId),
      done: isDone(planner.$state, viewed.value!, key),
      now: isNowBlock(block, nowHour.value, isToday.value)
    }
  })
})

// Habits with no day assigned in the week (FR-HOME-15), with their period progress (FR-HOME-16)
const habitRows = computed<HomeHabitRow[]>(() => {
  if (!viewed.value) return []

  return dayHabits(planner.$state, viewed.value, showSleep.value).map(habit => ({
    key: habitDoneKey(habit.id),
    habit,
    name: habit.name,
    category: categoryMap.value.get(habit.categoryId),
    progress: habitProgressText(planner.$state, habit, viewed.value!),
    done: habitTicked(planner.$state, habit, viewed.value!)
  }))
})

const toggle = (key: string) => {
  if (viewed.value) planner.toggleDone(viewed.value, key)
}

// The hours the bar spans: all 24, or without the sleep at the day's edges while sleep is hidden (FR-SLEEP-4, 5)
const range = computed<HourRange>(() => (viewed.value ? dayRange(planner.$state, viewed.value, showSleep.value) : { start: 0, end: 24 }))

// Timeline: the hours of the day in order, one flex segment per hour (FR-HOME-4). Unplanned hours have no colour
const timeline = computed<TimelineSegment[]>(() =>
  viewed.value
    ? timelineSegments(
        dayHours(planner.$state, viewed.value, showSleep.value),
        range.value,
        activityId => planner.activities.find(item => item.id === activityId)?.name ?? '',
        activityId => fill(getActivityColor(activityId))
      )
    : []
)

// The day's label for the "All done for ..." line (FR-HOME-19)
const completeFor = computed(() => (isToday.value ? 'today' : formatDayLabel(viewed.value ?? '')))
</script>

<template>
  <div class="view">
    <header class="page-head home-head">
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="headerLine" class="page-meta">{{ headerLine }}</p>
      </div>
      <div v-if="today" class="home-day-nav">
        <button type="button" class="btn btn-sm btn-outline" aria-label="Previous day" :disabled="!canPrevious" @click="goPrevious">‹</button>
        <button v-if="!isToday" type="button" class="btn btn-sm btn-outline" @click="goToday">Today</button>
        <button type="button" class="btn btn-sm btn-outline" aria-label="Next day" :disabled="!canNext" @click="goNext">›</button>
      </div>
    </header>

    <template v-if="viewed">
      <HomeTimeline :show-sleep="showSleep" :segments="timeline" :range="range" />
      <HomeActivities :rows="dayRows" :has-activities="!!planner.activities.length" :is-today="isToday" :complete-for="completeFor" @toggle="toggle" />
      <HomeHabits :rows="habitRows" @toggle="toggle" />
    </template>

    <HomeJournalCard />
  </div>
</template>
