<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Activity, Category } from '~/types/planner'
import { DAYS } from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'

type TabId = 'planner' | 'insights' | 'setup'

const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185']
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const TOTAL_WEEK_HOURS = 24 * 7

const navItems = [
  { id: 'planner', label: 'Planner', icon: 'mdi-calendar-week' },
  { id: 'insights', label: 'Insights', icon: 'mdi-chart-box-outline' },
  { id: 'setup', label: 'Legend', icon: 'mdi-palette-outline' }
] as const

useHead({
  title: 'Timely | Weekly Planner',
  meta: [
    {
      name: 'description',
      content: 'Define weekly templates, apply them to selected weeks, and inspect your time distribution.'
    }
  ]
})

const planner = usePlannerStore()
const { activeTemplate, activeTemplateActivityTotals, appliedWeeks, templates, yearlyProjectionHours } = storeToRefs(planner)

const activeTab = ref<TabId>('planner')
const selectedCategoryId = ref('')
const selectedDayIndex = ref(0)
const templateNameDraft = ref('')
const calendarMonth = ref(new Date().getMonth())
const calendarYear = ref(new Date().getFullYear())
const selectedWeekDates = ref<string[]>([])

const newCategoryName = ref('')
const newCategoryColor = ref(COLORS[4])
const newActivityName = ref('')
const newActivityCode = ref('')
const newActivityCategoryId = ref('')

const templateOptions = computed(() => templates.value.map(template => ({
  title: template.name,
  value: template.id
})))

const dayOptions = computed(() => DAYS.map((day, index) => ({ title: day, value: index })))
const categoryOptions = computed(() => planner.categories.map(category => ({ title: category.name, value: category.id })))
const canDeleteTemplate = computed(() => templates.value.length > 1)

const activityMap = computed(() => new Map(planner.activities.map(activity => [activity.id, activity])))
const categoryMap = computed(() => new Map(planner.categories.map(category => [category.id, category])))

const plannerCategories = computed(() =>
  planner.categories.map(category => ({
    category,
    activity: planner.activities.find(activity => activity.categoryId === category.id),
    hours: activeTemplate.value?.slots.reduce((total, slot) => {
      const activity = activityMap.value.get(slot)
      return total + (activity?.categoryId === category.id ? 1 : 0)
    }, 0) ?? 0
  })).filter((item): item is { category: Category, activity: Activity, hours: number } => Boolean(item.activity))
)

const selectedPlannerCategory = computed(() =>
  plannerCategories.value.find(item => item.category.id === selectedCategoryId.value)
)

const allocatedHours = computed(() =>
  activeTemplate.value?.slots.reduce((total, slot) => total + (slot ? 1 : 0), 0) ?? 0
)

const activityBreakdown = computed(() =>
  Array.from(activeTemplateActivityTotals.value.entries())
    .map(([activityId, hours]) => ({
      activity: activityMap.value.get(activityId),
      hours
    }))
    .filter((item): item is { activity: Activity, hours: number } => Boolean(item.activity))
    .sort((left, right) => right.hours - left.hours)
)

const categoryBreakdown = computed(() => {
  const totals = new Map<string, number>()

  for (const item of activityBreakdown.value) {
    totals.set(item.activity.categoryId, (totals.get(item.activity.categoryId) ?? 0) + item.hours)
  }

  return Array.from(totals.entries())
    .map(([categoryId, hours]) => ({
      category: categoryMap.value.get(categoryId),
      hours
    }))
    .filter((item): item is { category: Category, hours: number } => Boolean(item.category))
    .sort((left, right) => right.hours - left.hours)
})

const categoryDailyHours = computed(() =>
  DAYS.map((day, dayIndex) => {
    const totals = new Map<string, number>()

    for (let hour = 0; hour < 24; hour += 1) {
      const slot = activeTemplate.value?.slots[(dayIndex * 24) + hour]

      if (!slot) {
        continue
      }

      const activity = activityMap.value.get(slot)

      if (!activity) {
        continue
      }

      totals.set(activity.categoryId, (totals.get(activity.categoryId) ?? 0) + 1)
    }

    return {
      day,
      totals: planner.categories.map(category => ({
        category,
        hours: totals.get(category.id) ?? 0
      })).filter(item => item.hours > 0)
    }
  })
)

