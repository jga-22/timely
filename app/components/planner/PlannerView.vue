<script setup lang="ts">
// The Week tab: the week type bar, the week grid, Activities and habits, and the Year. Each part is its own component; this view
// holds what they share: the Edit week type panel's open state and the year to open after a time-off week type is added
const { item, edit, setSelection } = useNav()
const templateEditOpen = ref(false)
const yearPainter = ref<{ openFor: (templateId: string) => void } | null>(null)

// One item in edit mode per screen (PRD 11.2): opening the week type editor leaves an open activity editor
watch(templateEditOpen, (open) => {
  if (open && edit.value) setSelection({ item: item.value ?? undefined }, true)
})

// A time-off week type is usually applied to weeks next: open the year with it chosen and the first week field focused
function onTemplateCreated(templateId: string, kind?: 'break') {
  if (kind === 'break') yearPainter.value?.openFor(templateId)
}
</script>

<template>
  <div class="view">
    <!-- Page header -->
    <header class="page-head">
      <h1 class="page-title">Week</h1>
    </header>

    <!-- Week type bar: the switcher, New week type and the Edit week type panel -->
    <PlannerWeekTypeBar v-model:editOpen="templateEditOpen" @created="onTemplateCreated" />

    <!-- Week grid: the original range-select grid, with its action bar and menu teleported to the body -->
    <!-- Client only: the grid is state-driven, and server HTML would keep the seed cells after hydration -->
    <ClientOnly>
      <PlannerActivityGrid />
    </ClientOnly>

    <PlannerEntryList @form-open="templateEditOpen = false" />

    <YearPainter ref="yearPainter" />
  </div>
</template>
