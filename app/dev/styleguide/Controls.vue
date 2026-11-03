<script setup lang="ts">
/** Controls: buttons, icon buttons, chips, fields, the switch, the segmented control, the done tick and the disclosure */
import { DESIGN_COLORS } from '~/utils/planner/templates'
import { FALLBACK_COLOR } from '~/utils/palette'
const { areaVars } = usePlannerFill()
const sw = ref(true)
const sleep = ref(false)
const seg = ref<'day' | 'week'>('day')
const SEG_OPTIONS: { value: 'day' | 'week'; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
]
const tickOff = ref(false)
const tickOn = ref(true)
const tickLarge = ref(false)
const chips = ref(['Standard', 'Deep work', 'Vacation'])
const picked = ref('Standard')
const SWATCHES = DESIGN_COLORS.slice(0, 6).map(entry => entry.bg)
</script>

<template>
  <section id="controls" class="sg-section">
    <h2 class="section-title">Controls</h2>

    <div class="sg-spec">
      <p class="sg-label">Buttons: outline, primary, quiet, danger, disabled</p>
      <div class="sg-row">
        <button type="button" class="btn">Outline</button>
        <button type="button" class="btn btn-primary">Primary</button>
        <button type="button" class="btn btn-quiet">Quiet</button>
        <button type="button" class="btn btn-danger">Danger</button>
        <button type="button" class="btn btn-danger-solid">Delete my data</button>
        <button type="button" class="btn" disabled>Disabled</button>
      </div>
      <p class="sg-label">Small (36px, 44px on a touch screen) and extra small (28px)</p>
      <div class="sg-row">
        <button type="button" class="btn btn-sm">Small outline</button>
        <button type="button" class="btn btn-sm btn-primary">Small primary</button>
        <button type="button" class="btn btn-xs">Extra small</button>
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Icon buttons (the name is the aria-label) and the edit control</p>
      <div class="sg-row">
        <button type="button" class="btn btn-icon" aria-label="Previous year"><UiIcon name="left" size="sm" /></button>
        <button type="button" class="btn btn-icon" aria-label="Next year"><UiIcon name="right" size="sm" /></button>
        <button type="button" class="btn btn-icon" aria-label="Add"><UiIcon name="plus" /></button>
        <button type="button" class="btn btn-icon" aria-label="Close"><UiIcon name="close" /></button>
        <button type="button" class="btn btn-icon" aria-label="Show today"><UiIcon name="today" /></button>
        <EditButton label="Edit Morning run" />
        <EditButton label="Edit Morning run, pressed" expanded />
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Chips: a choice (pressed) and the add link</p>
      <div class="chips">
        <button v-for="name in chips" :key="name" type="button" class="chip" :data-active="picked === name" :aria-pressed="picked === name" @click="picked = name">
          <span class="dot" :style="areaVars(SWATCHES[chips.indexOf(name)] ?? FALLBACK_COLOR)" />
          <span class="t-name">{{ name }}</span>
          <span class="pill-count">{{ chips.indexOf(name) + 2 }}</span>
        </button>
        <button type="button" class="chip-add">+ New week type</button>
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Fields: a text field, a select, a checkbox and the rename field</p>
      <div class="sg-fields">
        <div class="field">
          <label class="field-label" for="sg-name">Name</label>
          <input id="sg-name" class="timely-input" value="Morning run">
        </div>
        <div class="field">
          <label class="field-label" for="sg-kind">Kind</label>
          <select id="sg-kind" class="timely-select"><option>Workout</option><option>Study</option></select>
        </div>
        <div class="field">
          <span class="field-label">Rename</span>
          <input class="pill-input" value="Deep work" aria-label="Rename week type">
        </div>
      </div>
      <label class="check"><input type="checkbox" checked> Repeat every week</label>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Switch (role switch; the label is the slot)</p>
      <div class="sg-row">
        <UiSwitch v-model="sw">Dark mode, on</UiSwitch>
        <UiSwitch v-model="sleep">Show sleep, off</UiSwitch>
        <UiSwitch v-model="sleep" label="Show sleep (screen readers only)" />
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Segmented control (aria-pressed)</p>
      <UiSegmented v-model="seg" :options="SEG_OPTIONS" label="Show in" />
    </div>

    <div class="sg-spec">
      <p class="sg-label">Done tick: to do, done, and the large tick (76px, 64 on a phone)</p>
      <div class="sg-row">
        <UiTick v-model="tickOff" label="Mark Run done" />
        <UiTick v-model="tickOn" label="Mark Stretch done" />
        <UiTick v-model="tickLarge" label="Mark Plan the day done" size="lg" />
      </div>
    </div>

    <div class="sg-spec">
      <p class="sg-label">Colour popover (inline) and the disclosure</p>
      <div class="color-pop color-pop-inline" role="group" aria-label="Colour">
        <button v-for="colour in SWATCHES" :key="colour" type="button" :aria-label="`Colour ${colour}`" :data-active="colour === SWATCHES[0]" :style="areaVars(colour)" />
      </div>
      <details class="disclosure">
        <summary>More options</summary>
        <div class="disclosure-body"><p class="sg-note">The disclosure opens with its plus and minus chevron.</p></div>
      </details>
    </div>
  </section>
</template>