const projectionSummaries = computed(() =>
  Array.from(yearlyProjectionHours.value.entries())
    .map(([activityId, hours]) => ({
      activity: activityMap.value.get(activityId),
      hours
    }))
    .filter((item): item is { activity: Activity, hours: number } => Boolean(item.activity))
    .sort((left, right) => right.hours - left.hours)
)

const selectedDayName = computed(() => DAYS[selectedDayIndex.value] ?? DAYS[0])
const selectedDayHours = computed(() =>
  activeTemplate.value?.slots.slice(selectedDayIndex.value * 24, (selectedDayIndex.value + 1) * 24).filter(Boolean).length ?? 0
)

const visibleMonthWeekStartDates = computed(() => {
  const monthStart = new Date(Date.UTC(calendarYear.value, calendarMonth.value, 1))
  const monthEnd = new Date(Date.UTC(calendarYear.value, calendarMonth.value + 1, 0))
  const offset = (monthStart.getUTCDay() + 6) % 7
  const cursor = new Date(monthStart)
  cursor.setUTCDate(monthStart.getUTCDate() - offset)

  const weeks: string[] = []

  while (cursor <= monthEnd || cursor.getUTCDate() <= 7) {
    const weekStart = new Date(cursor)
    weeks.push(weekStart.toISOString().slice(0, 10))

    cursor.setUTCDate(cursor.getUTCDate() + 7)

    if (weeks.length > 5) {
      break
    }
  }

  return weeks
})

