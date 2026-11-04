<script setup lang="ts">
import type { Surface } from '~/utils/nav'

/**
 * One surface in the rail or the phone tab bar: a link to the surface, with aria-current on the surface shown (the link is not a
 * tab, so it has no tab role). The link is a custom NuxtLink so the current state can be set here.
 */
const props = defineProps<{ place: Surface, label: string, icon: 'today' | 'plan' | 'progress', current: boolean }>()
const { link } = useNav()
</script>

<template>
  <NuxtLink v-slot="{ href, navigate }" :to="link(props.place)" custom>
    <a :href="href ?? undefined" class="shell-nav-link" :aria-current="props.current ? 'page' : undefined" @click="navigate">
      <UiIcon :name="props.icon" />
      <span>{{ props.label }}</span>
    </a>
  </NuxtLink>
</template>
