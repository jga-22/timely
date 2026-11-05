<script setup lang="ts">
/**
 * A done tick: a round target with role="checkbox" and aria-checked (v-model). The label names the thing ("Mark Run done").
 * The default is a 44px target around a 22px circle; `lg` is the large tick (76px, 64 on a phone). When it turns on under
 * lively motion the circle pops and six sparks leave its centre for a moment (no sound); Calm shows the state at once.
 * The caller saves the value (bind :model-value).
 */
const done = defineModel<boolean>({ default: false })
const props = withDefaults(defineProps<{ label: string; size?: 'default' | 'lg' }>(), { size: 'default' })

const { isLively } = useMotion()
const burst = ref(false)
const SPARK_MS = 900
let timer: ReturnType<typeof setTimeout> | undefined
const SPARKS = [0, 60, 120, 180, 240, 300]

const toggle = () => {
  const next = !done.value
  done.value = next
  if (next && isLively()) {
    burst.value = false
    clearTimeout(timer)
    nextTick(() => {
      burst.value = true
      timer = setTimeout(() => (burst.value = false), SPARK_MS)
    })
  }
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <button
    type="button"
    class="tick"
    :class="[`tick-${props.size}`, { 'is-burst': burst }]"
    role="checkbox"
    :aria-checked="done ? 'true' : 'false'"
    :aria-label="label"
    @click="toggle"
  >
    <span class="tick-box" aria-hidden="true">
      <UiIcon v-if="done" name="check" :size="props.size === 'lg' ? 'md' : 'sm'" />
    </span>
    <span v-if="burst" class="tick-sparks" aria-hidden="true">
      <i v-for="angle in SPARKS" :key="angle" class="tick-spark" :style="{ '--a': `${angle}deg` }" />
    </span>
  </button>
</template>
