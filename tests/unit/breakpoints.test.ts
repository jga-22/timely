import { describe, expect, it, vi, afterEach } from 'vitest'
import { BREAKPOINTS, breakpointQuery, matchesBreakpoint } from '../../app/utils/breakpoints'

describe('breakpoints', () => {
  it('keeps the widths the CSS uses', () => {
    expect(BREAKPOINTS).toEqual({ phone: 480, tablet: 768, wide: 1100 })
  })

  it('builds a max query up to and including the width, and a min query from the next pixel', () => {
    expect(breakpointQuery('tablet')).toBe('(max-width: 768px)')
    expect(breakpointQuery('tablet', 'max')).toBe('(max-width: 768px)')
    expect(breakpointQuery('tablet', 'min')).toBe('(min-width: 769px)')
    expect(breakpointQuery('wide', 'min')).toBe('(min-width: 1101px)')
  })

  describe('matchesBreakpoint', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('asks the browser for the query and returns its answer', () => {
      const matchMedia = vi.fn((query: string) => ({ matches: query === '(min-width: 769px)' }))
      vi.stubGlobal('window', { matchMedia })
      expect(matchesBreakpoint('tablet', 'min')).toBe(true)
      expect(matchesBreakpoint('tablet', 'max')).toBe(false)
      expect(matchMedia).toHaveBeenCalledWith('(min-width: 769px)')
    })

    it('is false where there is no window (server, node tests)', () => {
      expect(matchesBreakpoint('phone')).toBe(false)
    })
  })
})