const visibleMonthWeekStartDateSet = computed(() => new Set(visibleMonthWeekStartDates.value))
const appliedWeekStartDates = computed(() =>
  new Set(
    appliedWeeks.value
      .filter(week => week.templateId === activeTemplate.value?.id)
      .map(week => week.startDate)
  )
)
const visibleMonthLabel = computed(() =>
  new Date(Date.UTC(calendarYear.value, calendarMonth.value, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
)
const selectedWeekLabels = computed(() =>
  selectedWeekDates.value
    .slice()
    .sort()
    .map((date) => {
      const weekStart = new Date(`${date}T00:00:00Z`)
      const weekEnd = new Date(weekStart)
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6)

      return {
        date,
        label: `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
      }
    })
)

const projectionInsight = (hours: number) => {
  if (hours > 8000) {
    return 'Mastery-level repetition.'
  }

  if (hours > 4000) {
    return 'Enough time to become highly proficient.'
  }

  if (hours > 1000) {
    return 'A meaningful long-term investment.'
  }

  if (hours > 500) {
    return 'A habit with visible compounding.'
  }

  return 'Small, but it still adds up.'
}

const getActivityColor = (activityId: string) =>
  activityMap.value.get(activityId)?.color
  ?? categoryMap.value.get(activityMap.value.get(activityId)?.categoryId ?? '')?.color
  ?? '#d6d3d1'

const getSlot = (dayIndex: number, hour: number) => activeTemplate.value?.slots[(dayIndex * 24) + hour] ?? ''
const isSelectedHour = (hour: number) => getSlot(selectedDayIndex.value, hour) === selectedPlannerCategory.value?.activity.id
const getHourColor = (hour: number) => getSlot(selectedDayIndex.value, hour) ? getActivityColor(getSlot(selectedDayIndex.value, hour)) : selectedPlannerCategory.value?.category.color ?? 'secondary'
const getHourVariant = (hour: number) => isSelectedHour(hour) ? 'flat' : getSlot(selectedDayIndex.value, hour) ? 'tonal' : 'outlined'

const saveTemplateName = () => {
  planner.renameActiveTemplate(templateNameDraft.value)
  templateNameDraft.value = activeTemplate.value?.name ?? ''
}

const toggleSlot = (hour: number) => {
  const activityId = selectedPlannerCategory.value?.activity.id

  if (!activityId) {
    return
  }

  const currentSlot = getSlot(selectedDayIndex.value, hour)
  planner.setSlot(selectedDayIndex.value, hour, currentSlot === activityId ? '' : activityId)
}

const applyTemplateToMonth = () => {
  if (!activeTemplate.value) {
    return
  }

  planner.setTemplateApplications(
    activeTemplate.value.id,
    selectedWeekDates.value,
    visibleMonthWeekStartDates.value
  )
}

const deleteActiveTemplate = () => {
  if (!activeTemplate.value) {
    return
  }

  const deleted = planner.deleteTemplate(activeTemplate.value.id)

  if (deleted) {
    templateNameDraft.value = planner.activeTemplate?.name ?? ''
  }
}

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

const removeActivity = (activityId: string) => {
  planner.removeActivity(activityId)

  if (selectedPlannerCategory.value?.activity.id === activityId) {
    selectedCategoryId.value = plannerCategories.value[0]?.category.id ?? ''
  }
}

watch([activeTemplate, () => planner.activities.map(activity => activity.id), () => planner.categories.map(category => category.id)], () => {
  if (!newActivityCategoryId.value) {
    newActivityCategoryId.value = planner.categories[0]?.id ?? ''
  }

  if (!plannerCategories.value.some(item => item.category.id === selectedCategoryId.value)) {
    selectedCategoryId.value = plannerCategories.value[0]?.category.id ?? ''
  }

  templateNameDraft.value = activeTemplate.value?.name ?? ''
}, { immediate: true })

watch([calendarMonth, calendarYear, activeTemplate, appliedWeeks], () => {
  selectedWeekDates.value = visibleMonthWeekStartDates.value
    .filter(startDate => appliedWeekStartDates.value.has(startDate))
}, { immediate: true })
</script>

<template>
  <v-container class="py-6" max-width="1240">
    <v-card class="pa-6 mb-4">
      <div class="text-center">
        <div class="text-overline text-medium-emphasis mb-2">Timely</div>
        <h1 class="text-h3 text-md-h2 font-weight-bold mb-3">Design your ideal week.</h1>
        <p class="text-body-1 text-medium-emphasis mx-auto hero-copy">
          Define a clean weekly template, choose where it applies, and inspect how your time compounds.
        </p>
      </div>

      <div class="d-flex justify-center mt-6">
        <v-btn-toggle
          v-model="activeTab"
          color="primary"
          density="comfortable"
          mandatory
          rounded="xl"
        >
          <v-btn
            v-for="tab in navItems"
            :key="tab.id"
            :value="tab.id"
            size="large"
          >
            <v-icon :icon="tab.icon" start />
            {{ tab.label }}
          </v-btn>
        </v-btn-toggle>
      </div>
    </v-card>

    <v-card class="pa-4 mb-4">
      <v-row class="align-center" dense>
        <v-col cols="12" md="4">
          <v-select
            :items="templateOptions"
            :model-value="activeTemplate?.id ?? ''"
            item-title="title"
            item-value="value"
            label="Template"
            @update:model-value="planner.selectTemplate(String($event ?? ''))"
          />
        </v-col>
        <v-col cols="6" md="2">
          <v-btn block color="primary" variant="tonal" @click="planner.createTemplate()">New</v-btn>
        </v-col>
        <v-col cols="6" md="2">
          <v-btn block variant="tonal" @click="planner.duplicateTemplate(activeTemplate?.id ?? '')">Duplicate</v-btn>
        </v-col>
        <v-col cols="6" md="2">
          <v-btn block color="error" variant="text" :disabled="!canDeleteTemplate" @click="deleteActiveTemplate()">Delete</v-btn>
        </v-col>
        <v-col cols="6" md="2">
          <v-btn block variant="text" @click="planner.clearActiveTemplate()">Clear</v-btn>
        </v-col>
      </v-row>
    </v-card>

    <template v-if="activeTab === 'planner'">
      <v-row dense>
        <v-col cols="12" lg="5">
          <v-card class="pa-5 fill-height">
            <div class="d-flex align-center justify-space-between mb-4">
              <div>
                <div class="text-overline text-medium-emphasis">Weekly Setup</div>
                <h2 class="text-h5 mb-0">Template and application</h2>
              </div>
              <v-icon icon="mdi-calendar-range" />
            </div>

            <v-text-field
              v-model="templateNameDraft"
              label="Template name"
              placeholder="Weekly template name"
              class="mb-4"
              @blur="saveTemplateName()"
              @keyup.enter="saveTemplateName()"
            />

            <v-text-field
              :model-value="visibleMonthLabel"
              label="Visible month"
              class="mb-4"
              readonly
            />

            <div class="text-body-2 text-medium-emphasis mb-3">
              Pick the week starts you want to activate in this month. Only valid week-start dates are selectable.
            </div>

            <v-date-picker
              v-model="selectedWeekDates"
              color="primary"
              multiple
              rounded="xl"
              show-adjacent-months
              show-week
              :allowed-dates="(date: unknown) => visibleMonthWeekStartDateSet.has(new Date(date as string | Date).toISOString().slice(0, 10))"
              :events="visibleMonthWeekStartDates"
              event-color="secondary"
              :month="calendarMonth"
              :year="calendarYear"
              @update:month="calendarMonth = Number($event)"
              @update:year="calendarYear = Number($event)"
            />

            <div class="d-flex flex-wrap ga-2 mt-4">
              <v-chip
                v-for="week in selectedWeekLabels"
                :key="week.date"
                color="primary"
                size="small"
                variant="tonal"
              >
                {{ week.label }}
              </v-chip>
            </div>

            <v-btn block class="mt-4" color="primary" @click="applyTemplateToMonth()">Apply selected weeks</v-btn>
          </v-card>
        </v-col>

        <v-col cols="12" lg="7">
          <v-card class="pa-5">
            <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
              <div>
                <div class="text-overline text-medium-emphasis">Daily Setup</div>
                <h2 class="text-h5 mb-0">{{ selectedDayName }}</h2>
              </div>
              <v-chip
                v-if="selectedPlannerCategory"
                :color="selectedPlannerCategory.category.color"
                variant="tonal"
              >
                {{ selectedPlannerCategory.category.name }} · {{ selectedDayHours }}h planned
              </v-chip>
            </div>

            <div class="text-body-2 text-medium-emphasis mb-4">
              Select a category first, then choose the hours you want for the selected day.
            </div>

            <v-sheet border class="pa-3 rounded-xl mb-4">
              <div class="text-subtitle-2 mb-3">Categories</div>
              <div class="category-strip">
                <v-btn
                  v-for="item in plannerCategories"
                  :key="item.category.id"
                  :color="item.category.color"
                  :variant="selectedCategoryId === item.category.id ? 'flat' : 'tonal'"
                  class="justify-space-between text-none"
                  min-width="180"
                  @click="selectedCategoryId = item.category.id"
                >
                  <span>{{ item.category.name }}</span>
                  <span class="text-caption ml-3">{{ item.hours }}h</span>
                </v-btn>
              </div>
            </v-sheet>

            <v-row dense class="mb-2">
              <v-col cols="12" sm="5">
                <v-select
                  v-model="selectedDayIndex"
                  :items="dayOptions"
                  item-title="title"
                  item-value="value"
                  label="Day"
                />
              </v-col>
            </v-row>

            <v-sheet border class="pa-3 rounded-xl">
              <div class="d-flex align-center justify-space-between mb-3">
                <div>
                  <div class="text-subtitle-1 font-weight-medium">{{ selectedDayName }}</div>
                  <div class="text-body-2 text-medium-emphasis">{{ selectedDayHours }}h planned</div>
                </div>
              </div>

              <div class="hour-grid">
                <v-btn
                  v-for="hour in HOURS"
                  :key="`${selectedDayName}-${hour}`"
                  :color="getHourColor(hour)"
                  :disabled="!selectedPlannerCategory"
                  :variant="getHourVariant(hour)"
                  class="text-caption"
                  size="small"
                  @click="toggleSlot(hour)"
                >
                  {{ String(hour).padStart(2, '0') }}
                </v-btn>
              </div>
            </v-sheet>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <template v-else-if="activeTab === 'insights'">
      <v-row dense>
        <v-col cols="12" md="6">
          <v-card class="pa-5 fill-height">
            <div class="text-overline text-medium-emphasis">Time allocated</div>
            <div class="text-h4 font-weight-bold mb-4">{{ allocatedHours }} / {{ TOTAL_WEEK_HOURS }}h</div>
            <v-progress-linear
              :model-value="(allocatedHours / TOTAL_WEEK_HOURS) * 100"
              color="primary"
              height="10"
              rounded
            />
            <div class="text-body-2 text-medium-emphasis mt-4">
              {{ TOTAL_WEEK_HOURS - allocatedHours }}h still open in the current week.
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="pa-5 fill-height">
            <div class="text-overline text-medium-emphasis">Category totals</div>
            <h2 class="text-h5 mb-4">Weekly breakdown</h2>
            <v-list class="py-0" lines="one">
              <v-list-item v-for="item in categoryBreakdown" :key="item.category.id" class="px-0">
                <template #prepend>
                  <span class="color-dot mr-3" :style="{ backgroundColor: item.category.color ?? '#d6d3d1' }" />
                </template>
                <v-list-item-title>{{ item.category.name }}</v-list-item-title>
                <template #append>
                  <strong>{{ item.hours }}h</strong>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <v-col cols="12" lg="7">
          <v-card class="pa-5 fill-height">
            <div class="text-overline text-medium-emphasis">Activities</div>
            <h2 class="text-h5 mb-4">Weekly breakdown</h2>
            <div class="d-grid ga-4">
              <div v-for="item in activityBreakdown" :key="item.activity.id">
                <div class="d-flex justify-space-between text-body-2 mb-2">
                  <span>{{ item.activity.name }}</span>
                  <strong>{{ item.hours }}h</strong>
                </div>
                <v-progress-linear
                  :color="getActivityColor(item.activity.id)"
                  :model-value="(item.hours / TOTAL_WEEK_HOURS) * 100"
                  height="10"
                  rounded
                />
              </div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" lg="5">
          <v-card class="pa-5 fill-height">
            <div class="text-overline text-medium-emphasis">Projection</div>
            <h2 class="text-h5 mb-4">Compound effect</h2>
            <div class="d-grid ga-3">
              <v-sheet
                v-for="item in projectionSummaries"
                :key="item.activity.id"
                border
                class="pa-4 rounded-lg"
              >
                <div class="d-flex align-center ga-3 mb-2">
                  <span class="color-dot" :style="{ backgroundColor: getActivityColor(item.activity.id) }" />
                  <strong>{{ item.activity.name }}</strong>
                </div>
                <div class="text-h5 font-weight-bold">{{ item.hours.toLocaleString() }}h</div>
                <div class="text-body-2 text-medium-emphasis">{{ projectionInsight(item.hours) }}</div>
              </v-sheet>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12">
          <v-card class="pa-5">
            <div class="text-overline text-medium-emphasis">Daily distribution</div>
            <h2 class="text-h5 mb-4">Category load by day</h2>
            <v-row dense>
              <v-col v-for="day in categoryDailyHours" :key="day.day" cols="12" sm="6" md="4" lg>
                <v-sheet border class="pa-4 rounded-xl fill-height">
                  <div class="text-subtitle-1 font-weight-medium mb-3">{{ day.day }}</div>
                  <div class="d-grid ga-2">
                    <div v-for="item in day.totals" :key="item.category.id">
                      <div class="d-flex justify-space-between text-body-2 mb-1">
                        <span>{{ item.category.name }}</span>
                        <span>{{ item.hours }}h</span>
                      </div>
                      <v-progress-linear
                        :color="item.category.color"
                        :model-value="(item.hours / 24) * 100"
                        height="8"
                        rounded
                      />
                    </div>
                  </div>
                </v-sheet>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <v-row dense>
        <v-col cols="12" lg="6">
          <v-card class="pa-5 fill-height">
            <div class="text-overline text-medium-emphasis">Activities</div>
            <h2 class="text-h5 mb-4">Manage activities</h2>

            <v-form @submit.prevent="addActivity()">
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
                    item-title="title"
                    item-value="value"
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
                    :title="`Delete ${activity.name}`"
                    color="error"
                    icon="mdi-delete-outline"
                    variant="text"
                    @click="removeActivity(activity.id)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <v-col cols="12" lg="6">
          <v-card class="pa-5 fill-height">
            <div class="text-overline text-medium-emphasis">Categories</div>
            <h2 class="text-h5 mb-4">Manage categories</h2>

            <v-form @submit.prevent="addCategory()">
              <v-text-field v-model.trim="newCategoryName" class="mb-4" label="Category name" required />

              <div class="text-subtitle-2 mb-2">Color</div>
              <div class="d-flex flex-wrap ga-2 mb-4">
                <v-btn
                  v-for="color in COLORS"
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
  </v-container>
</template>

<style scoped>
.hero-copy {
  max-width: 680px;
}

.category-strip {
  display: grid;
  gap: 0.75rem;
  grid-auto-flow: column;
  grid-auto-columns: minmax(180px, 1fr);
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.hour-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.color-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
  display: inline-block;
  flex: none;
}

@media (min-width: 960px) {
  .hour-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .hour-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
}
</style>
