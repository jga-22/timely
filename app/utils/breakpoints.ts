/**
 * The viewport widths the CSS and the script use (spec/design-system.md, Breakpoints). CSS variables do not work inside
 * @media, so the widths live here and tests/unit/designSystem.test.ts checks every @media width against them.
 * phone: a phone in portrait; tablet: the largest width that still counts as a phone for layout and focus; wide: the
 * width from which the Goals list and grid sit side by side.
 */
export const BREAKPOINTS = { phone: 480, tablet: 768, wide: 1100 } as const

export type BreakpointName = keyof typeof BREAKPOINTS

/**
 * The media query for a breakpoint. 'max' matches up to and including the width; 'min' matches from the next pixel, so
 * the two never overlap ("wider than 768" is min, "768 and narrower" is max).
 */
export const breakpointQuery = (name: BreakpointName, side: 'max' | 'min' = 'max'): string =>
  side === 'max' ? `(max-width: ${BREAKPOINTS[name]}px)` : `(min-width: ${BREAKPOINTS[name] + 1}px)`

/** Whether the viewport matches a breakpoint now. False where there is no window (server, tests). */
export const matchesBreakpoint = (name: BreakpointName, side: 'max' | 'min' = 'max'): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(breakpointQuery(name, side)).matches
}
