import {
  DEFAULT_PLAN_VIEW,
  navQuery,
  placeQuery,
  resolveNav,
  type NavState,
  type NavTarget,
  type Place,
  type PlanView
} from '~/utils/nav'

/** The last Plan view of this session (session state; a reload starts at Week). `plan` links and a plan URL without a view use it */
export const usePlanView = () => useState<PlanView>('nav-plan-view', () => DEFAULT_PLAN_VIEW)

/**
 * Screen navigation kept in the route query (FR-NAV-1 to 4; the rules are in utils/nav.ts):
 *   ?tab=plan&view=week&item=<id>&edit=1
 * surface today | plan | progress; view dreams | week | year on Plan. The old ?tab= values still resolve, and the shell
 * rewrites them once (composables/useNavSync.ts).
 * Callers name places: link(place, target) for a NuxtLink, go(place, target) for a history entry (Back works), and
 * setSelection(target) to change the item or edit mode on the current place (it keeps the place).
 * place is today, dreams, week, year, progress or plan (the last Plan view). item is a life area (Dreams), an entry (Week)
 * or a week type (Year); a screen ignores an id it does not know. edit "1" puts the item in edit mode.
 */
export const useNav = () => {
  const route = useRoute()
  const router = useRouter()
  const lastView = usePlanView()

  const state = computed<NavState>(() => resolveNav(route.query, lastView.value))
  const surface = computed(() => state.value.surface)
  const view = computed(() => state.value.view)
  const item = computed(() => state.value.item)
  const edit = computed(() => state.value.edit)

  /** A location for a place, optionally with an item selected and in edit mode (for Edit links, FR-UX-4) */
  const link = (to: Place, target?: NavTarget) => ({ path: '/', query: placeQuery(to, target, lastView.value) })

  /** Navigate with a history entry, so browser Back returns to the previous place */
  const go = (to: Place, target?: NavTarget) => router.push(link(to, target))

  /** Change the selection or edit mode on the current place. `replace` leaves no history entry (FR-UX-5) */
  const setSelection = (target: NavTarget = {}, replace = false) => {
    const location = { path: '/', query: navQuery(state.value.surface, state.value.view, target) }
    return replace ? router.replace(location) : router.push(location)
  }

  return { surface, view, item, edit, link, go, setSelection }
}
