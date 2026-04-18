<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { PALETTE } from '~/utils/planner'

const planner = usePlannerStore()
const { categoryMap, getActivityColor } = usePlannerMaps()

const categoryOptions = computed(() => planner.categories.map(c => ({ title: c.name, value: c.id })))

const newCategoryName = ref('')
const newCategoryColor = ref(PALETTE[4])
const newActivityName = ref('')
const newActivityCode = ref('')
const newActivityCategoryId = ref('')

const addCategory = () => {
  planner.addCategory(newCategoryName.value, newCategoryColor.value)
  newCategoryName.value = ''
}

const addActivity = () => {
  planner.addActivity(newActivityName.value, newActivityCode.value, newActivityCategoryId.value)
  newActivityName.value = ''
  newActivityCode.value = ''
  newActivityCategoryId.value = ''
}

watch(
  () => planner.categories.map(c => c.id),
  () => {
    if (!newActivityCategoryId.value) {
      newActivityCategoryId.value = planner.categories[0]?.id ?? ''
    }
  },
  { immediate: true }
)
</script>

<template>
  <v-row dense>
    <!-- Activities -->
    <v-col cols="12" lg="6">
      <v-card class="pa-5 fill-height">
        <div class="text-overline text-medium-emphasis">Activities</div>
        <h2 class="text-h5 mb-4">Manage activities</h2>

        <v-form @submit.prevent="addActivity">
          <v-row dense>
            <v-col cols="12">
              <v-text-field v-model.trim="newActivityName" label="Activity name" required />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model.trim="newActivityCode" label="Code" maxlength="3" required />
            </v-col>
            <v-col cols="12" sm="8">
              <v-select
                v-model="newActivityCategoryId"
                :items="categoryOptions"
                label="Category"
                required
              />
            </v-col>
            <v-col cols="12">
              <v-btn block color="primary" type="submit">Add activity</v-btn>
            </v-col>
          </v-row>
        </v-form>

        <v-list class="mt-4">
          <v-list-item v-for="activity in planner.activities" :key="activity.id" class="px-0">
            <template #prepend>
              <span class="color-dot mr-3" :style="{ backgroundColor: getActivityColor(activity.id) }" />
            </template>
            <v-list-item-title>{{ activity.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ activity.shortCode }} · {{ categoryMap.get(activity.categoryId)?.name }}</v-list-item-subtitle>
            <template #append>
              <v-btn
                :aria-label="`Delete ${activity.name}`"
                color="error"
                icon="mdi-delete-outline"
                variant="text"
                @click="planner.removeActivity(activity.id)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-col>

    <!-- Categories -->
    <v-col cols="12" lg="6">
      <v-card class="pa-5 fill-height">
        <div class="text-overline text-medium-emphasis">Categories</div>
        <h2 class="text-h5 mb-4">Manage categories</h2>

        <v-form @submit.prevent="addCategory">
          <v-text-field v-model.trim="newCategoryName" class="mb-4" label="Category name" required />

          <div class="text-subtitle-2 mb-2">Color</div>
          <div class="d-flex flex-wrap ga-2 mb-4">
            <v-btn
              v-for="color in PALETTE"
              :key="color"
              :color="color"
              :icon="newCategoryColor === color ? 'mdi-check' : undefined"
              min-width="36"
              size="small"
              variant="flat"
              @click="newCategoryColor = color"
            />
          </div>

          <v-btn block color="primary" type="submit">Add category</v-btn>
        </v-form>

        <v-list class="mt-4">
          <v-list-item v-for="category in planner.categories" :key="category.id" class="px-0">
            <template #prepend>
              <span class="color-dot mr-3" :style="{ backgroundColor: category.color ?? '#d6d3d1' }" />
            </template>
            <v-list-item-title>{{ category.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-col>
  </v-row>
</template>
