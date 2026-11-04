/**
 * The icon paths of the design system: 24 by 24, stroked with currentColor. Each icon is a list of path data strings
 * (a circle is written as arcs). Rendered only by components/ui/Icon.vue; the names are the IconName type.
 */
export const ICONS = {
  check: ['M5 12.5l4.2 4.2L19 7'],
  today: ['M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0', 'M12 7.5v4.8l3 1.7'],
  plan: ['M6.5 5h11a3 3 0 0 1 3 3v9.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z', 'M3.5 10h17', 'M8 3v4', 'M16 3v4'],
  progress: ['M4 20V4', 'M4 20h16', 'M8 16l4-5 3 2.5 5-6'],
  left: ['M15 18l-6-6 6-6'],
  right: ['M9 18l6-6-6-6'],
  plus: ['M12 5v14', 'M5 12h14'],
  moon: ['M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8Z',
    'M12 2.5v2.5', 'M12 19v2.5', 'M2.5 12H5', 'M19 12h2.5',
    'M5.3 5.3l1.8 1.8', 'M16.9 16.9l1.8 1.8', 'M5.3 18.7l1.8-1.8', 'M16.9 7.1l1.8-1.8',
  ],
  pencil: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
} as const

export type IconName = keyof typeof ICONS
