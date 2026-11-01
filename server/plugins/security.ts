import { setResponseHeaders } from 'h3'
import { addScriptNonce, buildCsp, createNonce, SECURITY_HEADERS } from '../utils/security'

// Security headers on every response, and a Content-Security-Policy with a fresh nonce for each HTML page.
// Set here, not in routeRules: on Vercel the route rules are also written to the platform route config, so a header
// could be sent twice (a repeated nosniff or X-Frame-Options can make a browser ignore it). See .claude/agent.md.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    setResponseHeaders(event, SECURITY_HEADERS)
  })

  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (typeof response.body !== 'string') return
    const nonce = createNonce()
    response.body = addScriptNonce(response.body, nonce)
    response.headers = {
      ...response.headers,
      'Content-Security-Policy': buildCsp(nonce, useRuntimeConfig(event).public.supabaseUrl),
    }
  })
})
