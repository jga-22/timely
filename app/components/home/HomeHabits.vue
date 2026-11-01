<script setup lang="ts">
import { isAllDone, type HomeHabitRow } from '~/utils/home'

/**
 * The Habits list (FR-HOME-15, 16): the habits with no day assigned, ticked for the day, with progress for weekly and monthly ones.
 * It has its own count and green check, apart from the day's blocks. Closed until opened (a disclosure).
 */
const props = defineProps<{ rows: HomeHabitRow[] }>()

const emit = defineEmits<{ toggle: [key: string] }>()

const { link } = useNav()
const done = computed(() => props.rows.filter(row => row.done).length)
const allDone = computed(() => isAllDone(done.value, props.rows.length))
</script>

<template>
  <!-- Habits with no day assigned (FR-HOME-15): ticked for the day, progress for weekly and monthly habits. Their own count and
       green check, apart from the day's blocks -->
  <details v-if="rows.length" class="disclosure home-habits">
    <summary>
      Habits <span class="home-habits-count">{{ done }} of {{ rows.length }} ticked</span>
      <span v-if="allDone" class="home-habits-done"><span class="home-habits-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-6.5" /></svg></span> All ticked</span>
    </summary>
    <ol class="home-rows" aria-label="Habits">
      <li
        v-for="row in rows"
        :key="row.key"
        class="home-row is-habit"
        :class="{ 'is-done': row.done }"
      >
        <div class="home-row-main">
          <span class="home-row-name">{{ row.name }}</span>
          <span class="home-row-meta">
            <NuxtLink v-if="row.category" class="home-row-cat" :to="link('goals', { item: row.category.id })">{{ row.category.name }}</NuxtLink>
            <span v-if="row.progress" class="home-row-progress">{{ row.progress }}</span>
          </span>
        </div>
        <button
          type="button"
          class="home-check"
          role="checkbox"
          :aria-checked="row.done ? 'true' : 'false'"
          :aria-label="`Mark ${row.name} done`"
          @click="emit('toggle', row.key)"
        >
          <span class="home-check-box" aria-hidden="true">
            <svg v-if="row.done" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
          </span>
        </button>
      </li>
    </ol>
  </details>
</template>
