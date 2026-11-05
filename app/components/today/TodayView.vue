<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { useShownDay } from '~/composables/useShownDay'
import { useNowMinutes } from '~/composables/useNowMinutes'
import { habitDoneKey } from '~/utils/done'
import { dayRange, habitProgressText } from '~/utils/home'
import { weekTemplate } from '~/utils/planner/templates'
import { FALLBACK_EMPTY_COLOR } from '~/utils/palette'
import { ofTheWayText } from '~/utils/targetProgress'
import {
  LAST_ONE_TEXT,
  TODAY_FOCUS_TITLE,
  allItemsDone,
  behindLine,
  blockWord,
  cheerLine,
  countdownText,
  dayLineAxis,
  dayLineBlocks,
  donePill,
  doneCount,
  firstNameOf,
  focusItem,
  greeting,
  habitRows,
  nextHabitAction,
  nowPosition,
  timeSpan,
  todayItems,
  weekStrip,
  type Countdown
} from '~/utils/today'

/**
 * Today (FR-TODAY-1 to 9): the day's item in focus, the day's list, the week strip, the journal line and all habits.
 * The day shown is today until the user steps back (FR-HOME-18). This shell holds the store and the day, and picks one of three
 * states: the focus (an item still to do), done (all of the day ticked), or nothing planned. Its parts are in components/today/.
 * Everything date-dependent waits for mount (FR-DATE-6): the clock is read after mount, and the day is null until today is known.
 */
const planner = usePlannerStore()
const { categoryMap } = usePlannerMaps()
// Sleep is hidden unless 'Show sleep' is on (FR-SLEEP-4), set in Week and Year; its hours are left out of the items and the day line
const { showSleep } = useShowSleep()
const { link } = useNav()
const { state: auth } = useAuth()
const minute = useNowMinutes()
const { viewed, isToday, canPrevious, canNext, headerLine, goPrevious, goNext, goToday } = useShownDay()
// A day in a week with no schedule of its own: nothing is planned in it, and Week (the active schedule) does not fill it (2026-11-05)
const blankWeek = computed(() => !!viewed.value && !weekTemplate(planner.$state, viewed.value))
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

// The day's items (blocks, then daily habits), the one in focus, and the others. Only the real today follows the clock (FR-TODAY-2)
const clock = computed(() => (isToday.value ? minute.value : null))
const items = computed(() => (viewed.value ? todayItems(planner.$state, viewed.value, showSleep.value) : []))
const focus = computed(() => (viewed.value ? focusItem(planner.$state, viewed.value, showSleep.value, clock.value) : null))
// The word of the focus, for its eyebrow and its mark in the list: "On now", "Next" or "Ended" for a block, "Next" for a habit
const focusWord = computed(() => (focus.value?.kind === 'block' ? blockWord(focus.value, clock.value) : 'Next'))
const allDone = computed(() => !focus.value && allItemsDone(items.value))
const nothing = computed(() => !focus.value && !items.value.length)
const undone = computed(() => items.value.filter(item => !item.done).length)

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
    return [blockWord(item, clock.value), timeSpan(item.start!, item.end!), area].filter(Boolean).join(' · ')
  }

  return isToday.value ? 'Next · a habit for today' : 'Next · a habit for that day'
})

// The pill beside the focus: a block today counts down (or says it is done, when ticked); for a habit, the last one of the day, its
// progress or "any time"
const pill = computed<Countdown | null>(() => {
  const item = focus.value
  if (!item) return null

  if (item.kind === 'block') {
    if (clock.value === null) return null

    return item.done ? donePill(items.value, item, clock.value) : countdownText(item.start! * 60, item.end! * 60, clock.value)
  }

  if (isToday.value && undone.value === 1) return { state: 'last', text: LAST_ONE_TEXT }

  const habit = focusHabit.value
  if (!habit) return null

  return { state: 'later', text: habitProgressText(planner.$state, habit, viewed.value!) ?? (isToday.value ? 'Any time today' : 'Any time that day') }
})

const behind = computed(() => {
  const categoryId = focus.value?.categoryId
  return categoryId ? behindLine(categoryMap.value.get(categoryId)) : null
})

// The share of the way there for the focus's life area (2.1): only when that area has a value; no false 0% (Today, 2026-11-05)
const { progressOf } = useAreaProgress()
const progress = computed(() => {
  const categoryId = focus.value?.categoryId
  return categoryId ? ofTheWayText(progressOf(categoryId)) : null
})

// The day line over the awake range (sleep trimmed from the edges unless shown): a segment per block, in its life area's colour
const range = computed(() => (viewed.value ? dayRange(planner.$state, viewed.value, showSleep.value) : { start: 0, end: 24 }))
const dayLine = computed(() => ({
  blocks: dayLineBlocks(items.value, range.value).map(block => ({
    ...block,
    color: (block.categoryId ? categoryMap.value.get(block.categoryId)?.color : undefined) ?? FALLBACK_EMPTY_COLOR
  })),
  axis: dayLineAxis(range.value),
  count: doneCount(items.value, isToday.value),
  now: isToday.value ? nowPosition(minute.value, range.value) : null
}))

