<script setup lang="ts">
useHead({
  title: 'Timely — weekly time planner',
  meta: [{ name: 'description', content: 'Design your ideal week, hour by hour.' }]
})

const { surface } = useNav()
</script>

<template>
  <!-- The main landmark, the target of the skip link. The three surfaces read the saved planner, which only exists in the
       browser. Rendering them on the server draws the empty default and then mismatches the saved state on hydration, so they render on the client only. -->
  <main id="main" tabindex="-1" class="shell-main">
    <ClientOnly>
      <TodayView         v-if="surface === 'today'" />
      <PlanView          v-else-if="surface === 'plan'" />
      <ProgressView      v-else />
    </ClientOnly>
  </main>
</template>
