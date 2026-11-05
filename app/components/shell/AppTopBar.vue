<script setup lang="ts">
/**
 * The top bar: the brand on a phone (the rail carries it on a desktop), the theme button (the one theme control: a moon or
 * sun icon, aria-pressed on Dark mode) and the account menu. The account menu and its reset dialog are the shell's, so the reset
 * event goes up to app.vue.
 */
defineProps<{ showAccount: boolean }>()
const emit = defineEmits<{ reset: [] }>()

const { link } = useNav()
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <NuxtLink :to="link('today')" class="shell-brand shell-top-brand">
        <span class="shell-brand-mark" aria-hidden="true"><UiIcon name="check" size="sm" /></span>
        <span>Timely</span>
      </NuxtLink>

      <div class="shell-top-tools">
        <ThemeButton />

        <!-- The account menu (avatar, save status, Motion, Replay first run, Reset my data, Sign out); its dialog opens in the shell -->
        <AccountMenu v-if="showAccount" @reset="emit('reset')" />
      </div>
    </div>
  </header>
</template>
