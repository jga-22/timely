<script setup lang="ts">
/** Data: rings (the values and the done check), bars and stacked bars, a figure with its label, rows, cards and the header */
import { DESIGN_COLORS } from '~/utils/planner/templates'
const { areaVars } = usePlannerFill()
const ROWS = [
  { name: 'Morning run', meta: 'Physical, 3 h a week', colour: DESIGN_COLORS[3]!.bg },
  { name: 'Read', meta: 'Growth, 2 h a week', colour: DESIGN_COLORS[4]!.bg },
]
const SEGMENTS = [
  { label: 'Work', colour: DESIGN_COLORS[0]!.bg, weight: 5 },
  { label: 'Exercise', colour: DESIGN_COLORS[2]!.bg, weight: 2 },
  { label: 'Rest', colour: DESIGN_COLORS[5]!.bg, weight: 3 },
]
</script>

<template>
  <section id="data" class="sg-section">
    <h2 class="section-title">Data</h2>

    <div class="sg-spec">
      <p class="sg-label">Rings: 0, 38, 100, none yet, done (the check), ok tone; the arc draws in under lively motion</p>
      <div class="sg-row">
        <UiRing :value="0" label="0 of 5 done" />
        <UiRing :value="38" label="38 of 100 done" />
        <UiRing :value="100" tone="ok" label="All done" />
        <UiRing :value="null" />
        <UiRing :value="60" :size="56"><span>60%</span></UiRing>
        <UiRing :value="100" :size="28" done />
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Bars: one track with a share (--v), and a stacked track (--i is the weight of each part)</p>
      <div class="sg-stack">
        <div class="bar" role="img" aria-label="Planned 40 percent"><i style="--v: 0.4" /></div>
        <div class="bar" role="img" aria-label="Planned 90 percent" :style="areaVars(DESIGN_COLORS[0]!.bg)"><i /></div>
        <div class="bar-stack" role="img" aria-label="Work 5, exercise 2, rest 3 hours">
          <i v-for="segment in SEGMENTS" :key="segment.label" :style="{ '--i': segment.weight, ...areaVars(segment.colour) }" />
        </div>
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Figures: a stat with its label</p>
      <div class="sg-row sg-stats">
        <div class="stat"><span class="stat-value">64%</span><span class="stat-label">Ticked this week</span></div>
        <div class="stat"><span class="stat-value">12 h</span><span class="stat-label">Planned on Monday</span></div>
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Rows: a list of entries, each with its pencil at the end</p>
      <ul class="row-list">
        <li v-for="row in ROWS" :key="row.name" class="row-item">
          <span class="dot" :style="areaVars(row.colour)" />
          <div class="row-main">
            <span class="row-name">{{ row.name }}</span>
            <span class="row-meta">{{ row.meta }}</span>
          </div>
          <EditButton :label="`Edit ${row.name}`" />
        </li>
      </ul>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Cards: a card, a focal card, a section with its title</p>
      <div class="sg-cards">
        <div class="card"><h3 class="section-title">A card</h3><p class="sg-note">Surface, the card radius and the first elevation.</p></div>
        <div class="card card-focal"><h3 class="section-title">A focal card</h3><p class="sg-note">More room, the second elevation.</p></div>
      </div>
      <section class="section">
        <div class="section-head"><h3 class="section-title">A section</h3></div>
        <p class="sg-note">Hairline above, the section spacing.</p>
      </section>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Page header: eyebrow, title, meta and lede (the page title is the view's own size)</p>
      <div class="page-head">
        <p class="eyebrow">Week</p>
        <h3 class="page-title">Week</h3>
        <p class="page-meta">Week 45 of 2026</p>
      </div>
      <p class="lede">A lede gives the one line that says what a screen is for.</p>
    </div>
  </section>
</template>
