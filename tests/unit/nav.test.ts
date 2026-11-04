import { describe, expect, it } from 'vitest'
import { canonicalQuery, navQuery, placeQuery, placeRoute, resolveNav, sameQuery } from '../../app/utils/nav'

// Every URL the five-tab app used, the new forms, and the odd ones. The last Plan view defaults to Week.
describe('resolveNav: the old URLs', () => {
  it.each([
    [{ tab: 'home' }, 'today', null],
    [{ tab: 'goals' }, 'plan', 'dreams'],
    [{ tab: 'planner' }, 'plan', 'week'],
    [{ tab: 'year' }, 'plan', 'year'],
    [{ tab: 'insights' }, 'progress', null],
  ])('%j is the %s surface (view %s)', (query, surface, view) => {
    const state = resolveNav(query)
    expect(state.surface).toBe(surface)
    expect(state.view).toBe(view)
    expect(state.item).toBeNull()
    expect(state.edit).toBe(false)
  })

  it('keeps the item and edit of the old Week and Year links', () => {
    expect(resolveNav({ tab: 'planner', item: 'e1', edit: '1' })).toEqual({ surface: 'plan', view: 'week', item: 'e1', edit: true })
    expect(resolveNav({ tab: 'year', item: 'wt-2' })).toEqual({ surface: 'plan', view: 'year', item: 'wt-2', edit: false })
    expect(resolveNav({ tab: 'insights', item: 'x' })).toEqual({ surface: 'progress', view: null, item: 'x', edit: false })
  })

  it('reads category as the item of the old Goals link', () => {
    expect(resolveNav({ tab: 'goals', category: 'physical' })).toEqual({ surface: 'plan', view: 'dreams', item: 'physical', edit: false })
  })

  it('prefers item over category when both are given', () => {
    expect(resolveNav({ tab: 'goals', item: 'a', category: 'b' }).item).toBe('a')
  })

  it('reads the old visualization tab as Today', () => {
    expect(resolveNav({ tab: 'visualization' }).surface).toBe('today')
  })
})

describe('resolveNav: the new URLs', () => {
  it.each([
    ['dreams', 'dreams'],
    ['week', 'week'],
    ['year', 'year'],
  ])('plan with view=%s is that Plan view', (view, expected) => {
    expect(resolveNav({ tab: 'plan', view })).toEqual({ surface: 'plan', view: expected, item: null, edit: false })
  })

  it('reads today and progress as surfaces', () => {
    expect(resolveNav({ tab: 'today' })).toEqual({ surface: 'today', view: null, item: null, edit: false })
    expect(resolveNav({ tab: 'progress' })).toEqual({ surface: 'progress', view: null, item: null, edit: false })
  })

  it('passes the item and edit through on a Plan view', () => {
    expect(resolveNav({ tab: 'plan', view: 'week', item: 'e9', edit: '1' })).toEqual({ surface: 'plan', view: 'week', item: 'e9', edit: true })
    expect(resolveNav({ tab: 'plan', view: 'dreams', item: 'physical' })).toEqual({ surface: 'plan', view: 'dreams', item: 'physical', edit: false })
  })

  it('treats edit as on only for the value 1', () => {
    expect(resolveNav({ tab: 'plan', view: 'week', item: 'e', edit: 'true' }).edit).toBe(false)
    expect(resolveNav({ tab: 'plan', view: 'week', item: 'e', edit: '0' }).edit).toBe(false)
  })
})

describe('resolveNav: plan without a valid view', () => {
  it('uses Week when nothing was chosen this session', () => {
    expect(resolveNav({ tab: 'plan' }).view).toBe('week')
  })

  it('uses the last Plan view this session', () => {
    expect(resolveNav({ tab: 'plan' }, 'year').view).toBe('year')
    expect(resolveNav({ tab: 'plan' }, 'dreams').view).toBe('dreams')
  })

  it('treats an unknown view as no view', () => {
    expect(resolveNav({ tab: 'plan', view: 'bogus' }, 'year').view).toBe('year')
    expect(resolveNav({ tab: 'plan', view: 'insights' }).view).toBe('week')
  })

  it('ignores a view on the other surfaces', () => {
    expect(resolveNav({ tab: 'progress', view: 'year' })).toEqual({ surface: 'progress', view: null, item: null, edit: false })
  })
})

