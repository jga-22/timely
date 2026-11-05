/**
 * The geometry of the dream path (Progress, FR-PROG-6): one winding line from today through the life areas, in percent of the
 * path's box (viewBox 0 0 100 100). The wide layout runs left to right, the narrow one (a phone) top to bottom. Each node's label
 * sits on the side the node names. Pure, so it runs in node; the layout choice is made by the component (breakpoints.ts).
 */

export type PathSide = 'up' | 'down' | 'left' | 'right'

export interface PathNode {
  x: number
  y: number
  side: PathSide
}

export interface PathLayout {
  /** Where the line starts (the "Today" dot) */
  start: { x: number; y: number }
  /** One node per life area, in order */
  nodes: PathNode[]
}

/** The path for a count of nodes in one layout. Wide alternates above and below the line; narrow alternates left and right */
export const pathLayout = (wide: boolean, count: number): PathLayout => {
  if (wide) {
    // The upper nodes sit low enough for their labels (two or three lines) to clear the note above the track
    return {
      start: { x: 6, y: 80 },
      nodes: Array.from({ length: count }, (_, index) => {
        const up = index % 2 === 0

        return { x: 16 + index * 11.2, y: up ? 40 : 80, side: up ? 'up' : 'down' }
      })
    }
  }

  return {
    start: { x: 50, y: 3 },
    nodes: Array.from({ length: count }, (_, index) => {
      const left = index % 2 === 0

      return { x: left ? 30 : 70, y: 11 + index * 11, side: left ? 'right' : 'left' }
    })
  }
}

/** A smooth SVG path through the points (Catmull-Rom as cubic Béziers), starting at the first point */
export const smoothPath = (points: Array<{ x: number; y: number }>): string => {
  if (!points.length) return ''

  let d = `M${points[0]!.x} ${points[0]!.y}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]!
    const p1 = points[index]!
    const p2 = points[index + 1]!
    const p3 = points[index + 2] ?? p2

    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6

    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x} ${p2.y}`
  }

  return d
}

/** The whole path: the line through the start and the nodes */
export const dreamPathD = (wide: boolean, count: number): string => {
  const { start, nodes } = pathLayout(wide, count)

  return smoothPath([start, ...nodes])
}
