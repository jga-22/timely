<script setup lang="ts">
import { FIRST_RUN_TOAST_MS } from '~/composables/useFirstRun'

/** The one line after Accept: "Your plan is saved." on Today, for a few seconds or until it is dismissed (the shared AppToast) */
const { dismissToast } = useFirstRun()
</script>

<template>
  <ShellAppToast title="Your plan is saved." line="Today shows what is next." kind="sprout" :timeout="FIRST_RUN_TOAST_MS" @dismiss="dismissToast" />
</template>
