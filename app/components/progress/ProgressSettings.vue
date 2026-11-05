<script setup lang="ts">
/**
 * Progress settings (A2 "Settings"): the Weekly recap, the milestone lines and the calm line when a day is done, each kept in this
 * browser (useRecapSetting, useMilestoneSettings). Each switch turns off on its own; nothing here compares the user with anyone.
 */
const { recapOn, setRecapOn } = useRecapSetting()
const { milestonesOn, setMilestonesOn, celebrateOn, setCelebrateOn } = useMilestoneSettings()
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

    <div class="progress-setting">
      <span id="progress-milestones-label" class="progress-setting-text">
        Milestone lines
        <small>One calm line at a time, never blocking a tick</small>
      </span>
      <UiSwitch :model-value="milestonesOn" labelledby="progress-milestones-label" @update:model-value="setMilestonesOn" />
    </div>

    <div class="progress-setting">
      <span id="progress-celebrate-label" class="progress-setting-text">
        Calm line when a day is done
        <small>No sound, no confetti</small>
      </span>
      <UiSwitch :model-value="celebrateOn" labelledby="progress-celebrate-label" @update:model-value="setCelebrateOn" />
    </div>
  </section>
</template>
