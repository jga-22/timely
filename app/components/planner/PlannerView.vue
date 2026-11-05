<script setup lang="ts">
// The Week tab (the layout of 2026-11-05): the lede, then one Week card with the schedule bar, the week grid (Show sleep and the grid) and the
// entry buttons (+ Add activity, Sleep hours); Where the week goes (the Time split) below the card. Each part is its own component; this view
// holds what they share: the Edit schedule panel's open state and the schedule added last. The Year (the painter and the Weeks row) is the Year tab.
// headless: mounted under Plan, which holds the page title (the title row is not shown)
defineProps<{ headless?: boolean }>()

const { item, edit, setSelection, link } = useNav()
const planner = usePlannerStore()
const templateEditOpen = ref(false)
// The week type just added: a status line names it and links to its weeks on the Year tab. Another panel opening clears it
const addedTemplateId = ref<string | null>(null)
const addedTemplate = computed(() => planner.templates.find(t => t.id === addedTemplateId.value) ?? null)

// One item in edit mode per screen (PRD 11.2): opening the week type editor leaves an open activity editor
watch(templateEditOpen, (open) => {
  if (!open) return
  addedTemplateId.value = null
  if (edit.value) setSelection({ item: item.value ?? undefined }, true)
})

// The week grid's box or menu and the entry form are one editor at a time (PRD 11.2): each one opening closes the other, and the week type panel closes too
const gridCloseToken = ref(0)
const formCloseToken = ref(0)
function onGridOpen() {
  templateEditOpen.value = false
  addedTemplateId.value = null
  formCloseToken.value += 1
}

function onFormOpen() {
  templateEditOpen.value = false
  addedTemplateId.value = null
  gridCloseToken.value += 1
}

function onTemplateCreated(templateId: string) {
  addedTemplateId.value = templateId
}
</script>

<template>
  <div class="view">
    <!-- Page header -->
    <header v-if="!headless" class="page-head">
      <h1 class="page-title">Week</h1>
    </header>

    <!-- The lede (A2 words): what to do on the grid. It names no schedule: the bar in the card shows the one chosen -->
    <p class="week-lede">Tap or drag hours on the grid, then choose what goes there.</p>

    <!-- The Week card: the schedules at the top, the grid (with Show sleep) and the entry buttons under it, on one surface -->
    <div class="week-card">
      <!-- Schedule bar: the switcher, New schedule and the Edit schedule panel -->
      <PlannerWeekTypeBar v-model:editOpen="templateEditOpen" @opened="addedTemplateId = null" @created="onTemplateCreated" />

      <!-- The new schedule, with its way to the Year tab (applying it to weeks is there, not here; no tab change by itself) -->
      <p v-if="addedTemplate" class="sched-result" role="status">
        <span>{{ addedTemplate.name }} added.</span>
        <NuxtLink :to="link('year', { item: addedTemplate.id })">Choose its weeks in Year</NuxtLink>
      </p>

      <!-- Week grid: the original range-select grid, with its action bar and menu teleported to the body -->
      <!-- Client only: the grid is state-driven, and server HTML would keep the seed cells after hydration -->
      <ClientOnly>
        <PlannerActivityGrid :close-token="gridCloseToken" @open="onGridOpen" />
      </ClientOnly>

      <!-- Add an activity and set sleep: the one form opens under these buttons (entries are edited from Goals) -->
      <PlannerEntryActions :close-token="formCloseToken" @form-open="onFormOpen" />
    </div>

    <!-- Where the week goes: the typical week of the active schedule, below the card (client only: it reads the saved planner) -->
    <ClientOnly>
      <PlannerTimeSplit />
    </ClientOnly>
  </div>
</template>
