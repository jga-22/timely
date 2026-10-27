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

/** Outcome of a save that must be known at once (a reset): ok, or the message to show */
export type SaveResult = { ok: true } | { ok: false, message: string }

/** One JSON document per user. Adapters return null when there is nothing valid to restore */
export interface PlannerStorage {
  load(): Promise<PlannerState | null> | PlannerState | null
  /** Debounced where the adapter is remote; the next change carries the full state */
  save(state: PlannerState): Promise<void> | void
  /** Writes now and reports the result. Used by Reset my data, so the reset is not only pending */
  saveNow(state: PlannerState): Promise<SaveResult>
}
