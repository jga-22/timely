import type { PlannerState } from '~/types/planner'

export interface PlannerStorageAdapter {
  load(): PlannerState | null
  save(state: PlannerState): void
  clear(): void
}
