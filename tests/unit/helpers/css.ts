import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** The app source folder, and the helpers that the design guards share (tests/unit/designSystem.test.ts, designContrast.test.ts) */
export const APP = join(__dirname, '..', '..', '..', 'app')

/** Every file under a folder whose name matches the pattern */
export const walk = (dir: string, pattern: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path, pattern)
    return pattern.test(name) ? [path] : []
  })

/** A path relative to app/, with forward slashes, for messages and allowlists */
export const appRelative = (path: string): string => relative(APP, path).replaceAll('\\', '/')

export const readText = (path: string): string => readFileSync(path, 'utf8')

/** CSS with comments removed and url(...) emptied, so their text is never scanned */
export const cssCode = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, 'url()')

/** A CSS rule with no nested block: its selector text and its declarations */
export interface CssRule {
  selector: string
  declarations: string[]
}

/** The flat rules of a stylesheet (inside an at-rule such as @media, the inner rules are returned too) */
export const cssRules = (css: string): CssRule[] => {
  const rules: CssRule[] = []
  const pattern = /([^{}]+)\{([^{}]*)\}/g
  for (const match of cssCode(css).matchAll(pattern)) {
    const selector = match[1]!.trim()
    const declarations = match[2]!.split(';').map(text => text.trim()).filter(Boolean)
    rules.push({ selector, declarations })
  }
  return rules
}

/** The state a token value is read in: the theme, and the part of the day (spec/design-system.md, Modes) */
export interface TokenState {
  theme: 'light' | 'dark'
  part: 'morning' | 'afternoon' | 'evening'
}

/** Whether a selector in tokens.css applies in a state. Only the selectors tokens.css uses are known; others never match */
const selectorApplies = (selector: string, state: TokenState): boolean => {
  const dark = state.theme === 'dark'
  const part = state.part
  switch (selector) {
    case ':root':
      return true
    case 'html[data-theme="dark"]':
      return dark
    case `html[data-part="${part}"]`:
      return true
    case `html[data-theme="dark"][data-part="${part}"]`:
      return dark
    default:
      return false
  }
}

/**
 * The custom properties of tokens.css in one state, with every var() expanded to its value. Rules apply in file order,
 * as the cascade does for these selectors, and a block inside @media is not a token (the width is for the tick only).
 */
export const tokenValues = (state: TokenState, file = join(APP, 'assets', 'css', 'tokens.css')): Record<string, string> => {
  const css = cssCode(readText(file)).replace(/@media[^{]*\{[^{}]*\{[^{}]*\}\s*\}/g, '')
  const values: Record<string, string> = {}
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1]!.split(',').map(text => text.trim())
    if (!selectors.some(selector => selectorApplies(selector, state))) continue
    for (const declaration of match[2]!.split(';')) {
      const colon = declaration.indexOf(':')
      if (colon < 0) continue
      const name = declaration.slice(0, colon).trim()
      if (!name.startsWith('--')) continue
      values[name] = declaration.slice(colon + 1).trim()
    }
  }
  return values
}

/** A token's value with every var(--x) replaced by its value in the same state (fallbacks used when a name is missing) */
export const resolveToken = (values: Record<string, string>, name: string, depth = 0): string => {
  const raw = values[name]
  if (raw === undefined) throw new Error(`token ${name} is not defined`)
  if (depth > 10) throw new Error(`token ${name} refers to itself`)
  return raw.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)/g, (_, inner: string, fallback?: string) => {
    if (values[inner] !== undefined) return resolveToken(values, inner, depth + 1)
    if (fallback !== undefined) return fallback.trim()
    throw new Error(`token ${inner} (used by ${name}) is not defined`)
  })
}

/** A resolved colour token as lower-case #rrggbb, or an error when it is not a plain hex colour */
export const colourToken = (values: Record<string, string>, name: string): string => {
  const key = name.startsWith('--') ? name : `--${name}`
  const value = resolveToken(values, key).toLowerCase()
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value)
  if (!match) throw new Error(`token ${key} is not a hex colour: ${value}`)
  return match[1]!.length === 3 ? `#${match[1]!.split('').map(char => char + char).join('')}` : value
}
