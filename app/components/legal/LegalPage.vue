<script setup lang="ts">
import { formatLegalDate, legal } from '~/utils/legal'

defineProps<{ title: string }>()

const updated = formatLegalDate(legal.lastUpdated)
</script>

<template>
  <main class="view legal">
    <header class="page-head">
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-meta">Last updated {{ updated }}</p>
    </header>
    <div class="legal-body">
      <slot />
    </div>
    <p class="legal-back">
      <NuxtLink to="/" class="legal-link">Back to Timely</NuxtLink>
    </p>
  </main>
</template>
