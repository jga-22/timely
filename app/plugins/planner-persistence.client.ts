import { usePlannerStore } from '~/stores/planner'
import { createPlannerStorage } from '~/utils/storage'
import { bindPlannerStorage } from '~/utils/storage/bind'
import { resolveStorageMode } from '~/utils/storage/mode'
import { needsOnboarding } from '~/utils/onboarding'
import type { StorageConfig } from '~/utils/storage/types'

export default defineNuxtPlugin(async () => {
  const planner = usePlannerStore()
  const config = useRuntimeConfig().public as StorageConfig
  const { set: setStorageStatus } = useStorageStatus()
  const onboarding = useOnboarding()

  // Supabase mode waits for a session; nothing is loaded or written without one
  if (resolveStorageMode(config) === 'supabase') {
    const { syncPlannerWithSession } = await import('~/utils/storage/session')
    syncPlannerWithSession(planner, config, setStorageStatus)
    return
  }

  const storage = await createPlannerStorage(config, setStorageStatus, null)

  const restored = await storage.load()
  planner.hydrate(restored)
  planner.ensureActiveTemplate()
  // Store the restored or default state at once, so a discarded save is overwritten
  storage.save(planner.$state)
  bindPlannerStorage(planner, storage)

  if (needsOnboarding(restored)) onboarding.openWelcome()
})
