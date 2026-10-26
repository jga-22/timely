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

  const { categories, activities, templates, appliedWeeks, settings, ambition, habits, journal } = storeToRefs(planner)

  watch([categories, activities, templates, appliedWeeks, settings, ambition, habits, journal], () => {
    adapter.save(planner.$state)
  }, { deep: true })
})
