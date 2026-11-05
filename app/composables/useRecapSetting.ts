import { PREF_KEYS, parseRecap, serialiseRecap } from '~/utils/prefs'

/**
 * The Weekly recap switch in the Progress settings: on by default, kept in this browser (PREF_KEYS.recap). Off hides the recap card;
 * the closed week is kept as it was.
 */
export const useRecapSetting = () => {
  const pref = usePref(PREF_KEYS.recap, { fallback: true, parse: parseRecap, serialise: serialiseRecap })

  return { recapOn: pref.value, setRecapOn: pref.set }
}
