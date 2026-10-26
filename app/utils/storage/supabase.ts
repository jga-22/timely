import type { PlannerState } from '~/types/planner'
import { isPlannerState } from '~/utils/planner'
import { getSupabaseClient } from '~/utils/supabase'
import type { PlannerStorage, StorageStatusHandler } from '~/utils/storage/types'

/** Trailing debounce for saves; the whole state is written each time, so only the latest matters */
const SAVE_DELAY_MS = 600

/**
 * Supabase adapter: one row per user in public.planner_state (spec/database/snapshot.sql).
 * The caller passes the signed-in user id. If the load fails, nothing is written, so the remote row is never overwritten by the seed.
 */
export const createSupabaseStorage = (url: string, anonKey: string, userId: string, onStatus: StorageStatusHandler): PlannerStorage => {
  const supabase = getSupabaseClient(url, anonKey)

  let loadFailed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: PlannerState | null = null
  let queue: Promise<void> = Promise.resolve()

  const write = async (state: PlannerState) => {
    onStatus('saving')

    try {
      const { error } = await supabase
        .from('planner_state')
        .upsert({
          user_id: userId,
          version: state.version,
          state,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (error) throw error
      onStatus('saved')
    } catch (error) {
      console.warn('Unable to save planner state to Supabase.', error)
      // The next change carries the full state again, so the next save retries
      onStatus('error', error instanceof Error ? error.message : 'Save failed.')
    }
  }

  const flush = () => {
    clearTimeout(timer)
    timer = undefined

    const state = pending
    pending = null

    if (state) {
      queue = queue.then(() => write(state))
    }

    return queue
  }

  // Start the request when the page is hidden, so the last change is not lost on navigation or tab close
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    async load() {
      onStatus('loading')

      try {
        const { data, error } = await supabase
          .from('planner_state')
          .select('state')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) throw error

        onStatus('saved')

        // A row from another version or with a broken shape is discarded, as in local storage
        const state: unknown = data?.state
        return isPlannerState(state) ? state : null
      } catch (error) {
        console.warn('Unable to load planner state from Supabase.', error)
        loadFailed = true
        onStatus('error', 'Could not load your saved planner. Changes are not saved until you reload.')
        return null
      }
    },
    save(state: PlannerState) {
      if (loadFailed) return

      // Snapshot now: the store keeps changing until the debounce fires
      pending = JSON.parse(JSON.stringify(state)) as PlannerState
      clearTimeout(timer)
      timer = setTimeout(flush, SAVE_DELAY_MS)
    }
  }
}
