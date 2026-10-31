<script setup lang="ts">
import { DAYS, formatHour } from '~/utils/planner'
import { rangeLabel, type Range } from '~/utils/weekGrid'

/**
 * The action bar of the week grid (FR-PLAN-23). On an empty run: Apply… and Cancel. On a block: Change…, Edit (the entry's form, the pencil),
 * Delete, Save (enabled once an edge has moved) and Cancel. It opens where the parent sets pos (beside the release point, or at the bottom
 * on phones). The parent focuses its first button through el.
 */
defineProps<{ selection: Range; pos: { x: number; y: number }; hasActivity: boolean; canSave: boolean }>()
defineEmits<{ pick: []; edit: []; delete: []; save: []; cancel: [] }>()

const el = ref<HTMLElement | null>(null)
defineExpose({ el })
</script>

<template>
  <div
    ref="el"
    class="wk-pop wk-bar"
    role="group"
    :aria-label="`Selected ${rangeLabel(selection)}`"
    :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    @click.stop
  >
    <div class="wk-pop-head">
      <span class="wk-pop-day">{{ DAYS[selection.day] }}</span>
      <span class="wk-pop-range">{{ formatHour(selection.start) }} – {{ formatHour(selection.end) }}</span>
      <span class="wk-pop-dur">{{ selection.end - selection.start }}h</span>
    </div>
    <div class="wk-pop-actions">
      <button type="button" class="btn btn-sm btn-primary" @click="$emit('pick')">
        {{ hasActivity ? 'Change…' : 'Apply…' }}
      </button>
      <EditButton v-if="hasActivity" label="Edit activity" @click="$emit('edit')" />
      <button v-if="hasActivity" type="button" class="btn btn-sm btn-danger" @click="$emit('delete')">Delete</button>
      <button v-if="hasActivity" type="button" class="btn btn-sm btn-outline" :disabled="!canSave" @click="$emit('save')">Save</button>
      <button type="button" class="btn btn-sm btn-ghost" @click="$emit('cancel')">Cancel</button>
    </div>
  </div>
</template>
