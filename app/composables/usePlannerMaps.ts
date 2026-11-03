import { FALLBACK_EMPTY_COLOR } from '~/utils/palette'
import { usePlannerStore } from '~/stores/planner'

export const usePlannerMaps = () => {
  const planner = usePlannerStore()

  const activityMap = computed(() => new Map(planner.activities.map(a => [a.id, a])))
  const categoryMap = computed(() => new Map(planner.categories.map(c => [c.id, c])))

  const getActivityColor = (activityId: string): string => {
    const activity = activityMap.value.get(activityId)
    if (!activity) return FALLBACK_EMPTY_COLOR
    return activity.color ?? categoryMap.value.get(activity.categoryId)?.color ?? FALLBACK_EMPTY_COLOR
  }

  return { activityMap, categoryMap, getActivityColor }
}
