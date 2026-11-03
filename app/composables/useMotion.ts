import type { MotionChoice } from '~/utils/prefs'
import { PREF_KEYS, parseMotionChoice } from '~/utils/prefs'
import { resolveMotion, type Motion } from '~/utils/motion'

/**
 * The motion choice (Calm or Lively, kept in this browser) and what the page does now: the system's reduced motion forces
 * calm, whatever the choice. The html attributes data-motion (what runs) and data-choice (what the user picked) follow it.
 * Every JS-driven effect checks isLively() first. The control itself comes with the design primitives (spec, Components).
 */
export const useMotion = () => {
  const choice = usePref<MotionChoice>(PREF_KEYS.motion, {
    fallback: 'lively',
    parse: parseMotionChoice,
    serialise: value => value,
    state: 'motion-choice',
  })
  const reduce = useState<boolean>('motion-reduce', () => false)
  const motion = computed<Motion>(() => resolveMotion(choice.value.value, reduce.value))

  const apply = () => {
    if (!import.meta.client) return
    const root = document.documentElement
    root.setAttribute('data-motion', motion.value)
    root.setAttribute('data-choice', choice.value.value)
  }

  onMounted(() => {
    reduce.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    apply()
  })
  watch([motion, choice.value], apply)

  const setChoice = (next: MotionChoice) => choice.set(next)
  const isLively = (): boolean => motion.value === 'lively'

  return { choice: choice.value, motion, setChoice, isLively }
}
