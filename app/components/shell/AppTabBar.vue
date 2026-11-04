<script setup lang="ts">
import { SHELL_ITEMS } from '~/utils/nav'

/**
 * The phone tab bar (A2): Today, Plan and Progress at the foot of the screen, with the safe-area padding. The page leaves room
 * for it (features/shell.css, the column padding), so it never covers the last content. The desktop rail is AppRail.
 */
const { surface } = useNav()
</script>

<template>
  <nav class="shell-tabbar" aria-label="Main, phone">
    <ShellAppNavLink
      v-for="item in SHELL_ITEMS"
      :key="item.place"
      :place="item.place"
      :label="item.label"
      :icon="item.icon"
      :current="surface === item.place"
    />
  </nav>
</template>
