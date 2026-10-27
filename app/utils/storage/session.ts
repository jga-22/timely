import type { usePlannerStore } from '~/stores/planner'
import { createPlannerStorage } from '~/utils/storage'
import { bindPlannerStorage } from '~/utils/storage/bind'
import type { StorageConfig, StorageStatusHandler } from '~/utils/storage/types'

/**
 * Keeps the planner in step with the signed-in user. Without a session nothing is loaded or written.
 * On sign-out or a user switch, saving stops, the store returns to the seed (not written) and the next user's data loads.
 * Not awaited by the plugin, so the first client render matches the server's 'loading' state.
 */
export const syncPlannerWithSession = (planner: ReturnType<typeof usePlannerStore>, config: StorageConfig, onStatus: StorageStatusHandler) => {
  const auth = useAuth()
  let generation = 0
  let unbind: (() => void) | null = null

  const activate = async (userId: string | null) => {
    const run = ++generation
    unbind?.()
    unbind = null
    planner.$reset()

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
  }

  auth.init()
    .then(() => watch(() => auth.state.value.user?.id ?? null, activate, { immediate: true }))
    .catch(error => console.error('Unable to restore the Supabase session.', error))
}