// Plan Run in Week: the habit furthest behind its count, shown only when nothing is planned today
const nextHabit = computed(() => (nothing.value && viewed.value ? nextHabitAction(planner.$state, viewed.value) : null))

// The week strip of the week of today, and the habits of the day
const strip = computed(() => (today.value ? weekStrip(planner.$state, today.value, showSleep.value) : null))
const habits = computed(() => (viewed.value ? habitRows(planner.$state, viewed.value, showSleep.value) : []))

// The warm line after a tick (the mockup's cheer): set by a tick on today, cleared when the day changes
const cheer = ref('')
watch(viewed, () => (cheer.value = ''))

// The tick of an item on the screen (the focus card or the list), by its key; a tick that is hidden (a closed list) does not count
const tickOf = (key: string): HTMLElement | undefined =>
  [...document.querySelectorAll<HTMLElement>('.today [data-tick]')].find(el => el.dataset.tick === key && el.getClientRects().length > 0)

// A tick keeps the keyboard where it was (FR-TODAY-9): the tick pressed stays focused, and does not scroll the page. Only when the
// tick is taken out of the page (its item moved into the focus card, or the day is done) does the keyboard go to the same item's
// tick wherever it now is, and to the heading of the card when there is none
const toggle = (key: string) => {
  if (!viewed.value) return

  const active = document.activeElement
  const pressed = active instanceof HTMLElement && active.closest('.today') ? active : null

  planner.toggleDone(viewed.value, key)
  cheer.value = isToday.value ? cheerLine(doneCount(items.value, true)) : ''

  if (!pressed) return

  nextTick(() => {
    const now = document.activeElement
    if (now && now !== document.body) return

    const target = pressed.isConnected ? pressed : (tickOf(key) ?? document.getElementById(TODAY_FOCUS_TITLE))
    target?.focus({ preventScroll: true })
  })
}

// The clock moves the focus by itself (FR-TODAY-2): the card is redrawn, and the keyboard goes back to the item it was on (its tick
// in the list, or the heading when the item was the card), never to the item that took its place. The item is the last one the
// keyboard was on in this screen; a click on nothing forgets it
let kept = ''
const onFocusIn = (event: FocusEvent) => {
  const el = event.target as HTMLElement
  kept = el.dataset.tick ?? (el.id === TODAY_FOCUS_TITLE ? TODAY_FOCUS_TITLE : '')
}
// A focus lost to nothing (a click on the page) forgets the item. A removal can also fire focusout, so the check waits and looks again:
// the element is then gone from the page, and the item is kept
const onFocusOut = (event: FocusEvent) => {
  const lost = event.target as HTMLElement
  window.setTimeout(() => {
    if (lost.isConnected && document.activeElement === document.body) kept = ''
  })
}

watch(
  () => focus.value?.key,
  () =>
    nextTick(() => {
      const now = document.activeElement
      if (!kept || (now && now !== document.body)) return

      const target = (kept !== TODAY_FOCUS_TITLE && tickOf(kept)) || document.getElementById(TODAY_FOCUS_TITLE)
      target?.focus({ preventScroll: true })
    })
)
</script>

<template>
  <div v-if="viewed" class="view today" @focusin="onFocusIn" @focusout="onFocusOut">
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
      :key="focus.key"
      :item="focus"
      :eyebrow="focusEyebrow"
      :pill="pill"
      :behind="behind"
      :progress="progress"
      :cheer="cheer"
      @toggle="toggle"
    >
      <TodayDayLine v-if="items.length" v-bind="dayLine" />
    </TodayFocus>

    <TodayDone v-else-if="allDone" :count="items.length" :is-today="isToday">
      <TodayDayLine v-bind="dayLine" />
    </TodayDone>

    <TodayNothing v-else :is-today="isToday" :habit="nextHabit" :has-ambition="!!ambition" :blank-week="blankWeek" />

    <!-- A blank week (no schedule of its own, 2026-11-05): the blocks of the day are none; the habits still show. Say so, and where to give the week one -->
    <p v-if="blankWeek" class="today-blank-note">This week has no schedule, so nothing is planned in it. <NuxtLink :to="link('year')">Give the week a schedule in Year</NuxtLink></p>

    <TodayItems
      v-if="items.length"
      title="Today's list"
      :items="items"
      :focus-key="focus?.key ?? null"
      :focus-word="focusWord"
      @toggle="toggle"
    />

    <TodayWeekStrip v-if="strip" :strip="strip" />

    <TodayJournal :day="viewed" :is-today="isToday" />

    <TodayHabits v-if="habits.length" :rows="habits" @toggle="toggle" />
  </div>
</template>
