<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { DESIGN_COLORS } from '~/utils/planner'
import type { Category } from '~/types/planner'

/** Only this many categories fill the Goals grid */
const GOAL_GRID_SIZE = 8

const planner = usePlannerStore()
const { categoryMap } = usePlannerMaps()

const orderedCategories = computed(() => [...planner.categories].sort((a, b) => a.order - b.order))

// Category rename
const renamingCatId = ref<string | null>(null)
const renameBuffer = ref('')
const colorPickerFor = ref<string | null>(null)

function startRename(catId: string, name: string) {
  renamingCatId.value = catId
  renameBuffer.value = name
}

function commitRename(catId: string) {
  if (renamingCatId.value !== catId) return
  if (renameBuffer.value.trim()) planner.updateCategory(catId, { name: renameBuffer.value.trim() })
  renamingCatId.value = null
}

function setCategoryColor(catId: string, color: string) {
  planner.setCategoryColor(catId, color)
  colorPickerFor.value = null
}

// Category removal: empty categories go at once, others first hand their contents to another category
const removingId = ref<string | null>(null)
const moveToId = ref('')

const activityCount = (categoryId: string) => planner.activities.filter(activity => activity.categoryId === categoryId).length
const habitCount = (categoryId: string) => planner.habits.filter(habit => habit.categoryId === categoryId).length

const plural = (count: number, singular: string, pluralForm: string) => `${count} ${count === 1 ? singular : pluralForm}`

const contentSummary = (categoryId: string) => {
  const parts: string[] = []
  if (activityCount(categoryId)) parts.push(plural(activityCount(categoryId), 'activity', 'activities'))
  if (habitCount(categoryId)) parts.push(plural(habitCount(categoryId), 'habit', 'habits'))
  return parts.join(' and ')
}

const otherCategories = (categoryId: string) => orderedCategories.value.filter(category => category.id !== categoryId)

function askRemove(cat: Category) {
  if (!activityCount(cat.id) && !habitCount(cat.id)) {
    planner.removeCategory(cat.id)
    return
  }

  removingId.value = cat.id
  moveToId.value = otherCategories(cat.id)[0]?.id ?? ''
}

function confirmRemove(catId: string) {
  if (planner.removeCategory(catId, moveToId.value)) removingId.value = null
}

// New category form
const newCatName = ref('')
const newCatColor = ref(DESIGN_COLORS[0]!.bg)
const newCatPreviewLabel = computed(() => newCatName.value.trim() || 'New Category')

function addCategory() {
  if (!newCatName.value.trim()) return
  planner.addCategory(newCatName.value, newCatColor.value)
  newCatName.value = ''
}

// New activity form
const newActName = ref('')
const newActCode = ref('')
const newActCatId = ref(planner.categories[0]?.id ?? '')

watch(
  () => planner.categories,
  () => { if (!newActCatId.value) newActCatId.value = planner.categories[0]?.id ?? '' },
  { immediate: true }
)

function addActivity() {
  if (!newActName.value.trim() || !newActCode.value.trim() || !newActCatId.value) return
  planner.addActivity(newActName.value, newActCode.value, newActCatId.value)
  newActName.value = ''
  newActCode.value = ''
}

// Hours per week from active template
const catHoursPerWeek = computed(() => {
  const map = new Map<string, number>()
  if (!planner.activeTemplate) return map
  for (const slot of planner.activeTemplate.slots) {
    if (!slot) continue
    const act = planner.activities.find(a => a.id === slot)
    if (!act) continue
    map.set(act.categoryId, (map.get(act.categoryId) ?? 0) + 1)
  }
  return map
})

const actHoursPerWeek = computed(() => {
  const map = new Map<string, number>()
  if (!planner.activeTemplate) return map
  for (const slot of planner.activeTemplate.slots) {
    if (slot) map.set(slot, (map.get(slot) ?? 0) + 1)
  }
  return map
})

const projYears = computed({
  get: () => planner.settings.projectionDefaults.years,
  set: (v: number) => planner.setProjectionYears(v)
})

function closePopovers() {
  colorPickerFor.value = null
}
</script>

