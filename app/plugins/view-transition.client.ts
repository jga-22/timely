import { installViewTransitions } from '~/composables/useViewTransition'

/** Route changes cross-fade under lively motion (composables/useViewTransition.ts); client only */
export default defineNuxtPlugin(nuxtApp => {
  installViewTransitions(nuxtApp.$router)
})
