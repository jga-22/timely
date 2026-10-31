/**
 * Screen navigation kept in the route query (FR-UX-5, assumption A5):
 *   ?tab=planner&item=<id>&edit=1
 * tab   home | goals | planner | year | insights. Missing or unknown falls back to home (an old ?tab=visualization too).
 *       planner is the Week tab; year is the Year tab (painter, Weeks row, planned hours, life areas).
 * item  id of the selected category, activity or habit; on the Year tab, a week type id (the Weeks row starts with it).
 *       A screen ignores an id it does not know.
 * edit  "1" puts the selected item in edit mode.
 * Switching tab drops item and edit. Use `go` for a history entry (Back works) and `link` for NuxtLink.
 * Within a screen, `setSelection` changes item and edit and keeps the tab.
 */
export const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'goals', label: 'Goals' },
  { id: 'planner', label: 'Week' },
  { id: 'year', label: 'Year' },
  { id: 'insights', label: 'Insights' }
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
