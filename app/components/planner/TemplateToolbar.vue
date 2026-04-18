<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlannerStore } from '~/stores/planner'

const planner = usePlannerStore()
const { activeTemplate, templates } = storeToRefs(planner)

const templateNameDraft = ref('')
const canDeleteTemplate = computed(() => templates.value.length > 1)
const templateOptions = computed(() => templates.value.map(t => ({ title: t.name, value: t.id })))

const saveTemplateName = () => {
  planner.renameActiveTemplate(templateNameDraft.value)
  templateNameDraft.value = activeTemplate.value?.name ?? ''
}

const deleteActive = () => {
  if (!activeTemplate.value) return
  planner.deleteTemplate(activeTemplate.value.id)
}

watch(activeTemplate, () => {
  templateNameDraft.value = activeTemplate.value?.name ?? ''
}, { immediate: true })
</script>

<template>
  <v-card class="pa-4">
    <v-row align="center" dense>
      <v-col cols="12" sm="4">
        <v-select
          :items="templateOptions"
          :model-value="activeTemplate?.id ?? ''"
          label="Template"
          @update:model-value="planner.selectTemplate(String($event ?? ''))"
        />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          v-model="templateNameDraft"
          label="Name"
          @blur="saveTemplateName"
          @keyup.enter="saveTemplateName"
        />
      </v-col>
      <v-col cols="12" sm="4">
        <div class="d-flex flex-wrap ga-2">
          <v-btn color="primary" variant="tonal" @click="planner.createTemplate()">New</v-btn>
          <v-btn variant="tonal" @click="planner.duplicateTemplate(activeTemplate?.id ?? '')">Copy</v-btn>
          <v-btn variant="text" @click="planner.clearActiveTemplate()">Clear</v-btn>
          <v-btn color="error" variant="text" :disabled="!canDeleteTemplate" @click="deleteActive">Delete</v-btn>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>
