import type { PlannerState } from '~/types/planner'
import type { PlannerStorageAdapter } from '~/types/storage'

export const PLANNER_STORAGE_KEY = 'timely-planner-state'

export const createPlannerLocalStorageAdapter = (): PlannerStorageAdapter => ({
  load() {
    if (!import.meta.client) {
      return null
    }

    const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY)

    if (!raw) {
      return null
    }

    try {
      return JSON.parse(raw) as PlannerState
    } catch (error) {
      console.warn('Unable to restore planner state from localStorage.', error)
      return null
    }
  },
  save(state) {
    if (!import.meta.client) {
      return
    }

    window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state))
  },
  clear() {
    if (!import.meta.client) {
      return
    }

    window.localStorage.removeItem(PLANNER_STORAGE_KEY)
  }
})
