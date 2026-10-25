/**
 * Screen navigation kept in the route query (FR-UX-5, assumption A5):
 *   ?tab=planner&item=<id>&edit=1
 * tab   home | goals | planner | visualization | configuration. Missing or unknown falls back to home.
 * item  id of the selected category, activity or habit. A screen ignores an id it does not know.
 * edit  "1" puts the selected item in edit mode.
 * Switching tab drops item and edit. Use `go` for a history entry (Back works) and `link` for NuxtLink.
 * Within a screen, `setSelection` changes item and edit and keeps the tab.
 */
export const TABS = [
  { id: 'home', label: 'Home', num: '01' },
  { id: 'goals', label: 'Goals', num: '02' },
  { id: 'planner', label: 'Planner', num: '03' },
  { id: 'visualization', label: 'Visualization', num: '04' },
  // Transitional: slice 3 removes it. It has no number.
  { id: 'configuration', label: 'Configuration', num: '' }
] as const

export type TabId = (typeof TABS)[number]['id']

export interface NavTarget {
  item?: string
  edit?: boolean
}

const TAB_IDS: string[] = TABS.map(tab => tab.id)

const toLocation = (tab: TabId, target: NavTarget = {}) => ({
  path: '/',
  query: {
    tab,
    ...(target.item ? { item: target.item } : {}),
    ...(target.edit ? { edit: '1' } : {})
  }
})

export const useNav = () => {
  const route = useRoute()
  const router = useRouter()

  const tab = computed<TabId>(() => {
    const value = typeof route.query.tab === 'string' ? route.query.tab : ''
    return (TAB_IDS.includes(value) ? value : 'home') as TabId
  })
  const item = computed(() => (typeof route.query.item === 'string' && route.query.item ? route.query.item : null))
  const edit = computed(() => route.query.edit === '1')

  /** Route to a screen, optionally with an item selected and in edit mode (for Edit links, FR-UX-4) */
  const link = (to: TabId, target?: NavTarget) => toLocation(to, target)

  /** Navigate with a history entry, so browser Back returns to the previous screen */
  const go = (to: TabId, target?: NavTarget) => router.push(toLocation(to, target))

  /** Change the selection or edit mode on the current screen. `replace` leaves no history entry (FR-UX-5) */
  const setSelection = (target: NavTarget = {}, replace = false) => {
    const location = toLocation(tab.value, target)
    return replace ? router.replace(location) : router.push(location)
  }

  return { tab, item, edit, link, go, setSelection }
}