<template>
  <div class="view" @click="closePopovers">
    <header class="page-head">
      <h1 class="page-title">Categories and activities</h1>
      <p class="page-lede">
        The building blocks of your week. Each category is one of your life areas, with its goals in Goals.
        Changes apply to every template and projection. Double-click a category name to rename it.
      </p>
    </header>

    <div class="config-grid">
      <!-- Left: lists -->
      <div>
        <section>
          <div class="list-head">
            <h2 class="section-title">Categories</h2>
          </div>
          <div class="cat-list">
            <template v-for="(cat, index) in orderedCategories" :key="cat.id">
              <div class="cat-row cat-row-category" @click.stop>
                <!-- Colour swatch, opens the colour picker -->
                <div class="swatch-wrap">
                  <button
                    class="big-swatch"
                    :style="{ background: cat.color ?? '#888' }"
                    title="Change colour"
                    aria-label="Change colour"
                    @click.stop="colorPickerFor = colorPickerFor === cat.id ? null : cat.id"
                  />
                  <div v-if="colorPickerFor === cat.id" class="color-pop" @click.stop>
                    <button
                      v-for="dc in DESIGN_COLORS"
                      :key="dc.id"
                      :style="{ background: dc.bg }"
                      :data-active="cat.color === dc.bg"
                      :aria-label="`Colour ${dc.id}`"
                      @click="setCategoryColor(cat.id, dc.bg)"
                    />
                  </div>
                </div>

                <!-- Name -->
                <div class="cat-name-wrap">
                  <input
                    v-if="renamingCatId === cat.id"
                    v-model="renameBuffer"
                    class="cat-name-input"
                    aria-label="Category name"
                    @keydown.enter="commitRename(cat.id)"
                    @keydown.escape="renamingCatId = null"
                    @blur="commitRename(cat.id)"
                    @click.stop
                  />
                  <span
                    v-else
                    class="cat-row-name"
                    title="Double-click to rename"
                    @dblclick.stop="startRename(cat.id, cat.name)"
                  >{{ cat.name }}</span>
                  <span class="cat-meta">
                    {{ plural(activityCount(cat.id), 'activity', 'activities') }}<template v-if="habitCount(cat.id)"> · {{ plural(habitCount(cat.id), 'habit', 'habits') }}</template>
                  </span>
                </div>

                <!-- Hours: per week and per year -->
                <div class="cat-hrs">
                  <span class="n">{{ catHoursPerWeek.get(cat.id) ?? 0 }}</span> h/wk ·
                  <span class="n">{{ Math.round((catHoursPerWeek.get(cat.id) ?? 0) * 52) }}</span> h/yr
                </div>

                <div class="cat-actions">
                  <button
                    class="btn btn-xs"
                    title="Move up"
                    aria-label="Move up"
                    :disabled="index === 0"
                    @click.stop="planner.moveCategory(cat.id, -1)"
                  >↑</button>
                  <button
                    class="btn btn-xs"
                    title="Move down"
                    aria-label="Move down"
                    :disabled="index === orderedCategories.length - 1"
                    @click.stop="planner.moveCategory(cat.id, 1)"
                  >↓</button>
                  <button
                    class="btn btn-xs btn-danger"
                    title="Delete category"
                    aria-label="Delete category"
                    @click.stop="askRemove(cat)"
                  >✕</button>
                </div>
              </div>

              <div v-if="removingId === cat.id" class="cat-remove" @click.stop>
                <p class="cat-remove-note">
                  Its {{ contentSummary(cat.id) }} must move to another category before {{ cat.name }} is removed.
                </p>
                <div v-if="otherCategories(cat.id).length" class="cat-remove-row">
                  <select v-model="moveToId" class="timely-select" aria-label="Move contents to">
                    <option v-for="other in otherCategories(cat.id)" :key="other.id" :value="other.id">{{ other.name }}</option>
                  </select>
                  <button class="btn btn-xs btn-primary" :disabled="!moveToId" @click="confirmRemove(cat.id)">Move and remove</button>
                  <button class="btn btn-xs" @click="removingId = null">Cancel</button>
                </div>
                <p v-else class="cat-remove-note">Add another category first, then remove this one.</p>
              </div>
            </template>
          </div>
          <p v-if="orderedCategories.length > GOAL_GRID_SIZE" class="config-note">
            Only the first {{ GOAL_GRID_SIZE }} categories appear in the Goals grid. The others still work in Planner and Insights.
          </p>
        </section>

        <section class="section">
          <div class="list-head">
            <h2 class="section-title">Activities</h2>
          </div>
          <div class="cat-list">
            <div v-for="act in planner.activities" :key="act.id" class="cat-row">
              <span class="dot dot-lg" :style="{ background: act.color ?? '#888' }" />
              <div class="cat-name-wrap">
                <span class="cat-row-name is-activity">{{ act.name }}</span>
                <span class="cat-meta">{{ act.shortCode }} · {{ categoryMap.get(act.categoryId)?.name ?? '—' }}</span>
              </div>
              <div class="cat-hrs">
                <span class="n">{{ actHoursPerWeek.get(act.id) ?? 0 }}</span> h/wk ·
                <span class="n">{{ Math.round((actHoursPerWeek.get(act.id) ?? 0) * 52) }}</span> h/yr
              </div>
              <div class="cat-actions">
                <button
                  class="btn btn-xs btn-danger"
                  title="Delete activity"
                  aria-label="Delete activity"
                  @click="planner.removeActivity(act.id)"
                >✕</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Right: forms -->
      <aside>
        <div class="form-section">
          <h2 class="section-title">New category</h2>

          <div class="new-cat-preview" :style="{ '--c': newCatColor }">
            <span class="dot dot-lg" :style="{ background: newCatColor }" />
            <span>{{ newCatPreviewLabel }}</span>
          </div>

          <div class="form-stack">
            <div class="field">
              <label class="field-label" for="new-cat-name">Name</label>
              <input
                id="new-cat-name"
                v-model="newCatName"
                class="timely-input"
                placeholder="e.g. Wellness"
                @keydown.enter="addCategory"
              />
            </div>

            <div class="field">
              <span class="field-label">Colour</span>
              <div class="color-pop color-pop-inline" @click.stop>
                <button
                  v-for="dc in DESIGN_COLORS"
                  :key="dc.id"
                  :style="{ background: dc.bg }"
                  :data-active="newCatColor === dc.bg"
                  :aria-label="`Colour ${dc.id}`"
                  @click="newCatColor = dc.bg"
                />
              </div>
            </div>
          </div>

          <button class="btn btn-primary btn-block" :disabled="!newCatName.trim()" @click="addCategory">
            Add category
          </button>
        </div>

        <div class="form-section">
          <h2 class="section-title">New activity</h2>

          <div class="form-stack">
            <div class="field">
              <label class="field-label" for="new-act-name">Name</label>
              <input id="new-act-name" v-model="newActName" class="timely-input" placeholder="e.g. Meditation" />
            </div>

            <div class="form-row">
              <div class="field">
                <label class="field-label" for="new-act-code">Short code</label>
                <input
                  id="new-act-code"
                  v-model="newActCode"
                  class="timely-input"
                  placeholder="MED"
                  maxlength="3"
                />
              </div>
              <div class="field">
                <label class="field-label" for="new-act-cat">Category</label>
                <select id="new-act-cat" v-model="newActCatId" class="timely-select">
                  <option v-for="cat in orderedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <button
            class="btn btn-primary btn-block"
            :disabled="!newActName.trim() || !newActCode.trim() || !newActCatId"
            @click="addActivity"
          >
            Add activity
          </button>
        </div>

        <div class="form-section">
          <h2 class="section-title">Projection</h2>
          <div class="field">
            <label class="field-label" for="projection-horizon">Horizon</label>
            <select id="projection-horizon" v-model.number="projYears" class="timely-select">
              <option :value="1">1 year</option>
              <option :value="3">3 years</option>
              <option :value="5">5 years</option>
              <option :value="10">10 years</option>
            </select>
          </div>
          <p class="form-note">Excluded statuses: vacation and off.</p>
        </div>
      </aside>
    </div>
  </div>
</template>
