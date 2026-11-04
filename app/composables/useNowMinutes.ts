/** How often the clock of Today is read (the countdown and the now marker move by minutes) */
const TICK_MS = 30_000

/**
 * The minute of the day on this device, for the countdown and the now marker of Today. Read on mount and every 30 seconds, and
 * null until then, so the first server and client passes agree (FR-DATE-6). Client only: the timer is set on mount.
 */
export const useNowMinutes = () => {
  const minute = ref<number | null>(null)
  let timer: number | undefined

  const read = () => {
    const now = new Date()
    minute.value = now.getHours() * 60 + now.getMinutes()
  }

  onMounted(() => {
    read()
    timer = window.setInterval(read, TICK_MS)
  })

  onUnmounted(() => window.clearInterval(timer))

  return minute
}
