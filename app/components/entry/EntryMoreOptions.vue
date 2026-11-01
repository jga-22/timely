<script setup lang="ts">
import { shortCodeFor } from '~/utils/onboarding'
import type { EntryDraft, EntryErrors } from '~/utils/entries/draft'
import { DESIGN_COLORS } from '~/utils/planner/templates'

/**
 * The "More options" of the one form (FR-ITEM-3): the short code and the colour of a timed entry, or of the Sleep activity (whose code is
 * locked). Edits the form's draft in place. Enter in the short code emits submit, so the form saves as Enter does in its name field.
 */
const props = defineProps<{
  /** The form's id prefix, so the field ids stay the form's */
  uid: string
  draft: EntryDraft
  errors: EntryErrors
  isSleep: boolean
}>()

const emit = defineEmits<{
  submit: []
}>()

const timed = computed(() => props.draft.durationMinutes > 0)
</script>

<template>
  <details class="entry-more">
    <summary class="btn btn-sm">More options</summary>
    <div class="form-stack entry-more-body">
      <template v-if="timed || isSleep">
        <div class="field">
          <label class="field-label" :for="`${uid}-code`">Short code</label>
          <input
            :id="`${uid}-code`"
            v-model="draft.shortCode"
            class="timely-input"
            maxlength="3"
            :disabled="isSleep"
            :placeholder="draft.name.trim() ? shortCodeFor(draft.name) : 'ABC'"
            :aria-invalid="!!errors.shortCode"
            :aria-describedby="errors.shortCode ? `${uid}-code-error` : undefined"
            @keydown.enter.prevent="emit('submit')"
          />
          <p v-if="isSleep" class="form-hint">Sleep keeps the code SLP: it is how Timely knows this activity.</p>
          <p v-if="errors.shortCode" :id="`${uid}-code-error`" class="field-error" role="alert">{{ errors.shortCode }}</p>
        </div>

        <div class="field">
          <span class="field-label">Colour</span>
          <div class="color-pop color-pop-inline">
            <button
              v-for="dc in DESIGN_COLORS"
              :key="dc.id"
              type="button"
              :style="{ background: dc.bg }"
              :data-active="draft.color === dc.bg"
              :aria-label="`Colour ${dc.id}`"
              @click="draft.color = dc.bg"
            />
          </div>
        </div>
      </template>
      <p v-else class="form-hint">The short code and colour belong to a timed item.</p>
    </div>
  </details>
</template>

<style scoped>
.entry-form .form-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--ink-3);
}

.entry-more summary {
  align-self: flex-start;
  margin-top: var(--space-2);
  cursor: pointer;
  list-style: none;
}

.entry-more summary::-webkit-details-marker {
  display: none;
}

.entry-more-body {
  margin-top: var(--space-3);
}
</style>
