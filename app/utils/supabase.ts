import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

/** One client per page; the session is kept by supabase-js in localStorage and restored on reload */
export const getSupabaseClient = (url: string, anonKey: string): SupabaseClient => {
  client ??= createClient(url, anonKey)
  return client
}
