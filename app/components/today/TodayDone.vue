<script setup lang="ts">
import { TODAY_FOCUS_TITLE } from '~/utils/today'

/**
 * The day is done (FR-HOME-19, FR-TODAY-5): the words, and on today a way to plan tomorrow. Rest counts, the rest of the week can
 * wait. The day line sits under it, in the default slot.
 */
const props = defineProps<{ count: number; isToday: boolean }>()

const { link } = useNav()
const things = computed(() => `${props.count} ${props.count === 1 ? 'thing' : 'things'}`)
</script>

<template>
  <section class="card card-focal today-focus is-done" aria-labelledby="today-focal-title">
    <div class="today-focus-main">
      <div class="today-focus-text">
        <p class="today-eyebrow-row"><span>{{ isToday ? 'Today' : 'That day' }}</span></p>
        <h1 :id="TODAY_FOCUS_TITLE" class="today-title" tabindex="-1">{{ isToday ? 'Today is done.' : 'That day is done.' }}</h1>
        <p class="today-line">{{ things }} ticked. Rest counts. The rest of the week can wait.</p>
        <div v-if="isToday" class="today-actions">
          <NuxtLink class="btn today-quiet" :to="link('week')">Plan tomorrow</NuxtLink>
        </div>
      </div>
    </div>
    <slot />
  </section>
</template>
