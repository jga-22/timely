import type { PlannerState } from '~/types/planner'
import type { PlannerStorage, SaveResult } from '~/utils/storage/types'
import { isPlannerState } from '~/utils/planner'

export const PLANNER_STORAGE_KEY = 'timely-planner-state'

export const createPlannerLocalStorageAdapter = (): PlannerStorage => {
  const write = (state: PlannerState) => {
    if (!import.meta.client) {
      return
    }

    window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state))
  }

  return {
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
    save: write,
    async saveNow(state: PlannerState): Promise<SaveResult> {
      try {
        write(state)
        return { ok: true }
      } catch (error) {
        console.warn('Unable to save planner state to localStorage.', error)
        return { ok: false, message: 'The browser did not store the change.' }
      }
    }
  }
}
