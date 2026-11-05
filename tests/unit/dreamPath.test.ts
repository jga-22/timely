import { describe, expect, it } from 'vitest'
import { dreamPathD, pathLayout, smoothPath } from '~/utils/dreamPath'

describe('pathLayout (Progress dream path)', () => {
  it('wide: a start and one node per area, alternating above and below the line, inside the box', () => {
    const { start, nodes } = pathLayout(true, 8)

    expect(nodes).toHaveLength(8)
    expect(nodes.map(node => node.side)).toEqual(['up', 'down', 'up', 'down', 'up', 'down', 'up', 'down'])
    expect([start, ...nodes].every(point => point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100)).toBe(true)
  })

  it('narrow: nodes run top to bottom, alternating left and right, in order', () => {
    const { nodes } = pathLayout(false, 8)

    expect(nodes.map(node => node.side)).toEqual(['right', 'left', 'right', 'left', 'right', 'left', 'right', 'left'])
    expect(nodes.every((node, index) => index === 0 || node.y > nodes[index - 1]!.y)).toBe(true)
  })

  it('a path with no nodes is only the start', () => {
    expect(pathLayout(true, 0).nodes).toEqual([])
  })
})

describe('smoothPath', () => {
  it('starts at the first point and draws one curve per step', () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }])

    expect(d.startsWith('M0 0')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(2)
    expect(d.endsWith('20 0')).toBe(true)
  })

  it('is empty for no points', () => {
    expect(smoothPath([])).toBe('')
  })

  it('the whole path has eight curves for eight nodes', () => {
    expect(dreamPathD(true, 8).match(/C/g)).toHaveLength(8)
    expect(dreamPathD(false, 8).match(/C/g)).toHaveLength(8)
  })
})
