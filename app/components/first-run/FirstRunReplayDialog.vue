<script setup lang="ts">
/**
 * The confirmation for Replay first run when the account already holds a plan (slice 9). Nothing is removed here: the replace
 * happens when the new draft is accepted. Cancel (or Escape) leaves everything as it was; Replace starts the first run.
 */
const { cancelReplay, confirmReplay } = useFirstRun()
const open = ref(true)

const confirm = () => {
  open.value = false
  confirmReplay()
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    labelledby="firstrun-replay-title"
    describedby="firstrun-replay-body"
    role="alertdialog"
    @close="cancelReplay"
  >
    <h2 id="firstrun-replay-title" class="dialog-title">Replay the first run?</h2>
    <p id="firstrun-replay-body" class="dialog-lede">Accepting the new draft replaces your plan, habits and notes. Your ticks and journal are removed. Until you accept, nothing changes.</p>
    <div class="dialog-actions dialog-actions-spaced">
      <button type="button" class="btn btn-outline" @click="open = false">Cancel</button>
      <button type="button" class="btn btn-danger-solid" @click="confirm">Replace my plan</button>
    </div>
  </UiDialog>
</template>
