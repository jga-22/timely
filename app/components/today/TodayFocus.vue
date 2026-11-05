<script setup lang="ts">
import { TODAY_FOCUS_TITLE, type Countdown, type TodayItem } from '~/utils/today'
import { tiltOf } from '~/utils/motion'

/**
 * The item to do next (FR-TODAY-2): a large tick, the time and life area above the title, a pill with the countdown to a block
 * (FR-TODAY-3), and the 1-year target it stands behind (FR-TODAY-4), with the share of the way there when its life area has a value
 * (FR-TODAY-4, 2.1: "8% of the way there."; null otherwise). The day line sits under it, in the default slot, and the
 * warm line after a tick (the cheer) under that.
 *
 * Lively and a mouse: the card tilts a little toward the pointer (utils/motion.ts `tiltOf`), and eases back when the pointer leaves.
 * It glides in when the focus moves on (today.css). Calm: no tilt, the card stays flat.
 */
defineProps<{ item: TodayItem; eyebrow: string; pill: Countdown | null; behind: string | null; progress: string | null; cheer: string }>()

const emit = defineEmits<{ toggle: [key: string] }>()

const { isLively } = useMotion()
const card = ref<HTMLElement | null>(null)
const tilt = ref<string | undefined>(undefined)

const onMove = (event: PointerEvent) => {
  if (event.pointerType !== 'mouse' || !isLively() || !card.value) return

  const { x, y } = tiltOf(event.clientX, event.clientY, card.value.getBoundingClientRect())
  tilt.value = `perspective(1100px) rotateX(${x}deg) rotateY(${y}deg)`
}

const onLeave = () => {
  tilt.value = undefined
}
</script>

<template>
  <section ref="card" class="card card-focal today-focus" aria-labelledby="today-focal-title" :style="{ transform: tilt }" @pointermove="onMove" @pointerleave="onLeave">
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
        <p v-if="behind" class="today-behind">{{ behind }} <span v-if="progress" class="today-progress">{{ progress }}</span></p>
      </div>
    </div>
    <slot />
    <p v-if="cheer" class="today-cheer">{{ cheer }}</p>
  </section>
</template>
