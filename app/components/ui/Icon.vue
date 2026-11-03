<script setup lang="ts">
import { ICONS, type IconName } from '~/utils/icons'

/**
 * A glyph from the icon set (utils/icons.ts). Decorative: always aria-hidden. The name of an icon button is its
 * aria-label, never the glyph. `sm` is 16px for dense controls, `md` is 20px.
 */
const props = withDefaults(defineProps<{ name: IconName; size?: 'sm' | 'md' }>(), { size: 'md' })
</script>

<template>
  <svg class="ic" :class="{ 'ic-sm': props.size === 'sm' }" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path v-for="(d, i) in ICONS[props.name]" :key="i" :d="d" />
  </svg>
</template>