describe('resolveNav: unknown and missing values show Today', () => {
  it.each([
    [{}],
    [{ tab: '' }],
    [{ tab: 'bogus' }],
    [{ tab: 'constructor' }],
    [{ tab: '__proto__' }],
    [{ tab: ['home', 'goals'] }],
    [{ tab: 7 }],
  ])('%j is Today', query => {
    expect(resolveNav(query)).toEqual({ surface: 'today', view: null, item: null, edit: false })
  })
})

describe('placeRoute and the links', () => {
  it('maps every place to a surface and view', () => {
    expect(placeRoute('today')).toEqual({ surface: 'today', view: null })
    expect(placeRoute('progress')).toEqual({ surface: 'progress', view: null })
    expect(placeRoute('dreams')).toEqual({ surface: 'plan', view: 'dreams' })
    expect(placeRoute('week')).toEqual({ surface: 'plan', view: 'week' })
    expect(placeRoute('year')).toEqual({ surface: 'plan', view: 'year' })
    expect(placeRoute('plan', 'year')).toEqual({ surface: 'plan', view: 'year' })
  })

  it('builds the query of a link, with its selection', () => {
    expect(placeQuery('week', { item: 'e1', edit: true })).toEqual({ tab: 'plan', view: 'week', item: 'e1', edit: '1' })
    expect(placeQuery('year', { item: 'wt' })).toEqual({ tab: 'plan', view: 'year', item: 'wt' })
    expect(placeQuery('today')).toEqual({ tab: 'today' })
    expect(placeQuery('plan', undefined, 'dreams')).toEqual({ tab: 'plan', view: 'dreams' })
  })

  it('a link names no selection unless it is given one', () => {
    expect(placeQuery('dreams')).toEqual({ tab: 'plan', view: 'dreams' })
    expect(navQuery('plan', 'week', {})).toEqual({ tab: 'plan', view: 'week' })
  })
})

describe('canonicalQuery: the URL the shell writes', () => {
  it.each([
    [{ tab: 'home' }, { tab: 'today' }],
    [{ tab: 'goals' }, { tab: 'plan', view: 'dreams' }],
    [{ tab: 'goals', category: 'physical' }, { tab: 'plan', view: 'dreams', item: 'physical' }],
    [{ tab: 'planner', item: 'e1', edit: '1' }, { tab: 'plan', view: 'week', item: 'e1', edit: '1' }],
    [{ tab: 'year', item: 'wt-2' }, { tab: 'plan', view: 'year', item: 'wt-2' }],
    [{ tab: 'insights' }, { tab: 'progress' }],
    [{ tab: 'visualization' }, { tab: 'today' }],
    [{ tab: 'bogus' }, { tab: 'today' }],
    [{ tab: 'plan', view: 'bogus' }, { tab: 'plan', view: 'week' }],
  ])('%j becomes %j', (query, canonical) => {
    expect(canonicalQuery(query)).toEqual(canonical)
  })

  it('writes the last Plan view into a plan URL without one', () => {
    expect(canonicalQuery({ tab: 'plan' }, 'year')).toEqual({ tab: 'plan', view: 'year' })
  })

  it('keeps keys the model does not own (an auth code, for example)', () => {
    expect(canonicalQuery({ tab: 'home', code: 'abc' })).toEqual({ code: 'abc', tab: 'today' })
  })

  it('is a fixed point: canonicalising it again changes nothing', () => {
    const once = canonicalQuery({ tab: 'goals', category: 'physical', edit: '1' }, 'year')
    expect(canonicalQuery(once, 'year')).toEqual(once)
  })

  it('reads back to the same location it was written from', () => {
    const query = { tab: 'planner', item: 'e7', edit: '1' }
    const before = resolveNav(query)
    const after = resolveNav(canonicalQuery(query))
    expect(after).toEqual(before)
  })
})

describe('sameQuery', () => {
  it('ignores key order', () => {
    expect(sameQuery({ tab: 'plan', view: 'week' }, { view: 'week', tab: 'plan' })).toBe(true)
    expect(sameQuery({ tab: 'plan' }, { tab: 'plan', view: 'week' })).toBe(false)
    expect(sameQuery({ tab: 'home' }, { tab: 'today' })).toBe(false)
  })
})
