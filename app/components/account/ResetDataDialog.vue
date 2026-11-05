<script setup lang="ts">
/**
 * Confirmation for Reset my data (FR-ONB-10): an alertdialog on UiDialog. Cancel has focus; Escape and Cancel close it
 * (not while the reset runs). On success the reset itself opens Welcome; on failure the message is shown and nothing changes.
 */
const emit = defineEmits<{ close: [] }>()
const { resetData } = useResetData()

const open = ref(true)
const busy = ref(false)
const error = ref('')

const cancel = () => {
  if (!busy.value) open.value = false
}

const confirm = async () => {
  busy.value = true
  error.value = ''

  const message = await resetData()
  busy.value = false

  if (message) error.value = message
  else open.value = false
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    labelledby="reset-title"
    describedby="reset-body"
    role="alertdialog"
    :dismissible="!busy"
    @close="emit('close')"
  >
    <h2 id="reset-title" class="dialog-title">Reset my data?</h2>
    <p id="reset-body" class="dialog-lede">This permanently deletes your goals, activities and habits, weeks and journal notes from this account and starts again from the beginning. Your sign-in stays. This cannot be undone.</p>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <div class="dialog-actions dialog-actions-spaced">
      <button type="button" class="btn btn-outline" :disabled="busy" @click="cancel">Cancel</button>
      <button type="button" class="btn btn-danger-solid" :disabled="busy" @click="confirm">Delete my data</button>
    </div>
  </UiDialog>
</template>
