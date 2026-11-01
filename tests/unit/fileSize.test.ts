import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Structure guard: one file, one responsibility. A source file over the limit is split, not grown (see .claude/agent.md)
const MAX_LINES = 400
const ROOT = join(__dirname, '..', '..', 'app')

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(vue|ts)$/.test(name) ? [path] : []
  })

describe('source file size', () => {
  it(`keeps every .vue and .ts file in app/ at ${MAX_LINES} lines or fewer`, () => {
    const tooLong = sourceFiles(ROOT)
      .map(path => ({ path: relative(ROOT, path).replaceAll('\\', '/'), lines: readFileSync(path, 'utf8').split('\n').length }))
      .filter(file => file.lines > MAX_LINES)
      .map(file => `${file.path} (${file.lines})`)
    expect(tooLong).toEqual([])
  })
})
