<script setup lang="ts">
/**
 * A modal dialog on the native <dialog> (showModal: in the top layer, the page behind is inert, so Tab stays inside it).
 * v-model:open shows and hides it. On open the element that had focus is remembered and the first control (or
 * `initialFocus`) takes focus; on close the remembered element gets focus back. Escape closes it when `dismissible`
 * and does nothing otherwise. `variant="sheet"` is a bottom sheet on a phone. `labelledby` names it by its title.
 * `close` is emitted once it has closed, however it closed.
 *
 * Tab: the inert page keeps focus in the dialog, but the browser's own cycle leaves the page after the last control (it
 * goes to the address bar and back). Two edge stops inside the dialog hand focus to the first or the last control instead.
 */
const open = defineModel<boolean>('open', { default: false })
const props = withDefaults(defineProps<{
  labelledby: string
  role?: 'dialog' | 'alertdialog'
  dismissible?: boolean
  variant?: 'center' | 'sheet'
  initialFocus?: HTMLElement | null
  describedby?: string
}>(), { role: 'dialog', dismissible: true, variant: 'center', initialFocus: null, describedby: undefined })
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
let opener: HTMLElement | null = null

const show = () => {
  if (!dialog.value || dialog.value.open) return
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value.showModal()
  nextTick(() => {
    const first = dialog.value?.querySelector<HTMLElement>('button:not(:disabled), [href], input, select, textarea')
    ;(props.initialFocus ?? first)?.focus()
  })
}

const CONTROLS = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** A focus edge: from the last control to the first, or from the first to the last */
const wrap = (toFirst: boolean) => {
  const controls = [...(dialog.value?.querySelectorAll<HTMLElement>(CONTROLS) ?? [])].filter(el => !el.classList.contains('dialog-edge'))
  const target = toFirst ? controls[0] : controls[controls.length - 1]
  target?.focus()
}

const restore = () => {
  const element = opener
  opener = null
  if (element?.isConnected) element.focus()
}

/** The native close (Escape, a close button, or open set to false) ends here: the parent hears it once, focus goes back */
const onClosed = () => {
  open.value = false
  emit('close')
  restore()
}

/** Escape: the browser would close the dialog itself; here it closes only when dismissible, so the parent stays in charge */
const onCancel = (event: Event) => {
  event.preventDefault()
  if (props.dismissible) open.value = false
}

watch(open, (on) => {
  if (on) show()
  else if (dialog.value?.open) dialog.value.close()
})

onMounted(() => {
  if (open.value) show()
})

onBeforeUnmount(() => {
  if (dialog.value?.open) dialog.value.close()
  restore()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    :class="`dialog-${variant}`"
    :role="role"
    :aria-labelledby="labelledby"
    :aria-describedby="describedby"
    @cancel="onCancel"
    @close="onClosed"
  >
    <span class="dialog-edge" tabindex="0" @focus="wrap(false)" />
    <slot />
    <span class="dialog-edge" tabindex="0" @focus="wrap(true)" />
  </dialog>
</template>
