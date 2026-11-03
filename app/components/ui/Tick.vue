<script setup lang="ts">
/**
 * A done tick: a round target with role="checkbox" and aria-checked (v-model). The label names the thing ("Mark Run done").
 * The default is a 44px target around a 22px circle; `lg` is the large tick (76px, 64 on a phone). When it turns on under
 * lively motion the circle pops (no sound); Calm shows the state at once. The caller saves the value (bind :model-value).
 */
const done = defineModel<boolean>({ default: false })
const props = withDefaults(defineProps<{ label: string; size?: 'default' | 'lg' }>(), { size: 'default' })

const { isLively } = useMotion()
const burst = ref(false)

const toggle = () => {
  const next = !done.value
  done.value = next
  if (next && isLively()) {
    burst.value = false
    nextTick(() => {
      burst.value = true
    })
  }
}
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
    @animationend="burst = false"
  >
    <span class="tick-box" aria-hidden="true">
      <UiIcon v-if="done" name="check" :size="props.size === 'lg' ? 'md' : 'sm'" />
    </span>
  </button>
</template>
