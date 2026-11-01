import { describe, expect, it } from 'vitest'
import { addScriptNonce, buildCsp, createNonce, supabaseSources } from '../../server/utils/security'

describe('createNonce', () => {
  it('encodes 16 bytes as base64 (a valid CSP nonce)', () => {
    const nonce = createNonce(new Uint8Array(16).fill(255))
    expect(nonce).toBe('/////////////////////w==')
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/)
  })
})

describe('supabaseSources', () => {
  it('gives the https origin and its wss twin', () => {
    expect(supabaseSources('https://abcd.supabase.co/rest/v1')).toEqual(['https://abcd.supabase.co', 'wss://abcd.supabase.co'])
  })
  it('gives nothing for an empty or non-http URL', () => {
    expect(supabaseSources('')).toEqual([])
    expect(supabaseSources('not a url')).toEqual([])
  })
})

describe('buildCsp', () => {
  it('uses the nonce for scripts and no unsafe-inline for scripts', () => {
    const csp = buildCsp('n0nce==', '')
    expect(csp).toContain("script-src 'self' 'nonce-n0nce=='")
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("connect-src 'self';")
  })
  it('adds the Supabase origin and websocket to connect-src when configured', () => {
    expect(buildCsp('x', 'https://abcd.supabase.co')).toContain("connect-src 'self' https://abcd.supabase.co wss://abcd.supabase.co;")
  })
  it('allows the Google Fonts hosts only', () => {
    const csp = buildCsp('x', '')
    expect(csp).toContain('style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com')
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com")
  })
})

describe('addScriptNonce', () => {
  it('adds the nonce to every script tag and leaves the rest alone', () => {
    const html = '<head><script type="importmap">{}</script><script>x()</script><link rel="stylesheet"></head>'
    expect(addScriptNonce(html, 'abc')).toBe(
      '<head><script nonce="abc" type="importmap">{}</script><script nonce="abc">x()</script><link rel="stylesheet"></head>',
    )
  })
})
