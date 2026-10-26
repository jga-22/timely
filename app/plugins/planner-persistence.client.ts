import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { createPlannerStorage } from '~/utils/storage'
import type { StorageConfig } from '~/utils/storage/types'

export default defineNuxtPlugin(async () => {
  const planner = usePlannerStore()
  const { set: setStorageStatus } = useStorageStatus()
  const storage = await createPlannerStorage(useRuntimeConfig().public as StorageConfig, setStorageStatus)

  planner.hydrate(await storage.load())
  planner.ensureActiveTemplate()
  // Store the restored or default state at once, so a discarded save is overwritten
  storage.save(planner.$state)

  const { categories, activities, templates, appliedWeeks, settings, ambition, habits, journal } = storeToRefs(planner)

  watch([categories, activities, templates, appliedWeeks, settings, ambition, habits, journal], () => {
    storage.save(planner.$state)
  }, { deep: true })
})
