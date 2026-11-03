<script setup lang="ts">
import Tokens from './styleguide/Tokens.vue'
import Controls from './styleguide/Controls.vue'
import Feedback from './styleguide/Feedback.vue'
import Data from './styleguide/Data.vue'
import { partOfDay } from '~/utils/motion'

/**
 * The living style guide (spec/design-system.md, Components): the real components and the real CSS, every state. Dev only:
 * the route /_styleguide exists when Nuxt runs in dev or the build has TIMELY_STYLEGUIDE=1 (nuxt.config.ts). Dark mode and
 * motion are the saved preferences (the Account menu's); the part of the day is for this page only, and Auto follows the clock.
 */
const { dark, toggle: toggleDark } = useTheme()
const { choice, setChoice } = useMotion()
type Part = 'auto' | 'morning' | 'afternoon' | 'evening'
const part = useState<Part>('styleguide-part', () => 'auto')
const PART_OPTIONS: { value: Part; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]
const MOTION_OPTIONS: { value: 'lively' | 'calm'; label: string }[] = [
  { value: 'lively', label: 'Lively' },
  { value: 'calm', label: 'Calm' },
]

/** Sets the part of the day on <html> for this page; Auto reads the clock like the head script does */
const setPart = (value: Part) => {
  part.value = value
  const now = new Date()
  document.documentElement.dataset.part = value === 'auto' ? partOfDay(now.getHours() * 60 + now.getMinutes()) : value
}
</script>

<template>
  <main class="view sg">
    <header class="page-head">
      <p class="eyebrow">Design system, 0.0.3</p>
      <h1 class="page-title">Style guide</h1>
      <p class="lede">Every component and token in use, in the real CSS. Switch the theme, the motion and the part of the day
        above; the numbers in Tokens follow them.</p>
    </header>

    <div class="sg-switches" aria-label="Preview settings">
      <UiSwitch :model-value="dark" @update:model-value="toggleDark">Dark mode</UiSwitch>
      <div class="sg-switch-group">
        <p class="field-label">Motion</p>
        <UiSegmented :model-value="choice" :options="MOTION_OPTIONS" label="Motion" @update:model-value="setChoice" />
      </div>
      <div class="sg-switch-group">
        <p class="field-label">Part of the day</p>
        <UiSegmented :model-value="part" :options="PART_OPTIONS" label="Part of the day" @update:model-value="setPart" />
      </div>
    </div>

    <nav class="sg-index" aria-label="Sections">
      <a href="#tokens">Tokens</a>
      <a href="#controls">Controls</a>
      <a href="#feedback">Feedback</a>
      <a href="#data">Data</a>
    </nav>

    <Tokens />
    <Controls />
    <Feedback />
    <Data />
  </main>
</template>
