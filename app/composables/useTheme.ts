import { PREF_KEYS, parseDark, serialiseDark } from '~/utils/prefs'

/**
 * Dark mode. The state is the shared useState('dark') that usePlannerFill reads; the attribute on <html> follows it
 * (the prepaint script sets it before first paint, so this only changes it after that).
 */
export const useTheme = () => {
  const pref = usePref<boolean>(PREF_KEYS.dark, { fallback: false, parse: parseDark, serialise: serialiseDark, state: 'dark' })

  watch(pref.value, (on) => {
    if (import.meta.client) document.documentElement.setAttribute('data-theme', on ? 'dark' : '')
  })

  const toggle = () => pref.set(!pref.value.value)

  return { dark: pref.value, toggle }
}
