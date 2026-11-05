<script setup lang="ts">
import { FIRST_RUN_TOAST_MS } from '~/composables/useFirstRun'

/** The one line after Accept: "Your plan is saved." on Today, for a few seconds or until it is dismissed (A2 toast). Never blocks the page */
const { dismissToast } = useFirstRun()
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  timer = setTimeout(dismissToast, FIRST_RUN_TOAST_MS)
})

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="firstrun-toast" role="status">
    <svg class="firstrun-toast-ill" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 20V11" />
      <path d="M12 12c0-3.5-2.5-6-7-6 0 3.5 2.5 6 7 6Z" />
      <path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5Z" />
    </svg>
    <div class="firstrun-toast-text">
      <p class="firstrun-toast-title">Your plan is saved.</p>
      <p class="firstrun-toast-line">Today shows what is next.</p>
    </div>
    <button type="button" class="btn btn-quiet firstrun-toast-dismiss" @click="dismissToast">Dismiss</button>
  </div>
</template>
