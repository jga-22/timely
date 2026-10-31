<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'
import { PRESETS, PRESET_ROLES, ROLE_LABELS, getPreset, matchRole, type PresetRole } from '~/utils/presets'
import { focusEditField } from '~/utils/focus'

/**
 * The New week type panel (FR-TPL-2, 6, 8): a name and a Start from choice (empty, a copy of a week type, or a preset with its role
 * mapping and habit switch). It is mounted when it opens, so each opening starts from the defaults. created reports the new week type;
 * close is Cancel, Escape and a closed panel without a week type.
 */
const emit = defineEmits<{ close: []; created: [templateId: string, kind?: 'break'] }>()

const planner = usePlannerStore()
const { activeTemplate, templates } = storeToRefs(planner)

const newTemplateName = ref('')
const newTemplateInput = ref<HTMLInputElement | null>(null)
const newTemplatePanel = ref<HTMLElement | null>(null)
const newFrom = ref('empty')
const keepHabits = ref(true)
// Role mapping for a preset: an activity id, 'create' (a new activity) or '' (leave the role's hours empty)
const roleChoice = reactive<Record<PresetRole, string>>({ sleep: '', work: '', exercise: '' })
const newPreset = computed(() => (newFrom.value.startsWith('preset:') ? getPreset(newFrom.value.slice(7)) ?? null : null))
// Only the roles the preset paints get a mapping row: Vacation maps Sleep alone
const newPresetRoles = computed(() => PRESET_ROLES.filter(role => newPreset.value?.blocks.some(block => block.role === role)))

// Presets start from the activities they match by name; a role with no match is created (Sleep, Work) or left empty (Exercise)
watch(newFrom, (value) => {
  const preset = value.startsWith('preset:') ? getPreset(value.slice(7)) : undefined
  if (!preset) return

  keepHabits.value = preset.keepHabitsDefault
  for (const role of PRESET_ROLES) {
    roleChoice[role] = matchRole(planner.$state, role) ?? (role === 'exercise' ? '' : 'create')
  }
})

// The name field takes focus on a desktop; a phone keeps the keyboard down (FR-UX-9)
onMounted(() => focusEditField(newTemplateInput.value, newTemplatePanel.value))

function close() {
  emit('close')
}

function handleNewTemplate() {
  const name = newTemplateName.value.trim()
  const from = newFrom.value
  const preset = newPreset.value
  let templateId: string | null = null

  if (from === 'empty') {
    planner.createTemplate()
    if (name) planner.renameActiveTemplate(name)
    templateId = activeTemplate.value?.id ?? null
  } else if (from.startsWith('copy:')) {
    templateId = planner.duplicateTemplate(from.slice(5), name)
  } else if (preset) {
    // Roles the preset does not paint are sent as null, so no activity is created for them
    const mapping = Object.fromEntries(PRESET_ROLES.map(role => [role, newPresetRoles.value.includes(role) && roleChoice[role] !== '' ? roleChoice[role] : null])) as Record<PresetRole, string | 'create' | null>
    templateId = planner.createTemplateFromPreset(name, preset.id, mapping, keepHabits.value)
  }

  if (!templateId) return

  emit('created', templateId, preset?.kind)
}
</script>

<template>
  <div ref="newTemplatePanel" class="act-panel new-template-panel" tabindex="-1" @keydown.escape.stop="close">
    <div class="act-panel-head">
      <h3 class="act-panel-title">New week type</h3>
    </div>
    <div class="form-stack">
      <div class="field">
        <label class="field-label" for="new-template-name">Name</label>
        <input
          id="new-template-name"
          ref="newTemplateInput"
          v-model="newTemplateName"
          class="timely-input"
          placeholder="e.g. Launch week"
          @keydown.enter.prevent="handleNewTemplate"
        />
      </div>

      <div class="field">
        <label class="field-label" for="new-template-from">Start from</label>
        <select id="new-template-from" v-model="newFrom" class="timely-select">
          <option value="empty">Empty</option>
          <option v-for="t in templates" :key="t.id" :value="`copy:${t.id}`">Copy of {{ t.name }}</option>
          <option v-for="p in PRESETS" :key="p.id" :value="`preset:${p.id}`">{{ p.name }}</option>
        </select>
      </div>

      <template v-if="newPreset">
        <p class="new-template-lede">{{ newPreset.description }}</p>

        <div class="role-rows">
          <div v-for="role in newPresetRoles" :key="role" class="role-row">
            <label class="field-label role-label" :for="`role-${role}`">{{ ROLE_LABELS[role] }}</label>
            <select :id="`role-${role}`" v-model="roleChoice[role]" class="timely-select">
              <option v-for="act in planner.activities" :key="act.id" :value="act.id">{{ act.name }}</option>
              <option value="create">Create "{{ ROLE_LABELS[role] }}"</option>
              <option value="">Leave empty</option>
            </select>
          </div>
        </div>

        <label class="check">
          <input v-model="keepHabits" type="checkbox" />
          Keep my habit sessions
        </label>
      </template>
    </div>

    <div class="act-actions">
      <button class="btn btn-sm btn-primary" @click="handleNewTemplate">Add week type</button>
      <button class="btn btn-sm" @click="close">Cancel</button>
    </div>
  </div>
</template>
