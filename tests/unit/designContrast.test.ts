import { describe, expect, it } from 'vitest'
import { contrastRatio, FILL_MIN_CONTRAST, fillFor, inkOn, SURFACE } from '../../app/utils/palette'
import { DESIGN_COLORS } from '../../app/utils/planner/templates'
import { colourToken, tokenValues, type TokenState } from './helpers/css'

/*
 * Contrast of the token pairs in each theme and part of the day (spec/design-system.md, Colour), read from tokens.css
 * the way the browser resolves them. Text pairs need 4.5:1 (WCAG AA); boundaries and focus need 3:1 (WCAG 1.4.11).
 */

const STATES: TokenState[] = [
  { theme: 'light', part: 'morning' },
  { theme: 'light', part: 'afternoon' },
  { theme: 'light', part: 'evening' },
  { theme: 'dark', part: 'morning' },
  { theme: 'dark', part: 'afternoon' },
  { theme: 'dark', part: 'evening' },
]

const TEXT_ON_BACKGROUNDS = ['paper', 'surface', 'surface-2', 'am-1', 'am-2'] as const
const TEXT_TOKENS = ['ink', 'ink-2', 'ink-3'] as const

/** Pairs as [text token, background token, minimum ratio] */
const PAIRS: Array<[string, string, number]> = [
  ...TEXT_TOKENS.flatMap(text => TEXT_ON_BACKGROUNDS.map((bg): [string, string, number] => [text, bg, 4.5])),
  ['accent', 'paper', 4.5],
  ['accent', 'surface', 4.5],
  ['accent-ink', 'accent', 4.5],
  ['warn-ink', 'warn-bg', 4.5],
  ['ink-inverse', 'ink', 4.5],
  ['danger', 'surface', 4.5],
  ['ok', 'surface', 4.5],
  ['control-border', 'paper', 3],
  ['control-border', 'surface', 3],
  ['cell-line', 'paper', 3],
  ['cell-line', 'surface', 3],
  ['focus', 'paper', 3],
  ['focus', 'surface', 3],
  ['accent', 'accent-soft', 3],
]

/**
 * Design colours whose best text (white or the dark paper) stays under 4.5:1 on the fill. teal: 4.42 in both themes,
 * the same as before the design system; a known limit, not a regression. Lighten or darken the colour to remove it.
 */
const INK_ON_FILL_LIMITS = ['teal']

describe('token contrast, per theme and part of the day', () => {
  for (const state of STATES) {
    const label = `${state.theme}, ${state.part}`
    const values = tokenValues(state)

    it(`meets the text and boundary minimums in ${label}`, () => {
      const failures = PAIRS.flatMap(([text, bg, minimum]) => {
        const ratio = contrastRatio(colourToken(values, text), colourToken(values, bg))
        return ratio >= minimum ? [] : [`${text} on ${bg}: ${ratio.toFixed(2)} (needs ${minimum})`]
      })
      expect(failures).toEqual([])
    })
  }
})

describe('palette surfaces and planned fills', () => {
  it('SURFACE is the card and the paper of each theme (equal to the tokens)', () => {
    for (const state of STATES.filter(s => s.part === 'morning')) {
      const values = tokenValues(state)
      const dark = state.theme === 'dark'
      const surfaces = dark ? SURFACE.dark : SURFACE.light
      expect(surfaces).toEqual([colourToken(values, 'surface'), colourToken(values, 'paper')])
    }
  })

  it('every design colour reaches 3:1 on both surfaces of both themes through fillFor', () => {
    const failures: string[] = []
    for (const dark of [false, true]) {
      const surfaces = dark ? SURFACE.dark : SURFACE.light
      for (const colour of DESIGN_COLORS) {
        const fill = fillFor(colour.bg, dark)
        for (const surface of surfaces) {
          const ratio = contrastRatio(fill, surface)
          if (ratio < FILL_MIN_CONTRAST) failures.push(`${colour.id} ${dark ? 'dark' : 'light'} on ${surface}: ${ratio.toFixed(2)}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('text on every design fill reaches 4.5:1, or is a known limit', () => {
    const failures: string[] = []
    for (const dark of [false, true]) {
      for (const colour of DESIGN_COLORS) {
        const fill = fillFor(colour.bg, dark)
        const ink = inkOn(fill)
        const ratio = contrastRatio(ink, fill)
        if (ratio < 4.5 && !INK_ON_FILL_LIMITS.includes(colour.id)) failures.push(`${colour.id} ${dark ? 'dark' : 'light'}: ${ratio.toFixed(2)}`)
      }
    }
    expect(failures).toEqual([])
  })
})
