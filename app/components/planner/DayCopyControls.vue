<script setup lang="ts">
import { DAYS } from '~/utils/planner'

const emit = defineEmits<{
  copyDay: [payload: { sourceDayIndex: number, targetDayIndex: number }]
}>()

const copySourceDay = ref(0)
const copyTargetDay = ref(1)

const copy = () => {
  emit('copyDay', {
    sourceDayIndex: copySourceDay.value,
    targetDayIndex: copyTargetDay.value
  })
}
</script>

<template>
  <section class="panel-surface day-copy">
    <h3>Copy day</h3>
    <div class="copy-controls">
      <select v-model.number="copySourceDay">
        <option v-for="(day, index) in DAYS" :key="`source-${day}`" :value="index">{{ day }}</option>
      </select>
      <span>to</span>
      <select v-model.number="copyTargetDay">
        <option v-for="(day, index) in DAYS" :key="`target-${day}`" :value="index">{{ day }}</option>
      </select>
    </div>
    <button class="button button-secondary" type="button" @click="copy()">Copy day plan</button>
  </section>
</template>

<style scoped>
.panel-surface {
  background: rgba(255, 250, 243, 0.78);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.day-copy {
  margin-top: 1rem;
}

.copy-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

h3 {
  margin-top: 0;
  font-size: 1rem;
}

.copy-controls select {
  min-height: 2.75rem;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--surface-strong);
  padding: 0.7rem 0.85rem;
  color: var(--text-main);
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--panel-border);
  cursor: pointer;
  background: var(--surface-strong);
  color: var(--text-main);
}
</style>
