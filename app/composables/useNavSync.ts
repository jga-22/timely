import type { LocationQueryRaw } from 'vue-router'
import { canonicalQuery, resolveNav, sameQuery } from '~/utils/nav'
import { usePlanView } from '~/composables/useNav'

/**
 * Keeps the URL in its canonical form (FR-NAV-5, mounted once in app.vue, client only). An old or unknown ?tab= is rewritten
 * with one router.replace, so Back goes to the page before the visit, not to the old URL. The last Plan view of the session
 * follows the URL. A URL with no tab is left alone: an auth code from a sign-in redirect stays in it.
 */
export const useNavSync = () => {
  if (!import.meta.client) return

  const route = useRoute()
  const router = useRouter()
  const lastView = usePlanView()

  watch(() => route.fullPath, () => {
    if (route.path !== '/' || !('tab' in route.query)) return

    const state = resolveNav(route.query, lastView.value)
    if (state.surface === 'plan' && state.view) lastView.value = state.view

    const next = canonicalQuery(route.query, lastView.value)
    if (!sameQuery(next, route.query)) router.replace({ path: '/', query: next as LocationQueryRaw })
  }, { immediate: true })
}
