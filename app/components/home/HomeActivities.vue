<script setup lang="ts">
import { formatHour } from '~/utils/planner/format'
import { donePercent, isAllDone, progressText, type HomeDayRow } from '~/utils/home'

/**
 * The day's activities in time order (FR-HOME-4), each ticked as done (FR-HOME-14), and the day's progress (FR-HOME-17, 19): a ring
 * filled by the share done, which turns into a green check when all is done. Only this day's blocks count; habits have their own count.
 */
const props = defineProps<{
  rows: HomeDayRow[]
  hasActivities: boolean
  isToday: boolean
  completeFor: string
}>()

const emit = defineEmits<{ toggle: [key: string] }>()

const { link } = useNav()
const total = computed(() => props.rows.length)
const done = computed(() => props.rows.filter(row => row.done).length)
const allDone = computed(() => isAllDone(done.value, total.value))
const percent = computed(() => donePercent(done.value, total.value))
const progress = computed(() => progressText(done.value, total.value, props.completeFor))
</script>

<template>
  <!-- Progress of the day's blocks (FR-HOME-17, 19): a ring filled by the share done; all done turns it into a green check.
       Only this day, and hidden when nothing is planned. Right-aligned: the text, then the ring or the check -->
  <div v-if="total" class="home-progress" :class="{ 'is-complete': allDone }" role="status">
    <span>{{ progress }}</span>
    <span v-if="allDone" class="home-progress-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-6.5" /></svg></span>
    <AdherenceRing v-else :percent="percent" :size="28" :show-value="false" />
  </div>

  <!-- The day's activities in time order (FR-HOME-4); each row ticks as done (FR-HOME-14) -->
  <p v-if="!hasActivities" class="home-empty">
    No activities yet. <NuxtLink :to="link('planner')">Add activities in Week</NuxtLink>.
  </p>

  <template v-else>
    <ol v-if="rows.length" class="home-rows" aria-label="Activities">
      <li
        v-for="row in rows"
        :key="row.key"
        class="home-row"
        :class="{ 'is-now': row.now, 'is-done': row.done }"
      >
        <span class="home-row-time">{{ formatHour(row.block.start) }}–{{ formatHour(row.block.end) }}</span>
        <div class="home-row-main">
          <span class="home-row-name">
            <span class="dot" :style="{ background: row.color }" />
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
          @click="emit('toggle', row.key)"
        >
          <span class="home-check-box" aria-hidden="true">
            <svg v-if="row.done" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
          </span>
        </button>
      </li>
    </ol>
    <p v-else class="home-empty">
      {{ isToday ? 'Nothing planned today.' : 'Nothing planned on this day.' }} <NuxtLink :to="link('planner')">Plan your time in Week</NuxtLink>.
    </p>
  </template>
</template>
