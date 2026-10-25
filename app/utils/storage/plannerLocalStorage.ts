import type { PlannerState } from '~/types/planner'
import type { PlannerStorageAdapter } from '~/types/storage'
import { isPlannerState } from '~/utils/planner'

export const PLANNER_STORAGE_KEY = 'timely-planner-state'

export const createPlannerLocalStorageAdapter = (): PlannerStorageAdapter => ({
  load() {
    if (!import.meta.client) {
      return null
    }

    try {
      const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY)

      if (!raw) {
        return null
      }

      const state: unknown = JSON.parse(raw)

      // Saves from another version or with a broken shape are discarded; the caller falls back to the seed
      return isPlannerState(state) ? state : null
    } catch (error) {
      console.warn('Unable to restore planner state from localStorage.', error)
      return null
    }
  },
  save(state: PlannerState) {
    if (!import.meta.client) {
      return
    }

    window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state))
  }
})
