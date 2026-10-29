import { storeToRefs } from 'pinia'
import type { usePlannerStore } from '~/stores/planner'
import type { PlannerStorage } from '~/utils/storage/types'

/** Saves the store on every change until the returned function is called */
export const bindPlannerStorage = (planner: ReturnType<typeof usePlannerStore>, storage: PlannerStorage) => {
  const { categories, activities, templates, appliedWeeks, settings, ambition, habits, journal, onboarding, done } = storeToRefs(planner)

  return watch([categories, activities, templates, appliedWeeks, settings, ambition, habits, journal, onboarding, done], () => {
    storage.save(planner.$state)
  }, { deep: true })
}
