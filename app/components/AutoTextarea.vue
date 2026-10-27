<script setup lang="ts">
/**
 * Multi-line text box that grows with its content: no resize handle and no inner scrollbar.
 * The height is recomputed on input, on programmatic changes, when the box gets a new width
 * (window resize, or a collapsed panel being shown) and once fonts have loaded.
 * Attributes (ids, aria, listeners such as keydown, data-autofocus) go to the textarea, not the wrapper.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  ariaLabel?: string
}>(), {
  label: '',
  placeholder: '',
  ariaLabel: undefined
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const inputId = useId()
const field = ref<HTMLTextAreaElement | null>(null)
const text = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

let lastWidth = -1
let observer: ResizeObserver | null = null

const fit = () => {
  const el = field.value

  // Hidden boxes have no layout yet; the resize observer fits them once they are shown
  if (!el || el.getClientRects().length === 0) return

  el.style.height = 'auto'
  // Border-box sizing: the borders sit on top of the content height
  const borders = el.offsetHeight - el.clientHeight
  el.style.height = `${el.scrollHeight + borders}px`
}

// Fitting in a frame keeps the resize write out of the observer callback
const observedResize = (entries: ResizeObserverEntry[]) => {
  const width = entries[0]?.contentRect.width ?? 0

  if (width === lastWidth) return

  lastWidth = width
  requestAnimationFrame(fit)
}

watch(() => props.modelValue, () => nextTick(fit))

onMounted(() => {
  fit()
  observer = new ResizeObserver(observedResize)
  if (field.value) observer.observe(field.value)
  window.addEventListener('resize', fit)
  document.fonts?.ready.then(fit)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', fit)
})
</script>

<template>
  <div class="auto-field">
    <label v-if="label" class="auto-label" :for="inputId">{{ label }}</label>
    <textarea
      v-bind="$attrs"
      :id="inputId"
      ref="field"
      v-model="text"
      class="auto-textarea"
      rows="1"
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      @input="fit"
    />
  </div>
</template>

<style scoped>
.auto-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.auto-label {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--ink-2);
}

.auto-textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--control-border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--ink);
  font: inherit;
  font-size: var(--fs-md);
  line-height: 1.5;
  overflow: hidden;
  overflow-wrap: anywhere;
  resize: none;
  outline: none;
  transition: border-color 0.12s, box-shadow 0.12s;
}

.auto-textarea::placeholder {
  color: var(--ink-3);
}

.auto-textarea:focus {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}
</style>
