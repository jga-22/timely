/**
 * Focus for the edit and add panels (FR-UX-9). On a phone or a touch screen the first text field is not focused when a
 * panel opens: the on-screen keyboard would cover the panel and shift the page. The panel takes focus instead, so Escape
 * still reaches it. Desktop with a mouse or keyboard keeps focusing the field.
 */
const PHONE_MAX_WIDTH = 768

/** Whether an opening panel may focus its first text field: a fine pointer and a wider viewport than a phone */
export const shouldAutoFocusInputs = (): boolean => {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(pointer: coarse)').matches) return false
  return window.innerWidth > PHONE_MAX_WIDTH
}

/**
 * Focuses the field of a panel that has just opened. Where the field may not take focus, the panel does (it needs
 * tabindex="-1") and is scrolled into view without the keyboard.
 */
export const focusEditField = (field: HTMLElement | null | undefined, panel: HTMLElement | null | undefined): void => {
  if (shouldAutoFocusInputs()) {
    field?.focus()
    return
  }

  if (!panel) return
  panel.focus({ preventScroll: true })
  panel.scrollIntoView({ block: 'nearest' })
}

/** The same, for a panel and a field found by id */
export const focusEditById = (fieldId: string, panelId: string): void => {
  focusEditField(document.getElementById(fieldId), document.getElementById(panelId))
}
