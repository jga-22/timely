import type { Router } from 'vue-router'

/** The longest a route change may hold its transition open, in ms: a navigation that never settles must not freeze the page */
export const VIEW_TRANSITION_MAX_MS = 1000

/**
 * Route changes (slice 11): a cross-fade between the three surfaces with the View Transitions API, under lively motion only.
 * Calm, and browsers without the API, get a short fade of the page (lively only) or nothing. A second navigation while a transition
 * runs skips its own transition. Every promise of the transition is caught, so an interrupted one is not an error. After a change of
 * surface (the `tab` in the URL), focus moves to the page's main landmark (#main), as the skip link does.
 */
export const installViewTransitions = (router: Router) => {
  const lively = () => typeof document !== 'undefined' && document.documentElement.dataset.motion === 'lively'
  let active = false
  let settle: (() => void) | null = null

  // The transition's callback waits for `settle`, which runs once the new page is in the DOM (or the navigation ends some other way)
  const finish = () => {
    settle?.()
    settle = null
  }

  router.beforeResolve((to, from) => {
    // The first navigation (the page opens) has no route to come from; it is not a change
    if (!from.matched.length || !lively() || typeof document.startViewTransition !== 'function') return
    if (active) return

    active = true
    const done = new Promise<void>(resolve => {
      settle = resolve
    })
    const timer = setTimeout(finish, VIEW_TRANSITION_MAX_MS)
    const transition = document.startViewTransition(() => done)
    ;[transition.ready, transition.finished, transition.updateCallbackDone].forEach(promise => promise.catch(() => {}))
    transition.finished.finally(() => {
      clearTimeout(timer)
      active = false
    })
  })

  // An interrupted or failed navigation releases the transition too
  router.onError(finish)

  router.afterEach((to, from) => {
    const surfaceChanged = to.query.tab !== from.query.tab
    if (from.matched.length && surfaceChanged) {
      document.getElementById('main')?.focus({ preventScroll: true })
    }

    // The page is in the DOM after the next tick; the transition shows the new one then
    nextTick(() => {
      finish()
      if (!from.matched.length || !lively() || typeof document.startViewTransition === 'function') return

      // Without the API: a short fade of the new page (lively only; the keyframes are in motion.css)
      const main = document.getElementById('main')
      main?.classList.remove('is-entering')
      void main?.offsetWidth
      main?.classList.add('is-entering')
    })
  })
}
