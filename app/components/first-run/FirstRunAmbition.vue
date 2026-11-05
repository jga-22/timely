<script setup lang="ts">
/** Step 1: the 5-year ambition in one sentence. Enter is Next (the ambition is one line; IME composition keeps its Enter) */
const { answers, error, next } = useFirstRun()

const onInput = (event: Event) => {
  answers.value.ambition = (event.target as HTMLTextAreaElement).value.replace(/\s*\n\s*/g, ' ')
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.isComposing) return
  event.preventDefault()
  next()
}
</script>

<template>
  <section class="firstrun-step" aria-labelledby="firstrun-title">
    <h1 id="firstrun-title" class="firstrun-title" tabindex="-1">What do you want to become?</h1>
    <p class="firstrun-lede">One sentence. It can be rough, and you can change it later.</p>
    <label class="firstrun-sr" for="firstrun-ambition">Your ambition</label>
    <textarea
      id="firstrun-ambition"
      class="firstrun-line firstrun-line-area"
      rows="3"
      placeholder="For example: Stronger, calmer, and able to keep up with my kids."
      :value="answers.ambition"
      :aria-invalid="error && !answers.ambition.trim() ? 'true' : undefined"
      @input="onInput"
      @keydown="onKeydown"
    />
  </section>
</template>
