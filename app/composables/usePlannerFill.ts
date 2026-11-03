import { fillFor, inkOn } from '~/utils/palette'

/** Fill for a planned colour in the active theme (utils/palette.ts). Reads the theme state set in app.vue */
export const usePlannerFill = () => {
  const dark = useState<boolean>('dark', () => false)

  const fill = (color: string): string => fillFor(color, dark.value)

  /** Custom properties for a life area or template colour: CSS paints var(--c) and writes text in var(--c-ink) */
  const areaVars = (color: string): Record<string, string> => {
    const painted = fill(color)
    return { '--c': painted, '--c-ink': inkOn(painted) }
  }

  return { fill, areaVars }
}
