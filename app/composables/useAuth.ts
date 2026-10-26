import type { Session } from '@supabase/supabase-js'
import { resolveStorageMode } from '~/utils/storage/mode'
import type { StorageConfig } from '~/utils/storage/types'

export interface AuthUser {
  id: string
  email: string
}

export interface AuthState {
  /** 'off' outside Supabase mode: no auth code runs and nothing is shown */
  status: 'off' | 'loading' | 'signed-out' | 'signed-in'
  user: AuthUser | null
}

let initialised = false

/** Sign-in state for Supabase mode: email magic link, session restore and sign-out. Kept apart from the storage adapter */
export const useAuth = () => {
  const config = useRuntimeConfig().public as StorageConfig
  const enabled = resolveStorageMode(config) === 'supabase'

  const state = useState<AuthState>('auth', () => ({ status: enabled ? 'loading' : 'off', user: null }))

  const setSession = (session: Session | null) => {
    state.value = session
      ? { status: 'signed-in', user: { id: session.user.id, email: session.user.email ?? '' } }
      : { status: 'signed-out', user: null }
  }

  const client = async () => {
    const { getSupabaseClient } = await import('~/utils/supabase')
    return getSupabaseClient(config.supabaseUrl, config.supabaseAnonKey)
  }

  /** Restores the session (also after a magic-link redirect) and follows later changes */
  const init = async () => {
    if (initialised) return
    initialised = true

    const supabase = await client()
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))

    const { data } = await supabase.auth.getSession()
    setSession(data.session)
  }

  /** Sends the magic link. Returns an error message, or null when the email was sent */
  const signIn = async (email: string): Promise<string | null> => {
    const supabase = await client()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })

    return error?.message ?? null
  }

  const signOut = async () => {
    const supabase = await client()
    await supabase.auth.signOut()
    setSession(null)
  }

  return { state, init, signIn, signOut }
}
