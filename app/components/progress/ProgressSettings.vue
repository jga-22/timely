<script setup lang="ts">
/**
 * Progress settings (A2 "Settings"): the Weekly recap switch, kept in this browser (useRecapSetting). Each switch turns off on its
 * own; nothing here compares the user with anyone. The milestone lines and the calm line come with their own features (slice 11).
 */
const { recapOn, setRecapOn } = useRecapSetting()
</script>

<template>
  <section class="card progress-card progress-settings" aria-labelledby="progress-settings-title">
    <h2 id="progress-settings-title" class="section-title">Settings</h2>
    <p class="progress-note">Each one switches off on its own. Nothing here compares you with anyone.</p>

    <div class="progress-setting">
      <span id="progress-recap-label" class="progress-setting-text">
        Weekly recap
        <small>A short summary of your own week</small>
      </span>
      <UiSwitch :model-value="recapOn" labelledby="progress-recap-label" @update:model-value="setRecapOn" />
    </div>
  </section>
</template>
