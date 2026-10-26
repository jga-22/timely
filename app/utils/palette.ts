/**
 * One colour rule for every planned fill: the year grid, the week grid, the Home timeline and the Visualization bars
 * (spec/frontend-design.md, section 5). A category, activity or template colour is shown as given when it reaches
 * 3:1 against the surface of the theme (WCAG 1.4.11, non-text). Otherwise it is shaded toward black (light) or white
 * (dark) until it does: the hue stays, only the lightness moves. Pure functions, so they run in node.
 */

/** The empty surface of each theme: equals --cell-empty in main.css */
export const SURFACE = { light: '#ffffff', dark: '#0f1624' } as const

/** Text on a planned fill: white or the dark surface, whichever contrasts more */
const INK_ON_LIGHT_FILL = '#ffffff'
const INK_ON_DARK_FILL = '#0f1624'

export const FILL_MIN_CONTRAST = 3

const parse = (hex: string): [number, number, number] | null => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)
  if (!match) return null

  const digits = match[1]!.length === 3 ? match[1]!.split('').map(char => char + char).join('') : match[1]!
  return [0, 2, 4].map(index => parseInt(digits.slice(index, index + 2), 16)) as [number, number, number]
}

const toHex = ([red, green, blue]: [number, number, number]) =>
  `#${[red, green, blue].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`

const luminance = (hex: string): number => {
  const rgb = parse(hex)
  if (!rgb) return 0

  const [red, green, blue] = rgb.map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** WCAG contrast ratio of two hex colours, 1 to 21 */
export const contrastRatio = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

const mix = (hex: string, toward: string, amount: number): string => {
  const from = parse(hex)
  const to = parse(toward)
  if (!from || !to) return hex

  return toHex(from.map((value, index) => value + (to[index]! - value) * amount) as [number, number, number])
}

/** The colour to paint for a planned hour, week or segment in the given theme */
export const fillFor = (color: string, dark: boolean): string => {
  const surface = dark ? SURFACE.dark : SURFACE.light
  const toward = dark ? '#ffffff' : '#000000'

  for (let step = 0; step <= 50; step += 1) {
    const candidate = step === 0 ? color : mix(color, toward, step / 50)
    if (contrastRatio(candidate, surface) >= FILL_MIN_CONTRAST) return candidate
  }

  return mix(color, toward, 1)
}

/** Text colour on a planned fill */
export const inkOn = (fill: string): string =>
  contrastRatio(fill, INK_ON_LIGHT_FILL) >= contrastRatio(fill, INK_ON_DARK_FILL) ? INK_ON_LIGHT_FILL : INK_ON_DARK_FILL
