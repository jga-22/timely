import type { Session } from '@supabase/supabase-js'
import { resolveStorageMode } from '~/utils/storage/mode'
import type { StorageConfig } from '~/utils/storage/types'

export interface AuthUser {
  id: string
  email: string
  /** Name from the Google account (user_metadata), '' when the provider sends none */
  name: string
}

export interface AuthState {
  /** 'off' outside Supabase mode: no auth code runs and nothing is shown */
  status: 'off' | 'loading' | 'signed-out' | 'signed-in'
  user: AuthUser | null
}

let initialised = false

/** Sign-in state for Supabase mode: Google sign-in, session restore and sign-out. Kept apart from the storage adapter */
/** The Google name (full_name, or name); other providers may send neither */
const userName = (session: Session): string => {
  const meta = session.user.user_metadata ?? {}
  const name = meta.full_name || meta.name
  return typeof name === 'string' ? name : ''
}

export const useAuth = () => {
  const config = useRuntimeConfig().public as StorageConfig
  const enabled = resolveStorageMode(config) === 'supabase'

  const state = useState<AuthState>('auth', () => ({ status: enabled ? 'loading' : 'off', user: null }))

  const setSession = (session: Session | null) => {
    state.value = session
      ? { status: 'signed-in', user: { id: session.user.id, email: session.user.email ?? '', name: userName(session) } }
      : { status: 'signed-out', user: null }
  }

  const client = async () => {
    const { getSupabaseClient } = await import('~/utils/supabase')
    return getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey)
  }

  /** Restores the session (also after the Google redirect) and follows later changes */
  const init = async () => {
    if (initialised) return
    initialised = true

    const supabase = await client()
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))

    const { data } = await supabase.auth.getSession()
    setSession(data.session)
  }

  /** Starts the Google sign-in. The browser leaves for Google and returns to this origin; an error message is returned only if it could not start */
  const signInWithGoogle = async (): Promise<string | null> => {
    const supabase = await client()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })

    return error?.message ?? null
  }

  /** Signs out and clears the signed-in state. The storage layer does not write after this */
  const signOut = async () => {
    const supabase = await client()
    await supabase.auth.signOut()
    setSession(null)
  }

  return { state, init, signInWithGoogle, signOut }
}
