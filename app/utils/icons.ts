/**
 * The icon paths of the design system: 24 by 24, stroked with currentColor. Each icon is a list of path data strings
 * (a circle is written as arcs). Rendered only by components/ui/Icon.vue; the names are the IconName type.
 */
export const ICONS = {
  check: ['M5 12.5l4.2 4.2L19 7'],
  today: ['M4 6h16v14H4z', 'M4 10h16', 'M8 4v4', 'M16 4v4'],
  plan: ['M4 4h16v16H4z', 'M4 9h16', 'M9 9v11'],
  progress: ['M21 12a9 9 0 1 1-9-9', 'M12 7v5l3.5 2'],
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
  brand: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18Z', 'M12 7v5l3 2'],
} as const

export type IconName = keyof typeof ICONS
