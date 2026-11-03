import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BREAKPOINTS } from '../../app/utils/breakpoints'
import { APP, appRelative, cssCode, cssRules, readText, walk } from './helpers/css'

/*
 * Design system guards (spec/design-system.md, Guards). Two kinds of rule:
 *  - hard: a new scoped <style> block, a bare primitive selector in a feature file. These fail at once.
 *  - ratchet: legacy values that are counted today (BASELINE). A count that rises fails, and so does a count that falls
 *    without BASELINE being lowered in the same change. Lower the number in BASELINE when you remove the legacy values.
 */

/** Legacy violations counted today. Lower a number when its last use goes; never raise one (new code uses the tokens). */
const BASELINE = {
  rawColourCss: 3,
  rawColourVue: 1,
  rawColourTs: 0,
  fontSizePx: 9,
  radiusLiteral: 15,
  zIndexLiteral: 6,
  keyframesOutsideMotion: 9,
  animationUngated: 11,
  transitionLiteral: 3,
  mediaWidthLegacy: 6,
  inlineColourKey: 16,
  importantOutsideReset: 4,
  legacyTokenUse: 455,
} as const

/** The 16 .vue files with a scoped <style> block today. A file leaves this list when its block moves to features/ (ratchet) */
const STYLE_BLOCK_FILES = [
  'components/ActivityForm.vue',
  'components/AutoTextarea.vue',
  'components/entry/EntryMoreOptions.vue',
  'components/entry/EntryScheduleFields.vue',
  'components/harada/AddLifeArea.vue',
  'components/harada/AmbitionCard.vue',
  'components/harada/CategoryDetail.vue',
  'components/harada/CategoryEditFields.vue',
  'components/harada/CategoryEntryList.vue',
  'components/harada/CategoryManage.vue',
  'components/harada/HaradaMap.vue',
  'components/harada/HaradaView.vue',
  'components/harada/LifeAreaList.vue',
  'components/planner/EntryActions.vue',
  'components/planner/SleepEditor.vue',
  'components/planner/TimeSplitDonut.vue',
]

/** .ts files that may hold colour literals: palette, seed and template data, sleep and store defaults */
const TS_COLOUR_ALLOWLIST = [
  'utils/palette.ts',
  'utils/planner/seed.ts',
  'utils/planner/seedTemplates.ts',
  'utils/planner/templates.ts',
  'utils/sleep.ts',
  'utils/store/',
]

const HEX = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?)\(/i
const FORBIDDEN_INLINE_KEY = /^(background(-color|-image)?|color|fill|stroke|border(-color)?)$/

const ALLOWED_WIDTHS = new Set(
  Object.values(BREAKPOINTS).flatMap(px => [px, px + 1]),
)

/** The raw colour names of tokens.css (tier 1). The docs name them by family, so they are not checked one by one */
const PRIMITIVE = /^--(white$|(stone|blue|sand|red|green|night|peach|sage|sky|cream|lilac|rose)-)/

/** Names that components set on themselves (inline style or CSS), not tokens */
const LOCAL_NAMES = new Set(['--c', '--c-ink', '--d', '--fill', '--v', '--i', '--p'])

const cssFiles = walk(join(APP, 'assets', 'css'), /\.css$/)
const vueFiles = walk(APP, /\.vue$/)
const tsFiles = walk(APP, /\.ts$/)
const tokensFile = join(APP, 'assets', 'css', 'tokens.css')
const legacyFile = join(APP, 'assets', 'css', 'tokens-legacy.css')

/** The old names: every custom property declared in tokens-legacy.css */
const legacyNames = (): string[] =>
  [...cssCode(readText(legacyFile)).matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]!)

/** Declarations of CSS rules, with the selector they belong to (so a gated rule can be recognised) */
const declarations = (css: string) =>
  cssRules(css).flatMap(rule => rule.declarations.map(declaration => ({ selector: rule.selector, declaration })))

const isAllowedFontSize = (value: string): boolean =>
  /^(var\(--text-[\w-]+\)|var\(--fs-[\w-]+\)|inherit|1em|[\d.]+%)$/.test(value)

