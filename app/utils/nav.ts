/**
 * The navigation model (FR-NAV-1 to 4, spec/ux-information-architecture.md option A): three surfaces, Today, Plan and Progress.
 * Plan has three views, Dreams, Week and Year. The URL keeps the state in its query:
 *   ?tab=today | plan | progress   &view=dreams | week | year   &item=<id>   &edit=1
 * item is the selected life area (Dreams), entry (Week) or week type (Year); edit puts it in edit mode.
 *
 * Old URLs still work and are rewritten once to the new form (canonicalQuery, in the shell):
 *   ?tab=home to today, goals to plan/dreams, planner to plan/week, year to plan/year, insights to progress.
 *   goals may carry category=<id> (the old selection), which is read as item.
 *   visualization, an unknown value, or an empty tab shows Today.
 *   plan without a valid view shows the last Plan view of this session (lastView; the default is Week).
 *
 * A place is what a link names: a surface, or one Plan view. `plan` means the last Plan view.
 * No Vue or router code here, so the rules are tested in tests/unit/nav.test.ts.
 */

export const SURFACES = ['today', 'plan', 'progress'] as const
export type Surface = (typeof SURFACES)[number]

/** The three surfaces as the rail and the phone tab bar show them, in this order */
export const SHELL_ITEMS: { place: Surface, label: string, icon: 'today' | 'plan' | 'progress' }[] = [
  { place: 'today', label: 'Today', icon: 'today' },
  { place: 'plan', label: 'Plan', icon: 'plan' },
  { place: 'progress', label: 'Progress', icon: 'progress' },
]

export const PLAN_VIEWS = ['dreams', 'week', 'year'] as const
export type PlanView = (typeof PLAN_VIEWS)[number]

/** What a link names: a surface, or one Plan view (`plan` is the last Plan view of the session) */
export type Place = Surface | PlanView

export const DEFAULT_PLAN_VIEW: PlanView = 'week'

/** The selection a link carries. Without it the link selects nothing */
export interface NavTarget {
  item?: string
  edit?: boolean
}

/** The resolved location: where the user is and what is selected */
export interface NavState {
  surface: Surface
  view: PlanView | null
  item: string | null
  edit: boolean
}

/** The query as the router gives it (values may be arrays when a key repeats) */
export type NavSource = Record<string, unknown>

/** The old ?tab= values, read once (a Map, so a name such as "constructor" is not a prototype property) */
const OLD_TABS = new Map<string, { surface: Surface, view?: PlanView }>([
  ['home', { surface: 'today' }],
  ['goals', { surface: 'plan', view: 'dreams' }],
  ['planner', { surface: 'plan', view: 'week' }],
  ['year', { surface: 'plan', view: 'year' }],
  ['insights', { surface: 'progress' }],
])

/** Query keys the model owns; any other key (for example an auth code) is kept when the URL is rewritten */
const OWNED_KEYS = ['tab', 'view', 'item', 'edit', 'category']

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')

const isSurface = (value: string): value is Surface => (SURFACES as readonly string[]).includes(value)

const isPlanView = (value: string): value is PlanView => (PLAN_VIEWS as readonly string[]).includes(value)

/** The location a query names. lastView is used for plan without a valid view */
export const resolveNav = (query: NavSource, lastView: PlanView = DEFAULT_PLAN_VIEW): NavState => {
  const tab = textOf(query.tab)
  const item = textOf(query.item) || textOf(query.category) || null
  const edit = query.edit === '1'

  if (tab === 'plan') {
    const view = textOf(query.view)
    return { surface: 'plan', view: isPlanView(view) ? view : lastView, item, edit }
  }
  if (isSurface(tab)) return { surface: tab, view: null, item, edit }

  const old = OLD_TABS.get(tab)
  if (old) return { surface: old.surface, view: old.view ?? null, item, edit }

  return { surface: 'today', view: null, item, edit }
}

/** The surface and Plan view a place names. plan is the last Plan view */
export const placeRoute = (place: Place, lastView: PlanView = DEFAULT_PLAN_VIEW): { surface: Surface, view: PlanView | null } => {
  if (place === 'plan') return { surface: 'plan', view: lastView }
  if (isPlanView(place)) return { surface: 'plan', view: place }
  return { surface: place, view: null }
}

/** The canonical query for a surface and view, with the selection the target gives (none when it is missing) */
export const navQuery = (surface: Surface, view: PlanView | null, target: NavTarget = {}): Record<string, string> => ({
  tab: surface,
  ...(surface === 'plan' && view ? { view } : {}),
  ...(target.item ? { item: target.item } : {}),
  ...(target.edit ? { edit: '1' } : {}),
})

/** The query a link to a place takes: the place, and its selection when given */
export const placeQuery = (place: Place, target?: NavTarget, lastView: PlanView = DEFAULT_PLAN_VIEW): Record<string, string> => {
  const route = placeRoute(place, lastView)
  return navQuery(route.surface, route.view, target)
}

/**
 * The query the URL should have for this query: the new names, the view written out, the selection kept (category read as
 * item). Keys the model does not own are kept. Running it again gives the same query (a fixed point).
 */
export const canonicalQuery = (query: NavSource, lastView: PlanView = DEFAULT_PLAN_VIEW): Record<string, unknown> => {
  const state = resolveNav(query, lastView)
  const kept = Object.fromEntries(Object.entries(query).filter(([key]) => !OWNED_KEYS.includes(key)))
  return {
    ...kept,
    ...navQuery(state.surface, state.view, { item: state.item ?? undefined, edit: state.edit }),
  }
}

/** Whether two queries hold the same keys and values (order does not count) */
export const sameQuery = (a: NavSource, b: NavSource): boolean => {
  const entries = (query: NavSource) => JSON.stringify(Object.entries(query).sort(([x], [y]) => x.localeCompare(y)))
  return entries(a) === entries(b)
}
