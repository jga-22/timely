import type { StorageConfig, StorageMode } from '~/utils/storage/types'

/** Supabase needs both settings; anything missing means local storage, so the default never reaches the network */
export const resolveStorageMode = (config: StorageConfig): StorageMode =>
  config.storage === 'supabase' && config.supabaseUrl && config.supabaseAnonKey ? 'supabase' : 'local'
