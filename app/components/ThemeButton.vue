<script setup lang="ts">
/**
 * The theme button: the one dark mode control (a moon or sun icon, aria-pressed on Dark mode). The top bar and the first-run
 * page both render it, so the choice reads and writes the same preference (useTheme, `timely.dark`) wherever it shows.
 */
const { dark, toggle } = useTheme()
</script>

<template>
  <button
    type="button"
    class="btn btn-icon"
    aria-label="Dark mode"
    :aria-pressed="dark"
    @click="toggle"
  >
    <UiIcon :name="dark ? 'sun' : 'moon'" />
  </button>
</template>
