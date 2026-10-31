/**
 * Ambition ops: the 5-year ambition of the Goals screen (Edit and Start empty). Owns updateAmbition and setAmbition
 */
import type { Ambition, PlannerState } from '~/types/planner'
import { newId } from '~/utils/store/ids'

/** Changes the ambition's statement or horizon; nothing happens when the state has none */
export const updateAmbition = (d: PlannerState, changes: Partial<Pick<Ambition, 'statement' | 'horizonYears'>>) => {
  if (d.ambition) Object.assign(d.ambition, changes)
}

/** Writes the 5-year ambition: creates it when the state has none (Start empty). A blank statement creates nothing */
export const setAmbition = (d: PlannerState, statement: string, stamp: number) => {
  if (d.ambition) {
    updateAmbition(d, { statement })
    return
  }

  const trimmed = statement.trim()
  if (!trimmed) return

  d.ambition = { id: newId('ambition', stamp), statement: trimmed, horizonYears: 5 }
}
