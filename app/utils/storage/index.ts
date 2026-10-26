import { createPlannerLocalStorageAdapter } from '~/utils/storage/plannerLocalStorage'
import type { PlannerStorage, StorageConfig, StorageStatusHandler } from '~/utils/storage/types'

/**
 * Picks the planner storage from runtime config. The Supabase client is imported only when chosen,
 * so the default local build does not load it. Missing Supabase settings fall back to local storage.
 */
export const createPlannerStorage = async (config: StorageConfig, onStatus: StorageStatusHandler): Promise<PlannerStorage> => {
  if (config.storage === 'supabase') {
    if (config.supabaseUrl && config.supabaseAnonKey) {
      const { createSupabaseStorage } = await import('~/utils/storage/supabase')
      return createSupabaseStorage(config.supabaseUrl, config.supabaseAnonKey, onStatus)
    }

    console.warn('NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY are required for supabase storage. Using local storage.')
  }

  onStatus('local')
  return createPlannerLocalStorageAdapter()
}
