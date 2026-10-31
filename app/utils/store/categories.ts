/**
 * Life area ops (the categories of Goals, FR-GOALS): adding, editing, colour, order, removing and the starter grid.
 * Owns addCategory, updateCategory, setCategoryColor, moveCategory, removeCategory and seedHaradaGoals
 */
import type { Category, PlannerState } from '~/types/planner'
import { createHaradaSeed } from '~/utils/planner'
import { numberCategories } from '~/utils/plannerStore'
import { newId } from '~/utils/store/ids'

/** Adds a category at the end of the list. Returns its id, or null when the name is blank */
export const addCategory = (d: PlannerState, name: string, color: string, stamp: number): string | null => {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return null
  }

  const id = newId('category', stamp)

  d.categories.push({
    id,
    name: trimmedName,
    color,
    order: Math.max(0, ...d.categories.map(category => category.order)) + 1
  })

  return id
}

export const updateCategory = (d: PlannerState, categoryId: string, changes: Partial<Pick<Category, 'name' | 'goal5y' | 'target1y' | 'targetTbd'>>) => {
  const category = d.categories.find(item => item.id === categoryId)
  if (category) Object.assign(category, changes)
}

export const setCategoryColor = (d: PlannerState, categoryId: string, color: string) => {
  const category = d.categories.find(item => item.id === categoryId)

  if (!category) {
    return
  }

  // A6: only activities still on the old category colour follow the change; hand-picked colours stay
  const previous = category.color?.toLowerCase()
  category.color = color
  for (const activity of d.activities) {
    if (activity.categoryId === categoryId && previous && activity.color.toLowerCase() === previous) {
      activity.color = color
    }
  }
}

export const moveCategory = (d: PlannerState, categoryId: string, offset: -1 | 1) => {
  const ordered = numberCategories(d.categories)
  const index = ordered.findIndex(category => category.id === categoryId)
  const targetIndex = index + offset

  if (index === -1 || targetIndex < 0 || targetIndex >= ordered.length) {
    return
  }

  const current = ordered[index]!
  ordered[index] = ordered[targetIndex]!
  ordered[targetIndex] = current
  // Renumber in the swapped order; sorting by the old order numbers would undo the swap
  d.categories = ordered.map((category, position) => ({ ...category, order: position + 1 }))
}

/** Removes a category; its activities and habits must first move to another category. Returns false when it cannot be removed */
export const removeCategory = (d: PlannerState, categoryId: string, targetCategoryId?: string): boolean => {
  if (!d.categories.some(category => category.id === categoryId)) {
    return false
  }

  // Only primary links need a new home
  const hasContent = d.activities.some(activity => activity.categoryId === categoryId)
    || d.habits.some(habit => habit.categoryId === categoryId)
  const target = targetCategoryId && targetCategoryId !== categoryId
    && d.categories.some(category => category.id === targetCategoryId)
    ? targetCategoryId
    : null

  if (hasContent && !target) {
    return false
  }

  if (target) {
    for (const activity of d.activities) {
      if (activity.categoryId === categoryId) activity.categoryId = target
    }

    for (const habit of d.habits) {
      if (habit.categoryId === categoryId) habit.categoryId = target
    }
  }

  d.categories = numberCategories(d.categories.filter(category => category.id !== categoryId))
  return true
}

/** Starter grid for an empty planner; existing categories and activities are never replaced */
export const seedHaradaGoals = (d: PlannerState) => {
  if (d.categories.length) {
    return
  }

  Object.assign(d, createHaradaSeed())
}
