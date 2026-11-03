<script setup lang="ts">
import { SURFACE, contrastRatio, fillFor, inkOn } from '~/utils/palette'
import { DESIGN_COLORS } from '~/utils/planner/templates'

/**
 * Tokens: the colour roles with their live values and contrast (read from the page, so they follow the theme and the part
 * of the day), the area colours through fillFor, and the scales. The contrast numbers are the guard's (designContrast.test.ts).
 */
const dark = useState<boolean>('dark', () => false)
const part = useState<string>('styleguide-part', () => 'auto')

const COLOURS = ['--paper', '--surface', '--surface-2', '--line', '--control-border', '--accent', '--accent-soft', '--warn-bg', '--danger', '--ok']
const TEXT = ['--ink', '--ink-2', '--ink-3', '--accent', '--danger', '--ok', '--warn-ink', '--accent-ink', '--ink-inverse']
const SCALES = {
  type: ['caption', 'small', 'meta', 'ui', 'body', 'lede', 'title-s', 'title-m', 'title-l', 'page', 'hero', 'number'],
  space: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16],
  radius: ['xl', 'lg', 'md', 'sm', 'xs', 'pill'],
  motion: ['fast', 'base', 'moderate', 'enter', 'draw'],
  zIndex: ['raised', 'sticky', 'popover', 'tabbar', 'overlay', 'toast', 'tooltip', 'skip'],
}

const values = reactive<Record<string, string>>({})
const read = () => {
  const style = getComputedStyle(document.documentElement)
  for (const name of [...COLOURS, ...TEXT]) values[name] = style.getPropertyValue(name).trim()
}
onMounted(read)
watch([dark, part], () => nextTick(read))

/** The contrast of a token pair on the page as it is now (hex only; the gradient and rgba tokens show a dash) */
const ratio = (text: string, background: string): string => {
  const a = values[text] ?? ''
  const b = values[background] ?? ''
  if (!a.startsWith('#') || !b.startsWith('#')) return '—'
  return contrastRatio(a, b).toFixed(2)
}
const PAIRS: Array<[string, string]> = [
  ['--ink', '--paper'], ['--ink-2', '--surface'], ['--ink-3', '--paper'], ['--accent', '--surface'],
  ['--danger', '--surface'], ['--ok', '--surface'], ['--warn-ink', '--warn-bg'], ['--accent-ink', '--accent'],
]

/** Area colours through fillFor: the fill on the card and the paper of each theme, and the text on it */
const areas = DESIGN_COLORS.map(({ bg }) => {
  const light = fillFor(bg, false)
  const night = fillFor(bg, true)
  const worst = (fill: string, surfaces: readonly string[]) => Math.min(...surfaces.map(s => contrastRatio(fill, s)))
  return {
    bg,
    light,
    night,
    lightMin: worst(light, SURFACE.light).toFixed(2),
    darkMin: worst(night, SURFACE.dark).toFixed(2),
    ink: inkOn(light),
  }
})
</script>

<template>
  <section id="tokens" class="sg-section">
    <h2 class="section-title">Tokens</h2>

    <div class="sg-spec">
      <p class="sg-label">Colour roles and the text pairs the guard checks (live, for this theme and part of the day)</p>
      <table class="sg-table">
        <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Sample</th></tr></thead>
        <tbody>
          <tr v-for="name in COLOURS" :key="name">
            <th scope="row">{{ name }}</th>
            <td>{{ values[name] }}</td>
            <td><span class="sg-swatch" :style="{ '--sw': `var(${name})` }" /></td>
          </tr>
        </tbody>
      </table>
      <table class="sg-table">
        <thead><tr><th scope="col">Text on</th><th scope="col">Contrast</th><th scope="col">Sample</th></tr></thead>
        <tbody>
          <tr v-for="[text, background] in PAIRS" :key="`${text}${background}`">
            <th scope="row">{{ text }} on {{ background }}</th>
            <td>{{ ratio(text, background) }}</td>
            <td><span class="sg-pair" :style="{ '--sw': `var(${background})`, '--sg-ink': `var(${text})` }">Aa Ready</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Area colours (DESIGN_COLORS through fillFor: 3:1 on both surfaces of each theme)</p>
      <table class="sg-table">
        <thead><tr><th scope="col">Given</th><th scope="col">Light fill</th><th scope="col">Dark fill</th><th scope="col">Lowest, light</th><th scope="col">Lowest, dark</th></tr></thead>
        <tbody>
          <tr v-for="area in areas" :key="area.bg">
            <th scope="row">{{ area.bg }}</th>
            <td><span class="sg-swatch" :style="{ '--sw': area.light, '--sg-ink': area.ink }" />{{ area.light }}</td>
            <td><span class="sg-swatch" :style="{ '--sw': area.night }" />{{ area.night }}</td>
            <td>{{ area.lightMin }}</td>
            <td>{{ area.darkMin }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Type (rem, the browser size respected)</p>
      <p v-for="size in SCALES.type" :key="size" class="sg-type" :data-size="size">{{ size }}: The quick planner</p>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Space (4px steps; the bar is the width)</p>
      <div v-for="step in SCALES.space" :key="step" class="sg-space">
        <span class="sg-space-label">--sp-{{ step }}</span>
        <span class="sg-space-bar" :style="{ '--sg-w': `var(--sp-${step})` }" />
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Radius, and the concentric rule: a card (28px) with 16px padding holds a 12px box, so the 10px token</p>
      <div class="sg-row">
        <span v-for="radius in SCALES.radius" :key="radius" class="sg-radius" :class="`sg-r-${radius}`">{{ radius }}</span>
      </div>
      <div class="card sg-concentric">
        <div class="sg-concentric-inner">A box inside a card: --radius-sm</div>
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Elevation, motion, z-index and sizes (values; the motion is shown in Controls and Data)</p>
      <div class="sg-row">
        <span class="sg-elev" :style="{ '--sg-e': 'var(--elev-1)' }">elev-1</span>
        <span class="sg-elev" :style="{ '--sg-e': 'var(--elev-2)' }">elev-2</span>
      </div>
      <p class="sg-note">Motion: {{ SCALES.motion.map(name => `--dur-${name}`).join(', ') }}. Easing: --ease-out, --ease-spring, --ease-in-out.</p>
      <p class="sg-note">Z-index: {{ SCALES.zIndex.map(name => `--z-${name}`).join(', ') }}.</p>
      <p class="sg-note">Sizes: --hit 44px, --hit-lg 48px, --tick-lg 76px (64 on a phone), --icon 20px, --icon-sm 16px, --dot 10px.</p>
    </div>
  </section>
</template>
