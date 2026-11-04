<script setup lang="ts">
/** Feedback: the dialog (a real UiDialog), the status pills, the inline confirmation, the field error and the empty state */
const dialogOpen = ref(false)
const confirmOpen = ref(true)
</script>

<template>
  <section id="feedback" class="sg-section">
    <h2 class="section-title">Feedback</h2>

    <div class="sg-spec">
      <p class="sg-label">Dialog (UiDialog, native dialog, the page behind is inert)</p>
      <div class="sg-row">
        <button type="button" class="btn btn-outline" @click="dialogOpen = true">Open a centred dialog</button>
      </div>
      <UiDialog v-model:open="dialogOpen" labelledby="sg-dialog-title" describedby="sg-dialog-body">
        <h2 id="sg-dialog-title" class="onb-title">Delete this week type?</h2>
        <p id="sg-dialog-body" class="onb-lede">Escape, Cancel and the close step all end the dialog and return focus to the button that opened it.</p>
        <div class="onb-actions onb-actions-spaced">
          <button type="button" class="btn btn-outline" @click="dialogOpen = false">Cancel</button>
          <button type="button" class="btn btn-danger-solid" @click="dialogOpen = false">Delete</button>
        </div>
      </UiDialog>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Status pills: now, default, quiet</p>
      <div class="sg-row">
        <span class="pill" data-state="now"><span class="live-dot" aria-hidden="true" />Now</span>
        <span class="pill">Next: 14:00</span>
        <span class="pill pill-quiet">Nothing planned</span>
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Inline confirmation (nothing changes before its button)</p>
      <div v-if="confirmOpen" class="inline-confirm">
        <p class="inline-confirm-text">Remove Morning run from this week type?</p>
        <div class="act-actions">
          <button type="button" class="btn btn-sm" @click="confirmOpen = false">Keep</button>
          <button type="button" class="btn btn-sm btn-danger-solid" @click="confirmOpen = false">Remove</button>
        </div>
      </div>
      <p v-else class="sg-note">Confirmation closed. <button type="button" class="btn btn-sm btn-quiet" @click="confirmOpen = true">Show it again</button></p>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Field error and the status line</p>
      <div class="field">
        <label class="field-label" for="sg-error">Name</label>
        <input id="sg-error" class="timely-input" value="" aria-invalid="true" aria-describedby="sg-error-text" placeholder="Name your week type">
        <p id="sg-error-text" class="field-error" role="alert">A name is needed.</p>
      </div>
      <p class="sg-note" role="status">Saved in this browser.</p>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Empty state</p>
      <div class="empty-state">
        <p>Nothing planned on this day.</p>
        <NuxtLink class="btn btn-sm btn-outline" to="/?tab=plan&view=week">Open Week</NuxtLink>
      </div>
    </div>
  </section>
</template>
