<script setup lang="ts">
import { FALLBACK_EMPTY_COLOR } from '~/utils/palette'
import { timeSpan, type TodayItem } from '~/utils/today'

/**
 * The rest of the day (FR-TODAY-2): each block or daily habit with its name, its time and its life area (a link to Dreams), and its
 * tick at the right end (FR-TODAY-9). The tick is the same circle as the focus tick; each is a checkbox named for its thing.
 */
const props = defineProps<{ title: string; items: TodayItem[] }>()

const emit = defineEmits<{ toggle: [key: string] }>()

const { link } = useNav()
const { categoryMap } = usePlannerMaps()
const { areaVars } = usePlannerFill()

const areaOf = (item: TodayItem) => (item.categoryId ? categoryMap.value.get(item.categoryId) : undefined)
const timeOf = (item: TodayItem) => (item.kind === 'block' ? timeSpan(item.start!, item.end!) : 'Habit, every day')
</script>

<template>
  <section class="section today-items" aria-labelledby="today-items-title">
    <h2 id="today-items-title" class="section-title">{{ title }}</h2>
    <ul class="today-list">
      <li v-for="item in props.items" :key="item.key" class="today-row" :class="{ 'is-done': item.done }">
        <div class="today-row-text">
          <p class="today-row-name">{{ item.title }}</p>
          <p class="today-row-meta">
            {{ timeOf(item) }}
            <template v-if="areaOf(item)">
              · <span class="today-dot" :style="areaVars(areaOf(item)!.color ?? FALLBACK_EMPTY_COLOR)" aria-hidden="true" />
              <NuxtLink :to="link('dreams', { item: areaOf(item)!.id })">{{ areaOf(item)!.name }}</NuxtLink>
            </template>
          </p>
        </div>
        <UiTick
          :data-tick="item.key"
          :model-value="item.done"
          :label="`Mark ${item.title} done`"
          @update:model-value="emit('toggle', item.key)"
        />
      </li>
    </ul>
  </section>
</template>
