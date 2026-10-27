import type { PlannerStorage } from '~/utils/storage/types'

/**
 * The storage the planner is saved to right now. Set by the persistence plugin (local) or the session sync (Supabase),
 * and null while no user is signed in or another user's data is loading. Client only.
 */
let active: PlannerStorage | null = null

export const setActivePlannerStorage = (storage: PlannerStorage | null) => {
  active = storage
}

export const getActivePlannerStorage = (): PlannerStorage | null => active
