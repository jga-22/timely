import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { createPlannerLocalStorageAdapter } from '~/utils/storage/plannerLocalStorage'

export default defineNuxtPlugin(() => {
  const planner = usePlannerStore()
  const adapter = createPlannerLocalStorageAdapter()

  planner.hydrate(adapter.load())
  planner.ensureDefaultWeek()
  planner.ensureActiveTemplate()

  const { categories, activities, templates, appliedWeeks, settings, ambition, dimensions, habits } = storeToRefs(planner)

  watch([categories, activities, templates, appliedWeeks, settings, ambition, dimensions, habits], () => {
    adapter.save(planner.$state)
  }, { deep: true })
})
