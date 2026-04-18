<script setup lang="ts">
import { usePlannerStore } from '~/stores/planner'
import { usePlannerMaps } from '~/composables/usePlannerMaps'
import { DESIGN_COLORS } from '~/utils/planner'

const planner = usePlannerStore()
const { categoryMap } = usePlannerMaps()

// Category rename
const renamingCatId = ref<string | null>(null)
const renameBuffer = ref('')
const colorPickerFor = ref<string | null>(null)

function startRename(catId: string, name: string) {
  renamingCatId.value = catId
  renameBuffer.value = name
}

function commitRename(catId: string) {
  const cat = planner.categories.find(c => c.id === catId)
  if (cat && renameBuffer.value.trim()) cat.name = renameBuffer.value.trim()
  renamingCatId.value = null
}

function setCategoryColor(catId: string, color: string) {
  const cat = planner.categories.find(c => c.id === catId)
  if (cat) {
    cat.color = color
    for (const act of planner.activities) {
      if (act.categoryId === catId) act.color = color
    }
  }
  colorPickerFor.value = null
}

// New category form
const newCatName = ref('')
const newCatColor = ref(DESIGN_COLORS[0].bg)
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

function removeCategory(catId: string) {
  planner.$patch({ categories: planner.categories.filter(c => c.id !== catId) })
}
</script>

<template>
  <div class="view" @click="closePopovers">
    <div class="page-head">
      <div>
        <div class="page-kicker">03 · Configuration</div>
        <h1 class="page-title">Activities &amp; <em>categories</em></h1>
        <p class="page-lede">Manage the building blocks of your week. Changes propagate to all templates and projections.</p>
      </div>
    </div>

    <div class="config-grid">
      <!-- Left: lists -->
      <div>
        <!-- Categories -->
        <div class="panel-sub" style="margin-bottom: 12px">Categories</div>
        <div class="cat-list">
          <div
            v-for="cat in planner.categories"
            :key="cat.id"
            class="cat-row"
            @click.stop
          >
            <!-- Color swatch -->
            <div style="position: relative;">
              <button
                class="big-swatch"
                :style="{ background: cat.color ?? '#888' }"
                :title="`Change color`"
                @click.stop="colorPickerFor = colorPickerFor === cat.id ? null : cat.id"
              />
              <div v-if="colorPickerFor === cat.id" class="color-pop" @click.stop>
                <button
                  v-for="dc in DESIGN_COLORS"
                  :key="dc.id"
                  :style="{ background: dc.bg }"
                  :data-active="cat.color === dc.bg"
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
                {{ planner.activities.filter(a => a.categoryId === cat.id).length }} activities
              </span>
            </div>

            <!-- hr/wk -->
            <div class="cat-hrs">
              <span class="n">{{ catHoursPerWeek.get(cat.id) ?? 0 }}</span> hr/wk
            </div>

            <!-- hr/yr -->
            <div class="cat-hrs">
              <span class="n">{{ Math.round((catHoursPerWeek.get(cat.id) ?? 0) * 52) }}</span> hr/yr
            </div>

            <!-- Actions -->
            <div class="cat-actions">
              <button
                class="btn btn-ghost btn-xs btn-danger"
                title="Delete category"
                @click.stop="removeCategory(cat.id)"
              >✕</button>
            </div>
          </div>
        </div>

        <!-- Activities -->
        <div class="divider-label" style="margin-top: 28px;">Activities</div>
        <div class="cat-list" style="margin-top: 8px;">
          <div v-for="act in planner.activities" :key="act.id" class="cat-row">
            <div class="big-swatch" :style="{ background: act.color ?? '#888', cursor: 'default' }" />
            <div class="cat-name-wrap">
              <span class="cat-row-name" style="font-size: 18px">{{ act.name }}</span>
              <span class="cat-meta">{{ act.shortCode }} · {{ categoryMap.get(act.categoryId)?.name ?? '—' }}</span>
            </div>
            <div class="cat-hrs">
              <span class="n">{{ actHoursPerWeek.get(act.id) ?? 0 }}</span> hr/wk
            </div>
            <div class="cat-hrs">
              <span class="n">{{ Math.round((actHoursPerWeek.get(act.id) ?? 0) * 52) }}</span> hr/yr
            </div>
            <div class="cat-actions">
              <button
                class="btn btn-ghost btn-xs btn-danger"
                title="Delete activity"
                @click="planner.removeActivity(act.id)"
              >✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: forms -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- New category -->
        <div class="card" style="padding: 24px;">
          <div class="panel-sub" style="margin-bottom: 16px;">New category</div>

          <div class="new-cat-preview" :style="{ background: newCatColor + '22', border: `1px solid ${newCatColor}44` }">
            <span class="swatch" :style="{ background: newCatColor }" />
            <span class="label">{{ newCatPreviewLabel }}</span>
          </div>

          <div class="field" style="margin-bottom: 12px;">
            <label class="field-label">Name</label>
            <input
              v-model="newCatName"
              class="timely-input"
              placeholder="e.g. Wellness"
              @keydown.enter="addCategory"
            />
          </div>

          <div class="field" style="margin-bottom: 16px;">
            <label class="field-label">Color</label>
            <div
              class="color-pop"
              style="position: relative; width: 100%; box-shadow: none;"
              @click.stop
            >
              <button
                v-for="dc in DESIGN_COLORS"
                :key="dc.id"
                :style="{ background: dc.bg }"
                :data-active="newCatColor === dc.bg"
                @click="newCatColor = dc.bg"
              />
            </div>
          </div>

          <button
            class="btn btn-primary"
            style="width: 100%;"
            :disabled="!newCatName.trim()"
            @click="addCategory"
          >
            Add category
          </button>
        </div>

        <!-- New activity -->
        <div class="card" style="padding: 24px;">
          <div class="panel-sub" style="margin-bottom: 16px;">New activity</div>

          <div class="field" style="margin-bottom: 12px;">
            <label class="field-label">Name</label>
            <input v-model="newActName" class="timely-input" placeholder="e.g. Meditation" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="field">
              <label class="field-label">Short code</label>
              <input
                v-model="newActCode"
                class="timely-input"
                placeholder="MED"
                maxlength="3"
                style="font-family: var(--font-mono); letter-spacing: 0.1em;"
              />
            </div>
            <div class="field">
              <label class="field-label">Category</label>
              <select v-model="newActCatId" class="timely-select">
                <option v-for="cat in planner.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <button
            class="btn btn-primary"
            style="width: 100%;"
            :disabled="!newActName.trim() || !newActCode.trim() || !newActCatId"
            @click="addActivity"
          >
            Add activity
          </button>
        </div>

        <!-- Projection settings -->
        <div class="card" style="padding: 24px;">
          <div class="panel-sub" style="margin-bottom: 16px;">Projection settings</div>
          <div class="field">
            <label class="field-label">Horizon</label>
            <select v-model.number="projYears" class="timely-select">
              <option :value="1">1 year</option>
              <option :value="3">3 years</option>
              <option :value="5">5 years</option>
              <option :value="10">10 years</option>
            </select>
          </div>
          <p style="font-size: 12px; color: var(--ink-3); margin: 12px 0 0; line-height: 1.5;">
            Excluded statuses: vacation · off
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
