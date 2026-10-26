import type { PlannerState } from '~/types/planner'

/** Where the planner state is kept. 'local' is the default and needs no configuration */
export type StorageMode = 'local' | 'supabase'

export type StorageStatusState = 'local' | 'loading' | 'saving' | 'saved' | 'error'

export type StorageStatusHandler = (state: StorageStatusState, message?: string) => void

export interface StorageConfig {
  storage: StorageMode
  supabaseUrl: string
  supabaseAnonKey: string
}

/** One JSON document per user. Adapters return null when there is nothing valid to restore */
export interface PlannerStorage {
  load(): Promise<PlannerState | null> | PlannerState | null
  save(state: PlannerState): Promise<void> | void
}
