import { createPlannerLocalStorageAdapter } from '~/utils/storage/plannerLocalStorage'
import { resolveStorageMode } from '~/utils/storage/mode'
import type { PlannerStorage, StorageConfig, StorageStatusHandler } from '~/utils/storage/types'

/**
 * Picks the planner storage from runtime config. Supabase is used only with a signed-in user id,
 * and its module is imported only when chosen, so the default local build does not load it.
 */
export const createPlannerStorage = async (config: StorageConfig, onStatus: StorageStatusHandler, userId: string | null): Promise<PlannerStorage> => {
  if (resolveStorageMode(config) === 'supabase') {
    if (!userId) throw new Error('Supabase storage needs a signed-in user.')

    const { createSupabaseStorage } = await import('~/utils/storage/supabase')
    return createSupabaseStorage(config.supabaseUrl, config.supabaseAnonKey, userId, onStatus)
  }

  onStatus('local')
  return createPlannerLocalStorageAdapter()
}
