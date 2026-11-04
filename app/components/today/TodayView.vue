<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { usePlannerFill } from '~/composables/usePlannerFill'
import { useShownDay } from '~/composables/useShownDay'
import { useNowMinutes } from '~/composables/useNowMinutes'
import { habitDoneKey } from '~/utils/done'
import { dayHours, dayRange, habitProgressText, timelineSegments } from '~/utils/home'
import { formatHour } from '~/utils/planner/format'
import {
  TODAY_FOCUS_TICK,
  TODAY_FOCUS_TITLE,
  allItemsDone,
  behindLine,
  countdownText,
  doneLine,
  firstNameOf,
  focusItem,
  greeting,
  habitRows,
  nextHabitAction,
  nowPosition,
  todayItems,
  weekStrip,
  type Countdown
} from '~/utils/today'

/**
 * Today (FR-TODAY-1 to 9): the day's next item in focus, the rest of the day, the week strip, the journal line and all habits.
 * The day shown is today until the user steps back (FR-HOME-18). This shell holds the store and the day, and picks one of three
 * states: the focus (an item still to do), done (all of the day ticked), or nothing planned. Its parts are in components/today/.
 * Everything date-dependent waits for mount (FR-DATE-6): the clock is read after mount, and the day is null until today is known.
 */
const planner = usePlannerStore()
const { categoryMap, getActivityColor } = usePlannerMaps()
const { fill } = usePlannerFill()
// Sleep is hidden unless 'Show sleep' is on (FR-SLEEP-4), set in Week and Year; its hours are left out of the items and the day line
const { showSleep } = useShowSleep()
const { link } = useNav()
const { state: auth } = useAuth()
const minute = useNowMinutes()
const { viewed, isToday, canPrevious, canNext, headerLine, goPrevious, goNext, goToday } = useShownDay()
const { today } = usePlannerYear()

// The sign-in name's first word, in Supabase mode only (there is no name in the local mode)
const firstName = computed(() => firstNameOf(auth.value.user?.name ?? ''))
const eyebrow = computed(() => (headerLine.value ? `${isToday.value ? 'Today' : 'A past day'} · ${headerLine.value}` : ''))
const greetLine = computed(() => {
  if (!viewed.value) return ''
  if (!isToday.value) return 'Looking back at this day.'

  return minute.value === null ? '' : greeting(minute.value, firstName.value)
})

const ambition = computed(() => planner.ambition?.statement.trim() ?? '')

// The day's items (blocks, then daily habits), the one to do next, and the others
const items = computed(() => (viewed.value ? todayItems(planner.$state, viewed.value, showSleep.value) : []))
const focus = computed(() => (viewed.value ? focusItem(planner.$state, viewed.value, showSleep.value) : null))
const rest = computed(() => items.value.filter(item => item.key !== focus.value?.key))
const allDone = computed(() => !focus.value && allItemsDone(items.value))
const nothing = computed(() => !focus.value && !items.value.length)

// The habit behind a habit focus, for its progress pill
const focusHabit = computed(() => {
  if (focus.value?.kind !== 'habit') return null

  return planner.habits.find(habit => habitDoneKey(habit.id) === focus.value?.key) ?? null
})

const focusEyebrow = computed(() => {
  const item = focus.value
  if (!item) return ''

  if (item.kind === 'block') {
    const area = item.categoryId ? categoryMap.value.get(item.categoryId)?.name : ''
    return ['Next', `${formatHour(item.start!)}–${formatHour(item.end!)}`, area].filter(Boolean).join(' · ')
  }

  return isToday.value ? 'Next · a habit for today' : 'Next · a habit for that day'
})