const isAllowedRadius = (value: string): boolean =>
  /^(0|50%|var\(--radius-[\w]+\)|var\(--radius\))$/.test(value)

const isAllowedZIndex = (value: string): boolean => /^(var\(--z-[\w-]+\)|[0-9])$/.test(value)

const isLiteralDuration = (value: string): boolean => /\d(\.\d+)?m?s\b/.test(value) && !value.includes('var(--dur-')

/** Keys of an object literal in a :style binding: `{ background: x, '--c': y }` gives background and --c */
const objectKeys = (text: string): string[] =>
  [...text.matchAll(/(?:^|,)\s*['"]?([\w-]+)['"]?\s*:/g)].map(match => match[1]!)

/** Property names of a static style attribute */
const declarationKeys = (text: string): string[] =>
  text.split(';').map(part => part.split(':')[0]!.trim()).filter(Boolean)

/** Every count, and where the first few are, for the messages */
interface Measure {
  counts: Record<keyof typeof BASELINE, number>
  where: Record<keyof typeof BASELINE, string[]>
}

const measure = (): Measure => {
  const counts = Object.fromEntries(Object.keys(BASELINE).map(key => [key, 0])) as Record<keyof typeof BASELINE, number>
  const where = Object.fromEntries(Object.keys(BASELINE).map(key => [key, [] as string[]])) as Record<keyof typeof BASELINE, string[]>
  const add = (key: keyof typeof BASELINE, file: string, count = 1) => {
    if (count === 0) return
    counts[key] += count
    if (where[key].length < 5) where[key].push(file)
  }

  const legacy = legacyNames().filter(name => name !== '--')
  const legacyUse = new RegExp(`var\\((${legacy.map(name => name.replace(/[-]/g, '\\-')).join('|')})(?![\\w-])`, 'g')

  for (const file of cssFiles) {
    const name = appRelative(file)
    if (name === 'assets/css/tokens.css') continue
    const css = readText(file)
    const code = cssCode(css)

    add('rawColourCss', name, [...code.matchAll(new RegExp(HEX.source, 'gi'))].length + [...code.matchAll(new RegExp(COLOUR_FUNCTION.source, 'gi'))].length)
    add('importantOutsideReset', name, name === 'assets/css/reset.css' ? 0 : [...code.matchAll(/!important/g)].length)
    add('keyframesOutsideMotion', name, name === 'assets/css/motion.css' ? 0 : [...code.matchAll(/@keyframes\s/g)].length)
    add('legacyTokenUse', name, [...code.matchAll(legacyUse)].length)

    for (const media of code.matchAll(/@media([^{]*)\{/g)) {
      for (const width of media[1]!.matchAll(/(?:max|min)-width:\s*(\d+)px/g)) {
        if (!ALLOWED_WIDTHS.has(Number(width[1]))) add('mediaWidthLegacy', name)
      }
    }

    for (const { selector, declaration } of declarations(css)) {
      const colon = declaration.indexOf(':')
      if (colon < 0) continue
      const property = declaration.slice(0, colon).trim()
      const value = declaration.slice(colon + 1).trim()

      if (property === 'font-size' && !isAllowedFontSize(value)) add('fontSizePx', name)
      if (/^border(-[a-z]+)?-radius$/.test(property) && !isAllowedRadius(value)) add('radiusLiteral', name)
      if (property === 'z-index' && !isAllowedZIndex(value)) add('zIndexLiteral', name)
      if (/^transition(-duration)?$/.test(property) && isLiteralDuration(value)) add('transitionLiteral', name)
      if (/^animation(-name)?$/.test(property) && value !== 'none' && !selector.includes('[data-motion="lively"]')) {
        add('animationUngated', name)
      }
    }
  }

  for (const file of vueFiles) {
    const name = appRelative(file)
    const text = readText(file)
    add('rawColourVue', name, [...text.matchAll(new RegExp(HEX.source, 'gi'))].length + [...text.matchAll(new RegExp(COLOUR_FUNCTION.source, 'gi'))].length)
    add('legacyTokenUse', name, [...text.matchAll(legacyUse)].length)

    const keys = [
      ...[...text.matchAll(/:style="\{([^}]*)\}"/g)].flatMap(match => objectKeys(match[1]!)),
      ...[...text.matchAll(/\sstyle="([^"]*)"/g)].flatMap(match => declarationKeys(match[1]!)),
    ]
    for (const key of keys) if (FORBIDDEN_INLINE_KEY.test(key)) add('inlineColourKey', name)
  }

  for (const file of tsFiles) {
    const name = appRelative(file)
    if (TS_COLOUR_ALLOWLIST.some(entry => name === entry || (entry.endsWith('/') && name.startsWith(entry)))) continue
    const text = readText(file)
    add('rawColourTs', name, [...text.matchAll(new RegExp(HEX.source, 'gi'))].length)
    add('legacyTokenUse', name, [...text.matchAll(legacyUse)].length)
  }

  return { counts, where }
}

describe('design system: hard rules', () => {
  it('keeps the scoped <style> blocks to the list of files that have one (new .vue files have none)', () => {
    const withStyle = vueFiles.filter(file => /<style[\s>]/.test(readText(file))).map(appRelative).sort()
    expect(withStyle).toEqual([...STYLE_BLOCK_FILES].sort())
  })

  it('has no bare primitive selector in a feature file (the primitives are the ui/ files, from 3b)', () => {
    const uiDir = join(APP, 'assets', 'css', 'ui')
    if (!existsSync(uiDir)) return
    const primitives = walk(uiDir, /\.css$/).flatMap(file => [...cssCode(readText(file)).matchAll(/\.([a-z][\w-]*)/g)].map(match => match[1]!))
    const features = cssFiles.filter(file => appRelative(file).startsWith('assets/css/features/'))
    const bare = features.flatMap(file => cssRules(readText(file))
      .flatMap(rule => rule.selector.split(',').map(part => part.trim()))
      .filter(selector => primitives.some(name => new RegExp(`^\\.${name}(?![\\w-])`).test(selector)))
      .map(selector => `${appRelative(file)}: ${selector}`))
    expect(bare).toEqual([])
  })
})

describe('design system: ratchet', () => {
  it('keeps every legacy count at or below its baseline, and lowers the baseline when a count falls', () => {
    const { counts, where } = measure()
    const problems: string[] = []

    for (const key of Object.keys(BASELINE) as (keyof typeof BASELINE)[]) {
      const now = counts[key]
      const was = BASELINE[key]
      if (now > was) {
        problems.push(`${key} rose from ${was} to ${now}. New code uses the tokens and primitives (spec/design-system.md). First places: ${where[key].join(', ')}`)
      } else if (now < was) {
        problems.push(`${key} fell from ${was} to ${now}. Set BASELINE.${key} = ${now} in tests/unit/designSystem.test.ts in the same change.`)
      }
    }

    expect(problems).toEqual([])
  })
})

describe('design system: docs', () => {
  it('names every semantic token in spec/design-system.md, and every token the document names exists', () => {
    const doc = readText(join(APP, '..', 'spec', 'design-system.md'))
    const defined = new Set(
      [...cssCode(readText(tokensFile)).matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]!),
    )
    const legacy = new Set(legacyNames())

    // Primitives (the raw values) are named by family in the doc, not one by one; the rest must each be named
    const semantic = [...defined].filter(name => !PRIMITIVE.test(name))
    const unnamed = semantic.filter(name => !doc.includes(name))

    // A name the doc mentions must exist. A trailing dash is a family ("--text-*"), and the component-local names are set by the components
    const named = [...new Set([...doc.matchAll(/--[a-z][\w-]*/g)].map(match => match[0]))]
      .filter(name => !name.endsWith('-'))
    const unknown = named.filter(name => !defined.has(name) && !legacy.has(name) && !LOCAL_NAMES.has(name))

    expect({ unnamed, unknown }).toEqual({ unnamed: [], unknown: [] })
  })
})
