<script setup lang="ts">
/**
 * Confirmation for Reset my data (FR-ONB-10). An alertdialog: Cancel has focus, Escape and Cancel close it, Tab stays
 * between its two buttons. On success the reset itself opens Welcome; on failure the message is shown and nothing changes.
 */
const emit = defineEmits<{ close: [] }>()
const { resetData } = useResetData()

const cancelButton = ref<HTMLButtonElement | null>(null)
const deleteButton = ref<HTMLButtonElement | null>(null)
const busy = ref(false)
const error = ref('')

onMounted(() => nextTick(() => cancelButton.value?.focus()))

const cancel = () => {
  if (!busy.value) emit('close')
}

const confirm = async () => {
  busy.value = true
  error.value = ''

  const message = await resetData()
  busy.value = false

  if (message) error.value = message
  else emit('close')
}

const onTab = (event: KeyboardEvent) => {
  const first = cancelButton.value
  const last = deleteButton.value
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <div class="onb-overlay">
    <div
      class="onb-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reset-title"
      aria-describedby="reset-body"
      @keydown.esc.stop="cancel"
      @keydown.tab="onTab"
    >
      <h2 id="reset-title" class="onb-title">Reset my data?</h2>
      <p id="reset-body" class="onb-lede">This permanently deletes your goals, habits, activities, weeks and journal notes from this account and starts again from the beginning. Your sign-in stays. This cannot be undone.</p>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      <div class="onb-actions">
        <button ref="cancelButton" type="button" class="btn btn-outline" :disabled="busy" @click="cancel">Cancel</button>
        <button ref="deleteButton" type="button" class="btn btn-danger-solid" :disabled="busy" @click="confirm">Delete my data</button>
      </div>
    </div>
  </div>
</template>
