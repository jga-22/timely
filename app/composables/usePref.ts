/** Options of a browser preference: its value when nothing is saved, how it is read and written, and an optional shared state name */
export interface PrefOptions<T> {
  fallback: T
  parse: (raw: string) => T
  serialise: (value: T) => string
  /** The useState key; defaults to the storage key. Set it when another composable reads the same state (useTheme and 'dark') */
  state?: string
}

/**
 * A browser preference, shared by every component that reads it (one state per key, so they agree). The saved value is
 * read after mount, so the first render matches the server. Storage that is blocked keeps the fallback for this visit.
 * Stored outside the planner state (utils/prefs.ts).
 */
export const usePref = <T>(key: string, options: PrefOptions<T>) => {
  const value = useState<T>(options.state ?? `pref:${key}`, () => options.fallback)
  const loaded = useState<boolean>(`pref-loaded:${key}`, () => false)

  onMounted(() => {
    if (loaded.value) return

    loaded.value = true

    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) value.value = options.parse(raw)
    } catch {
      // Storage is unavailable: the fallback stays for this visit
    }
  })

  const set = (next: T) => {
    value.value = next

    try {
      window.localStorage.setItem(key, options.serialise(next))
    } catch {
      // Not kept after a reload; the choice still holds for this visit
    }
  }

  return { value, set }
}
