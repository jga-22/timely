<script setup lang="ts">
import type { FirstRunDraft } from '~/utils/firstRun/draft'
import { DAYS } from '~/utils/planner/format'
import { createLifeAreas } from '~/utils/planner/seed'
import { clockLabel } from '~/utils/sleep'

/** The draft's sessions as seven day columns, each block in its life area's colour (the same fill as the Week grid) */
const props = defineProps<{ draft: FirstRunDraft }>()
const { areaVars } = usePlannerFill()
const areas = createLifeAreas()

const dayBlocks = (weekday: number) => props.draft.sessions
  .filter(session => session.weekday === weekday)
  .sort((a, b) => a.hour - b.hour)
  .map((session) => {
    const habit = props.draft.habits.find(item => item.id === session.habitId)
    const area = areas.find(item => item.id === habit?.areaId)
    return { key: `${session.weekday}-${session.hour}`, name: habit?.name ?? '', hour: session.hour, color: area?.color ?? '' }
  })

/**
 * The columns with their blocks numbered across the whole week, in reading order: the entrance (lively only) steps from one
 * block to the next, as the mockup's mini week does with its --i
 */
const columns = computed(() => {
  let before = 0
  return DAYS.map((day, weekday) => {
    const blocks = dayBlocks(weekday)
    const column = { day, blocks: blocks.map((block, i) => ({ ...block, index: before + i })) }
    before += blocks.length
    return column
  })
})
</script>

<template>
  <div class="firstrun-mini" role="list" aria-label="Your week, as a draft">
    <div v-for="column in columns" :key="column.day" class="firstrun-mini-day" role="listitem">
      <span class="firstrun-mini-head">{{ column.day }}</span>
      <span class="firstrun-mini-blocks">
        <span
          v-for="block in column.blocks"
          :key="block.key"
          class="firstrun-mini-block"
          :style="{ ...areaVars(block.color), '--i': block.index }"
        >{{ block.name }} {{ clockLabel(block.hour) }}</span>
      </span>
    </div>
  </div>
</template>
