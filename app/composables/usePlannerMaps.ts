import { usePlannerStore } from '~/stores/planner'

export const usePlannerMaps = () => {
  const planner = usePlannerStore()

  const activityMap = computed(() => new Map(planner.activities.map(a => [a.id, a])))
  const categoryMap = computed(() => new Map(planner.categories.map(c => [c.id, c])))

  const getActivityColor = (activityId: string): string => {
    const activity = activityMap.value.get(activityId)
    if (!activity) return '#d6d3d1'
    return activity.color ?? categoryMap.value.get(activity.categoryId)?.color ?? '#d6d3d1'
  }

  return { activityMap, categoryMap, getActivityColor }
}
