import { describe, expect, it } from 'vitest'
import { parseDuration, timeAt } from '../utils/motion'

/**
 * Motion tokens read back from the stylesheet (layers/ui/utils/motion.ts). The
 * tokens are written in milliseconds, but the production build minifies every
 * time to its shortest form (`250ms` → `.25s`), so both units must read the same.
 * Libellus' tests/motion.test.ts, with `timeAt` added.
 */
describe('parseDuration', () => {
  it('reads milliseconds, as the dev server serves the tokens', () => {
    expect(parseDuration('250ms')).toBe(250)
    expect(parseDuration(' 340ms ')).toBe(340)
  })

  it('reads seconds, as the production build ships them', () => {
    expect(parseDuration('.25s')).toBe(250)
    expect(parseDuration('0.2s')).toBe(200)
    expect(parseDuration('1.1s')).toBe(1100)
    expect(parseDuration('.1S')).toBe(100)
  })

  it('reads anything else as no time', () => {
    expect(parseDuration('')).toBe(0)
    expect(parseDuration('250')).toBe(0)
    expect(parseDuration('fast')).toBe(0)
  })
})

describe('timeAt', () => {
  const standard = 'cubic-bezier(0.2, 0, 0, 1)'

  it('finds the time at which a curve shows a progress: the curve read backwards', () => {
    expect(timeAt(standard, 0)).toBeCloseTo(0, 4)
    expect(timeAt(standard, 1)).toBeCloseTo(1, 4)
    // `standard` is fast out of the gate: half the way is shown long before half the time.
    const half = timeAt(standard, 0.5)
    expect(half).toBeGreaterThan(0.1)
    expect(half).toBeLessThan(0.3)
  })

  it('is linear for the linear curve and for anything that is not a cubic-bezier', () => {
    expect(timeAt('cubic-bezier(0, 0, 1, 1)', 0.3)).toBeCloseTo(0.3, 3)
    expect(timeAt('linear', 0.42)).toBe(0.42)
  })

  it('reads the minified form', () => {
    expect(timeAt('cubic-bezier(.2,0,0,1)', 0.5)).toBeCloseTo(timeAt(standard, 0.5), 6)
  })
})
