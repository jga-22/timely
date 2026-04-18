<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Activity, Category } from '~/types/planner'
import { DAYS } from '~/utils/planner'
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'

const HOUR_SLOTS = Array.from({ length: 24 }, (_, i) => i)

const planner = usePlannerStore()
const { activeTemplate, appliedWeeks } = storeToRefs(planner)
const { activityMap, getActivityColor } = usePlannerMaps()

const selectedCategoryId = ref('')
const selectedDayIndex = ref(0)
const calendarMonth = ref(new Date().getMonth())
const calendarYear = ref(new Date().getFullYear())
const selectedWeekDates = ref<string[]>([])

const dayOptions = computed(() => DAYS.map((day, index) => ({ title: day, value: index })))

const plannerCategories = computed(() =>
  planner.categories.map(category => ({
    category,
    activity: planner.activities.find(a => a.categoryId === category.id),
    hours: activeTemplate.value?.slots.reduce((total, slot) => {
      const activity = activityMap.value.get(slot)
      return total + (activity?.categoryId === category.id ? 1 : 0)
    }, 0) ?? 0
  })).filter((item): item is { category: Category, activity: Activity, hours: number } => Boolean(item.activity))
)

const selectedPlannerCategory = computed(() =>
  plannerCategories.value.find(item => item.category.id === selectedCategoryId.value)
)

const visibleMonthWeekStartDates = computed(() => {
  const monthStart = new Date(Date.UTC(calendarYear.value, calendarMonth.value, 1))
  const monthEnd = new Date(Date.UTC(calendarYear.value, calendarMonth.value + 1, 0))
  const offset = (monthStart.getUTCDay() + 6) % 7
  const cursor = new Date(monthStart)
  cursor.setUTCDate(monthStart.getUTCDate() - offset)

  const weeks: string[] = []
  while (cursor <= monthEnd || cursor.getUTCDate() <= 7) {
    weeks.push(new Date(cursor).toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 7)
    if (weeks.length > 5) break
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

const selectedWeekLabels = computed(() =>
  selectedWeekDates.value.slice().sort().map(date => {
    const start = new Date(`${date}T00:00:00Z`)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 6)
    return {
      date,
      label: `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
    }
  })
)

const selectedDayName = computed(() => DAYS[selectedDayIndex.value] ?? DAYS[0])
const selectedDayHours = computed(() =>
  activeTemplate.value?.slots.slice(selectedDayIndex.value * 24, (selectedDayIndex.value + 1) * 24).filter(Boolean).length ?? 0
)

const getSlot = (dayIndex: number, hour: number) =>
  activeTemplate.value?.slots[(dayIndex * 24) + hour] ?? ''

const isSelectedHour = (hour: number) =>
  getSlot(selectedDayIndex.value, hour) === selectedPlannerCategory.value?.activity.id

const getHourColor = (hour: number) => {
  const slot = getSlot(selectedDayIndex.value, hour)
  return slot ? getActivityColor(slot) : selectedPlannerCategory.value?.category.color ?? 'secondary'
}

const getHourVariant = (hour: number): 'flat' | 'tonal' | 'outlined' => {
  if (isSelectedHour(hour)) return 'flat'
  if (getSlot(selectedDayIndex.value, hour)) return 'tonal'
  return 'outlined'
}

const toggleSlot = (hour: number) => {
  const activityId = selectedPlannerCategory.value?.activity.id
  if (!activityId) return
  const current = getSlot(selectedDayIndex.value, hour)
  planner.setSlot(selectedDayIndex.value, hour, current === activityId ? '' : activityId)
}

const applyTemplateToMonth = () => {
  if (!activeTemplate.value) return
  planner.setTemplateApplications(
    activeTemplate.value.id,
    selectedWeekDates.value,
    visibleMonthWeekStartDates.value
  )
}

watch(
  [activeTemplate, () => planner.activities.map(a => a.id), () => planner.categories.map(c => c.id)],
  () => {
    if (!plannerCategories.value.some(item => item.category.id === selectedCategoryId.value)) {
      selectedCategoryId.value = plannerCategories.value[0]?.category.id ?? ''
    }
  },
  { immediate: true }
)

watch(
  [calendarMonth, calendarYear, activeTemplate, appliedWeeks],
  () => {
    selectedWeekDates.value = visibleMonthWeekStartDates.value.filter(d => appliedWeekStartDates.value.has(d))
  },
  { immediate: true }
)
</script>

<template>
  <v-row dense>
    <!-- Left: Week Application -->
    <v-col cols="12" lg="5">
      <v-card class="pa-5 fill-height">
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <div class="text-overline text-medium-emphasis">Week Application</div>
            <h2 class="text-h5 mb-0">Apply to calendar</h2>
          </div>
          <v-icon icon="mdi-calendar-range" />
        </div>

        <p class="text-body-2 text-medium-emphasis mb-4">
          Select week-start dates to apply this template. Only Monday-start weeks are selectable.
        </p>

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

        <div v-if="selectedWeekLabels.length" class="d-flex flex-wrap ga-2 mt-4">
          <v-chip
            v-for="week in selectedWeekLabels"
            :key="week.date"
            color="primary"
            size="small"
            variant="tonal"
            closable
            @click:close="selectedWeekDates = selectedWeekDates.filter(d => d !== week.date)"
          >
            {{ week.label }}
          </v-chip>
        </div>

        <v-btn block class="mt-4" color="primary" @click="applyTemplateToMonth">
          <v-icon start icon="mdi-check" />
          Apply selected weeks
        </v-btn>
      </v-card>
    </v-col>

    <!-- Right: Day Editor -->
    <v-col cols="12" lg="7">
      <v-card class="pa-5">
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-2">
          <div>
            <div class="text-overline text-medium-emphasis">Day Editor</div>
            <h2 class="text-h5 mb-0">{{ selectedDayName }}</h2>
          </div>
          <v-chip v-if="selectedPlannerCategory" :color="selectedPlannerCategory.category.color" variant="tonal">
            {{ selectedPlannerCategory.category.name }} · {{ selectedDayHours }}h planned
          </v-chip>
        </div>

        <p class="text-body-2 text-medium-emphasis mb-4">
          Select a category below, then click the hours you want to assign.
        </p>

        <v-sheet border class="pa-3 rounded-xl mb-4">
          <div class="text-subtitle-2 mb-3">Categories</div>
          <div class="category-palette">
            <v-btn
              v-for="item in plannerCategories"
              :key="item.category.id"
              :color="item.category.color"
              :variant="selectedCategoryId === item.category.id ? 'flat' : 'tonal'"
              class="text-none"
              @click="selectedCategoryId = item.category.id"
            >
              {{ item.category.name }}
              <span class="text-caption ml-2 opacity-70">{{ item.hours }}h</span>
            </v-btn>
          </div>
        </v-sheet>

        <v-row dense class="mb-3">
          <v-col cols="12" sm="5">
            <v-select v-model="selectedDayIndex" :items="dayOptions" label="Day" />
          </v-col>
        </v-row>

        <v-sheet border class="pa-3 rounded-xl">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-medium">{{ selectedDayName }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ selectedDayHours }}h planned</div>
          </div>
          <div class="hour-grid">
            <v-btn
              v-for="hour in HOUR_SLOTS"
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

<style scoped>
.category-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hour-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(6, minmax(0, 1fr));
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
