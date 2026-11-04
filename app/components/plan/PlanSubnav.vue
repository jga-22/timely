<script setup lang="ts">
import type { PlanView } from '~/utils/nav'

/**
 * The Plan sub-nav: Dreams, Week and Year as links (the A2 segmented row). The current one has aria-current="page". A link
 * names the view only, so switching view drops the selection, as the separate tabs did.
 */
defineProps<{ view: PlanView }>()
const { link } = useNav()

const ITEMS: { place: PlanView, label: string }[] = [
  { place: 'dreams', label: 'Dreams' },
  { place: 'week', label: 'Week' },
  { place: 'year', label: 'Year' },
]
</script>

<template>
  <nav class="plan-subnav" aria-label="Plan sections">
    <NuxtLink v-for="item in ITEMS" :key="item.place" v-slot="{ href, navigate }" :to="link(item.place)" custom>
      <a :href="href ?? undefined" :aria-current="view === item.place ? 'page' : undefined" @click="navigate">{{ item.label }}</a>
    </NuxtLink>
  </nav>
</template>
