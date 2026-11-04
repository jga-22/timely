<script setup lang="ts">
import { SHELL_ITEMS } from '~/utils/nav'

/**
 * The desktop rail (A2): the brand and the three surfaces, Today, Plan and Progress. Shown from 769px; the phone uses
 * AppTabBar. It is the first navigation after the skip link, so Tab reaches the shell before the page.
 */
const { surface, link } = useNav()
</script>

<template>
  <div class="shell-rail">
    <NuxtLink :to="link('today')" class="shell-brand">
      <span class="shell-brand-mark" aria-hidden="true"><UiIcon name="check" size="sm" /></span>
      <span>Timely</span>
    </NuxtLink>
    <nav class="shell-rail-nav" aria-label="Main">
      <ShellAppNavLink
        v-for="item in SHELL_ITEMS"
        :key="item.place"
        :place="item.place"
        :label="item.label"
        :icon="item.icon"
        :current="surface === item.place"
      />
    </nav>
  </div>
</template>
