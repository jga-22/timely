import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { createPlannerLocalStorageAdapter } from '~/utils/storage/plannerLocalStorage'

export default defineNuxtPlugin(() => {
  const planner = usePlannerStore()
  const adapter = createPlannerLocalStorageAdapter()

  planner.hydrate(adapter.load())
  planner.ensureActiveTemplate()
  // Store the restored or default state at once, so a discarded save is overwritten
  adapter.save(planner.$state)

  const { categories, activities, templates, appliedWeeks, settings, ambition, habits } = storeToRefs(planner)

  watch([categories, activities, templates, appliedWeeks, settings, ambition, habits], () => {
    adapter.save(planner.$state)
  }, { deep: true })
})
