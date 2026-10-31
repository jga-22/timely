<script setup lang="ts">
import type { Ambition } from '~/types/planner'
import { horizonText, isMapKey, nextMapPosition, type MapCell } from '~/utils/goals'

/**
 * The Harada map (FR-GOALS-14): the Grid view of Goals, from 1100px. Read-only, the ambition in the centre; a cell selects its life area.
 * Arrow keys move between cells; Enter and Space (native buttons) select
 */
const props = defineProps<{ cells: MapCell[]; selectedId: string | null | undefined; ambition: Ambition | null }>()
const emit = defineEmits<{ select: [id: string] }>()

const horizon = computed(() => horizonText(props.ambition))

function onMapKeydown(event: KeyboardEvent, position: number) {
  if (!isMapKey(event.key)) return

  event.preventDefault()

  const next = nextMapPosition(props.cells, position, event.key)
  if (next !== null) document.querySelector<HTMLElement>(`[data-map-position="${next}"]`)?.focus()
}
</script>

<template>
  <section class="section harada-map">
    <div class="harada-grid">
      <template v-for="(cell, position) in cells" :key="position">
        <div v-if="cell === 'centre'" class="harada-cell harada-centre">
          <span class="cell-num">Ambition, {{ horizon }}</span>
          <span class="cell-title">{{ ambition?.statement }}</span>
        </div>

        <button
          v-else-if="cell"
          type="button"
          class="harada-cell"
          :class="{ 'is-active': selectedId === cell.id }"
          :aria-pressed="selectedId === cell.id"
          :data-map-position="position"
          :data-map-id="cell.id"
          @click="emit('select', cell.id)"
          @keydown="onMapKeydown($event, position)"
        >
          <span class="cell-head">
            <span class="dot dot-lg" :style="{ background: cell.color ?? '#888' }" aria-hidden="true" />
            <span class="cell-num">{{ String(cell.order).padStart(2, '0') }}</span>
          </span>
          <span class="cell-title">{{ cell.name }}</span>
          <span class="cell-status">{{ cell.targetTbd ? 'To define' : '' }}</span>
        </button>

        <div v-else class="harada-cell harada-empty" aria-hidden="true" />
      </template>
    </div>
  </section>
</template>

<style scoped>
/* 3x3 map separated by hairlines, as in the prototype; read-only. Large screens only: hidden, not squeezed, below 1100px */
.harada-map { display: none; }

@media (min-width: 1100px) {
  .harada-map { display: block; }
}

.harada-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}

.harada-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 128px;
  padding: var(--space-5);
  background: var(--bg);
  color: var(--ink);
  text-align: left;
  transition: background 0.15s ease;
}

button.harada-cell:hover {
  background: var(--bg-3);
}

/* Inset ring: the grid frame has overflow hidden, so an outside outline would be clipped */
button.harada-cell:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.harada-cell.is-active {
  background: var(--bg-4);
}

.harada-cell.is-active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent);
}

.harada-centre {
  justify-content: center;
  background: var(--accent);
  color: var(--on-accent);
}

.harada-empty {
  background: var(--bg-2);
}

.cell-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.cell-num {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.harada-centre .cell-num {
  color: var(--on-accent);
}

.cell-title {
  font-size: var(--fs-md);
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.harada-centre .cell-title {
  font-weight: 500;
  line-height: 1.45;
}

/* Reserved on every cell so titles line up across the map */
.cell-status {
  min-height: 1.25em;
  margin-top: auto;
  font-size: var(--fs-xs);
  font-weight: 500;
  line-height: 1.25;
  color: var(--warn);
}
</style>
