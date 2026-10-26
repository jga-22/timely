import { fillFor } from '~/utils/palette'

/** Fill for a planned colour in the active theme (utils/palette.ts). Reads the theme state set in app.vue */
export const usePlannerFill = () => {
  const dark = useState<boolean>('dark', () => false)

  const fill = (color: string): string => fillFor(color, dark.value)

  return { fill }
}