// The pill beside the focus: a live countdown to a block today; for a habit, its progress or "any time"
const pill = computed<Countdown | null>(() => {
  const item = focus.value
  if (!item) return null

  if (item.kind === 'block') {
    return isToday.value && minute.value !== null ? countdownText(item.start! * 60, item.end! * 60, minute.value) : null
  }

  const habit = focusHabit.value
  if (!habit) return null

  return { state: 'later', text: habitProgressText(planner.$state, habit, viewed.value!) ?? (isToday.value ? 'Any time today' : 'Any time that day') }
})

const behind = computed(() => {
  const categoryId = focus.value?.categoryId
  return categoryId ? behindLine(categoryMap.value.get(categoryId)) : null
})

// The day line: one segment per hour over the awake range (sleep trimmed from the edges unless shown), coloured by its activity
const range = computed(() => (viewed.value ? dayRange(planner.$state, viewed.value, showSleep.value) : { start: 0, end: 24 }))
const segments = computed(() =>
  viewed.value
    ? timelineSegments(
        dayHours(planner.$state, viewed.value, showSleep.value),
        range.value,
        activityId => planner.activities.find(item => item.id === activityId)?.name ?? '',
        activityId => fill(getActivityColor(activityId))
      )
    : []
)
const dayLine = computed(() => ({
  segments: segments.value,
  range: range.value,
  caption: doneLine(items.value, isToday.value),
  now: isToday.value ? nowPosition(minute.value, range.value) : null,
  planned: items.value.some(item => item.kind === 'block')
}))

// Plan Run in Week: the habit furthest behind its count, shown only when nothing is planned today
const nextHabit = computed(() => (nothing.value && viewed.value ? nextHabitAction(planner.$state, viewed.value) : null))

// The week strip of the week of today, and the habits of the day
const strip = computed(() => (today.value ? weekStrip(planner.$state, today.value, showSleep.value) : null))
const habits = computed(() => (viewed.value ? habitRows(planner.$state, viewed.value, showSleep.value) : []))

const toggle = (key: string) => {
  if (!viewed.value) return

  // A tick can leave the page (the focus is replaced, or the row moves into the focus card): when the keyboard was in Today and
  // nothing has the focus after the tick, it goes to the next focus, or to the heading when the day is done
  const inToday = !!document.activeElement?.closest('.today')

  planner.toggleDone(viewed.value, key)

  if (!inToday) return

  nextTick(() => {
    const active = document.activeElement
    if (active && active !== document.body) return

    ;(document.getElementById(TODAY_FOCUS_TICK) ?? document.getElementById(TODAY_FOCUS_TITLE))?.focus()
  })
}
</script>

<template>
  <div v-if="viewed" class="view today">
    <TodayHeader
      :eyebrow="eyebrow"
      :is-today="isToday"
      :can-previous="canPrevious"
      :can-next="canNext"
      @previous="goPrevious"
      @today="goToday"
      @next="goNext"
    />

    <p v-if="greetLine" class="today-greet">{{ greetLine }}</p>
    <p class="today-dream">
      <template v-if="ambition">For: <span>{{ ambition }}</span></template>
      <template v-else>Your ambition is not written yet. <NuxtLink :to="link('dreams')">Write it in Dreams</NuxtLink></template>
    </p>

    <TodayFocus
      v-if="focus"
      :item="focus"
      :eyebrow="focusEyebrow"
      :pill="pill"
      :behind="behind"
      @toggle="toggle"
    >
      <TodayDayLine v-if="items.length" v-bind="dayLine" />
    </TodayFocus>

    <TodayDone v-else-if="allDone" :count="items.length" :is-today="isToday">
      <TodayDayLine v-bind="dayLine" />
    </TodayDone>

    <TodayNothing v-else :is-today="isToday" :habit="nextHabit" />

    <TodayItems v-if="rest.length" :title="focus ? 'Also today' : 'Ticked today'" :items="rest" @toggle="toggle" />

    <TodayWeekStrip v-if="strip" :strip="strip" />

    <TodayJournal />

    <TodayHabits v-if="habits.length" :rows="habits" @toggle="toggle" />
  </div>
</template>
