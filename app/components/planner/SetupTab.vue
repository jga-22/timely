<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { COLORS } from '~/utils/planner'

const planner = usePlannerStore()

const activityMap = computed(() => new Map(planner.activities.map(a => [a.id, a])))
const categoryMap = computed(() => new Map(planner.categories.map(c => [c.id, c])))

const getActivityColor = (activityId: string) =>
  activityMap.value.get(activityId)?.color
  ?? categoryMap.value.get(activityMap.value.get(activityId)?.categoryId ?? '')?.color
  ?? '#d6d3d1'

const newActivityName = ref('')
const newActivityCode = ref('')
const newActivityCategoryId = ref('')

const newCategoryName = ref('')
const newCategoryColor = ref(COLORS[4])

watch(
  () => planner.categories.map(c => c.id),
  (categoryIds) => {
    if (!newActivityCategoryId.value && categoryIds.length > 0) {
      newActivityCategoryId.value = categoryIds[0]!
    }
  },
  { immediate: true }
)

const addActivity = () => {
  planner.addActivity(newActivityName.value, newActivityCode.value, newActivityCategoryId.value)
  newActivityName.value = ''
  newActivityCode.value = ''
  newActivityCategoryId.value = ''
}

const removeActivity = (activityId: string) => {
  planner.removeActivity(activityId)
}

const addCategory = () => {
  planner.addCategory(newCategoryName.value, newCategoryColor.value)
  newCategoryName.value = ''
}
</script>

<template>
  <section class="setup-layout">
    <article class="panel setup-panel">
      <div class="panel-heading">
        <p class="eyebrow">Activities</p>
        <h2>Manage activities</h2>
      </div>

      <form class="setup-form" @submit.prevent="addActivity()">
        <input v-model.trim="newActivityName" type="text" placeholder="Activity name" required>
        <input v-model.trim="newActivityCode" type="text" maxlength="3" placeholder="Code (e.g. WRK)" required>
        <select v-model="newActivityCategoryId" required>
          <option disabled value="">Category</option>
          <option v-for="category in planner.categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
        <button type="submit" class="submit-button">Add activity</button>
      </form>

      <div class="item-list">
        <div v-for="activity in planner.activities" :key="activity.id" class="list-item">
          <div class="item-info">
            <span class="swatch" :style="{ backgroundColor: getActivityColor(activity.id) }" />
            <div>
              <strong>{{ activity.name }}</strong>
              <p>{{ activity.shortCode }} · {{ categoryMap.get(activity.categoryId)?.name }}</p>
            </div>
          </div>
          <button
            type="button"
            class="delete-button"
            :aria-label="`Delete ${activity.name}`"
            :title="`Delete ${activity.name}`"
            @click="removeActivity(activity.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3.75A2.25 2.25 0 0 1 11.25 1.5h1.5A2.25 2.25 0 0 1 15 3.75V4.5h3.75a.75.75 0 0 1 0 1.5H18l-.8 12.06A2.25 2.25 0 0 1 14.96 20.25H9.04A2.25 2.25 0 0 1 6.8 18.06L6 6H5.25a.75.75 0 0 1 0-1.5H9v-.75Zm1.5.75h3v-.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75v.75Zm-2.2 1.5.8 12a.75.75 0 0 0 .74.7h5.92a.75.75 0 0 0 .74-.7l.8-12H8.3Zm2.95 2.25a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm3.75 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </article>

    <article class="panel setup-panel">
      <div class="panel-heading">
        <p class="eyebrow">Categories</p>
        <h2>Manage categories</h2>
      </div>

      <form class="setup-form" @submit.prevent="addCategory()">
        <input v-model.trim="newCategoryName" type="text" placeholder="Category name" required>
        <div class="color-row">
          <button
            v-for="color in COLORS"
            :key="color"
            class="color-chip"
            :class="{ active: newCategoryColor === color }"
            :style="{ backgroundColor: color }"
            type="button"
            @click="newCategoryColor = color"
          />
        </div>
        <button type="submit" class="submit-button">Add category</button>
      </form>

      <div class="item-list">
        <div v-for="category in planner.categories" :key="category.id" class="list-item">
          <div class="item-info">
            <span class="swatch" :style="{ backgroundColor: category.color ?? '#d6d3d1' }" />
            <strong>{{ category.name }}</strong>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.setup-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.setup-panel {
  padding: 1.25rem;
}

.panel-heading {
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0 0 0.2rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-soft);
}

.panel-heading h2 {
  margin: 0;
  font-size: 1.1rem;
}

.setup-form {
  display: grid;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}

.setup-form input,
.setup-form select {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-md);
  background: var(--surface-strong);
  color: var(--text-main);
  font: inherit;
}

.submit-button {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: white;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.color-chip {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
}

.color-chip.active {
  border-color: white;
  box-shadow: 0 0 0 2px rgba(47, 36, 24, 0.3);
}

.item-list {
  display: grid;
  gap: 0.5rem;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem;
  background: var(--surface-strong);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-md);
}

.item-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.item-info strong {
  font-size: 0.9rem;
}

.item-info p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-soft);
}

.swatch {
  flex: none;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
}

.delete-button {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
}

.delete-button:hover {
  background: rgba(190, 18, 60, 0.08);
  border-color: rgba(190, 18, 60, 0.3);
  color: #be123c;
}

.delete-button svg {
  width: 0.9rem;
  height: 0.9rem;
}

@media (max-width: 1100px) {
  .setup-layout {
    grid-template-columns: 1fr;
  }
}
</style>
