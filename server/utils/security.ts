/**
 * Security headers and the Content-Security-Policy for the Nitro server. Pure: the plugin in server/plugins/security.ts
 * passes in the nonce and the Supabase URL from the runtime config. Read .claude/agent.md ("Security headers and CSP")
 * before changing a source: every new third-party script or origin needs a line here first.
 */

/** Sent on every response */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}

/** A fresh nonce for one HTML page: 16 random bytes, base64 (a valid CSP nonce-source) */
export function createNonce(random: Uint8Array = crypto.getRandomValues(new Uint8Array(16))): string {
  return btoa(String.fromCharCode(...random))
}

/** The Supabase project origin and its websocket twin (Realtime); none when the URL is empty or not http(s) */
export function supabaseSources(url: string): string[] {
  let origin: string
  try {
    origin = new URL(url).origin
  } catch {
    return []
  }
  if (!/^https?:/.test(origin)) return []
  return [origin, origin.replace(/^http/, 'ws')]
}

/** The policy for an HTML page. Scripts need the nonce (the inline dark-theme script, the Nuxt payload and bootstrap, the importmap). */
export function buildCsp(nonce: string, supabaseUrl: string): string {
  const connect = ["'self'", ...supabaseSources(supabaseUrl)]
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src ${connect.join(' ')}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ')
}

/** Puts the nonce on every script tag of a rendered page. Devalue escapes '<' in the payload, so only real tags match. */
export function addScriptNonce(html: string, nonce: string): string {
  return html.replace(/<script(?=[\s>])/g, `<script nonce="${nonce}"`)
}
