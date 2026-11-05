<script setup lang="ts">
/**
 * The one toast line of the shell (slice 11): a milestone, the calm line after a day, and the first run's "Your plan is saved."
 * (FirstRunToast). One line, ink on paper, role=status, fixed above the foot and clear of the phone tab bar (shell.css). It goes
 * after `timeout` ms or on Dismiss, and never blocks the page. The illustration is a small mark (sprout, ring) or none.
 */
const props = withDefaults(defineProps<{ title: string, line?: string, kind?: 'sprout' | 'ring' | 'none', timeout?: number }>(), {
  line: '',
  kind: 'sprout',
  timeout: 7000
})

const emit = defineEmits<{ dismiss: [] }>()

let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  timer = setTimeout(() => emit('dismiss'), props.timeout)
})

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="app-toast" role="status">
    <svg v-if="kind === 'sprout'" class="app-toast-ill" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 20V11" />
      <path d="M12 12c0-3.5-2.5-6-7-6 0 3.5 2.5 6 7 6Z" />
      <path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5Z" />
    </svg>
    <svg v-else-if="kind === 'ring'" class="app-toast-ill" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
    <div class="app-toast-text">
      <p class="app-toast-title">{{ title }}</p>
      <p v-if="line" class="app-toast-line">{{ line }}</p>
    </div>
    <button type="button" class="btn btn-quiet app-toast-dismiss" @click="emit('dismiss')">Dismiss</button>
  </div>
</template>
