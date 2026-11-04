<script setup lang="ts">
import { TODAY_FOCUS_TITLE, type Countdown, type TodayItem } from '~/utils/today'

/**
 * The item to do next (FR-TODAY-2): a large tick, the time and life area above the title, a pill with the countdown to a block
 * (FR-TODAY-3), and the 1-year target it stands behind (FR-TODAY-4). The day line sits under it, in the default slot, and the
 * warm line after a tick (the cheer) under that.
 */
defineProps<{ item: TodayItem; eyebrow: string; pill: Countdown | null; behind: string | null; cheer: string }>()

const emit = defineEmits<{ toggle: [key: string] }>()
</script>

<template>
  <section class="card card-focal today-focus" aria-labelledby="today-focal-title">
    <div class="today-focus-main">
      <UiTick
        :data-tick="item.key"
        :model-value="item.done"
        size="lg"
        :label="`Mark ${item.title} done`"
        @update:model-value="emit('toggle', item.key)"
      />
      <div class="today-focus-text">
        <p class="today-eyebrow-row">
          <span>{{ eyebrow }}</span>
          <span v-if="pill" class="today-pill" :data-state="pill.state">
            <i v-if="pill.state === 'now'" class="today-live-dot" aria-hidden="true" />
            {{ pill.text }}
          </span>
        </p>
        <h1 :id="TODAY_FOCUS_TITLE" class="today-title" tabindex="-1">{{ item.title }}</h1>
        <p v-if="behind" class="today-behind">{{ behind }}</p>
      </div>
    </div>
    <slot />
    <p v-if="cheer" class="today-cheer">{{ cheer }}</p>
  </section>
</template>
