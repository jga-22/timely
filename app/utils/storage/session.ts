import type { usePlannerStore } from '~/stores/planner'
import { needsOnboarding } from '~/utils/onboarding'
import { createPlannerStorage } from '~/utils/storage'
import { bindPlannerStorage } from '~/utils/storage/bind'
import { setActivePlannerStorage } from '~/utils/storage/active'
import type { StorageConfig, StorageStatusHandler } from '~/utils/storage/types'

/**
 * Keeps the planner in step with the signed-in user. Without a session nothing is loaded or written.
 * On sign-out or a user switch, saving stops, the store returns to the seed (not written) and the next user's data loads.
 * Not awaited by the plugin, so the first client render matches the server's 'loading' state.
 */
export const syncPlannerWithSession = (planner: ReturnType<typeof usePlannerStore>, config: StorageConfig, onStatus: StorageStatusHandler) => {
  const auth = useAuth()
  const onboarding = useOnboarding()
  const { status: storageStatus } = useStorageStatus()
  let generation = 0
  let unbind: (() => void) | null = null

  const activate = async (userId: string | null) => {
    const run = ++generation
    unbind?.()
    unbind = null
    // Back to the empty onboarding state, and any Welcome or tour from the previous user closes
    planner.$reset()
    onboarding.close()
    setActivePlannerStorage(null)

    if (!userId) return

    const storage = await createPlannerStorage(config, onStatus, userId)
    const restored = await storage.load()

    // Another user or a sign-out happened while loading: drop this result
    if (run !== generation) return

    planner.hydrate(restored)
    planner.ensureActiveTemplate()
    // Store the restored or default state at once, so a discarded save is overwritten
    storage.save(planner.$state)
    unbind = bindPlannerStorage(planner, storage)
    setActivePlannerStorage(storage)

    // A failed load is not a new user: its empty state must not be onboarded (and nothing is saved over the row)
    if (needsOnboarding(restored) && storageStatus.value.state !== 'error') onboarding.openWelcome()
  }

  auth.init()
    .then(() => watch(() => auth.state.value.user?.id ?? null, activate, { immediate: true }))
    .catch(error => console.error('Unable to restore the Supabase session.', error))
}
