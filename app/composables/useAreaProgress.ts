import { usePlannerStore } from '~/stores/planner'
import { areaProgress, type AreaProgress } from '~/utils/targetProgress'

/**
 * The progress of a life area toward its 1-year target (utils/targetProgress.ts), read from the saved planner on the day of the
 * app's today. Null until today is known (FR-DATE-6: the clock is read after mount), and for an unknown area. Read-only.
 */
export const useAreaProgress = () => {
  const planner = usePlannerStore()
  const { today } = usePlannerYear()

  const progressOf = (categoryId: string): AreaProgress | null => {
    const category = planner.categories.find(entry => entry.id === categoryId)
    if (!category || !today.value) return null

    return areaProgress(planner.$state, category, today.value)
  }

  return { progressOf }
}
