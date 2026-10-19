import { describe, expect, it } from 'vitest'
import { AXIS_SLOP, atScrollTop, dismisses, lockAxis, routeMove, scrolls, settle, velocityOf } from '../utils/sheetDrag'

/**
 * Which one a finger moves in a bottom sheet, the sheet or its content (UiSheet, the member
 * sheet; composables/useSheetTouch.ts listens, utils/sheetDrag.ts decides): iOS' rule.
 */
describe('routeMove', () => {
  // The finger came down on content that stood at its top (the gesture that may pull the sheet).
  const atTopStart = true

  it('scrolls the content on a downward move while it is scrolled down', () => {
    expect(routeMove(10, false, 0, atTopStart)).toBe('scroll')
    expect(routeMove(10, false, 300, atTopStart)).toBe('scroll')
  })

  it('moves the sheet on a downward move once the content is at its top', () => {
    expect(routeMove(10, true, 0, atTopStart)).toBe('sheet')
    expect(routeMove(10, true, 300, atTopStart)).toBe('sheet')
  })

  it('leaves a gesture that came down on scrolled content to that content (r10)', () => {
    // It scrolled to the top by itself: iOS keeps the gesture the scroll's (its rubber band),
    // so the sheet stands still instead of following the finger down and collapsing to medium.
    expect(routeMove(10, true, 0, false)).toBe('scroll')
    expect(routeMove(10, true, 300, false)).toBe('scroll')
    // An upward move is unaffected: it grows a sheet that stands below its tallest place,
    // however the gesture began (the member sheet's medium detent is not a scroller at all).
    expect(routeMove(-10, true, 300, false)).toBe('sheet')
  })

  it('brings a sheet below its tallest place up before it scrolls (a lower detent grows)', () => {
    expect(routeMove(-10, true, 300, atTopStart)).toBe('sheet')
    expect(routeMove(-10, false, 40, atTopStart)).toBe('sheet')
  })

  it('scrolls on an upward move once the sheet stands at its tallest place', () => {
    expect(routeMove(-10, true, 0, atTopStart)).toBe('scroll')
    expect(routeMove(-10, false, 0, atTopStart)).toBe('scroll')
  })

  it('hands one gesture from the sheet to the content, once the sheet is up', () => {
    // A sheet standing 300 px below its tallest place (a lower detent, or one a finger dragged
    // down): the finger up brings it up first, the moves after that scroll the content.
    let scrollTop = 0
    let position = 300
    for (let i = 0; i < 100; i++) {
      const delta = -5
      if (routeMove(delta, scrollTop <= 1, position, atTopStart) === 'sheet') position = Math.max(0, position + delta)
      else scrollTop -= delta
    }
    expect({ scrollTop, position }).toEqual({ scrollTop: 200, position: 0 })
  })

  it('hands a downward drag that began at the top straight to the sheet', () => {
    // The pull that closes it: the content is at its top and stays there.
    let scrollTop = 0
    let position = 0
    for (let i = 0; i < 4; i++) {
      const delta = 5
      if (routeMove(delta, scrollTop <= 1, position, atTopStart) === 'sheet') position += delta
      else scrollTop = Math.max(0, scrollTop - delta)
    }
    expect({ scrollTop, position }).toEqual({ scrollTop: 0, position: 20 })
  })

  it('leaves a downward drag that found the content scrolled to the content', () => {
    // Scrolled down 30 px, the finger comes down 50: all 50 scroll the content, up to its
    // top, with nothing left for the sheet (r10).
    let scrollTop = 30
    let position = 0
    for (let i = 0; i < 10; i++) {
      const delta = 5
      if (routeMove(delta, scrollTop <= 1, position, false) === 'sheet') position += delta
      else scrollTop = Math.max(0, scrollTop - delta)
    }
    expect({ scrollTop, position }).toEqual({ scrollTop: 0, position: 0 })
  })

  it('leaves a still finger to the content', () => {
    expect(routeMove(0, true, 100, atTopStart)).toBe('scroll')
  })
})

describe('scroll metrics', () => {
  it('reads scrollTop 0 (and a sub-pixel off it) as the top', () => {
    expect(atScrollTop({ scrollTop: 0, scrollHeight: 900, clientHeight: 500 })).toBe(true)
    expect(atScrollTop({ scrollTop: 0.5, scrollHeight: 900, clientHeight: 500 })).toBe(true)
    expect(atScrollTop({ scrollTop: 2, scrollHeight: 900, clientHeight: 500 })).toBe(false)
  })

  it('reads a reversed column the other way round: its top is the most negative scrollTop', () => {
    const column = { scrollHeight: 900, clientHeight: 500, reversed: true }
    expect(atScrollTop({ ...column, scrollTop: 0 })).toBe(false)
    expect(atScrollTop({ ...column, scrollTop: -400 })).toBe(true)
    // A column that fits has nothing above: both ends are the same place.
    expect(atScrollTop({ scrollTop: 0, scrollHeight: 500, clientHeight: 500, reversed: true })).toBe(true)
  })

  it('knows content that does not fill its box does not scroll', () => {
    expect(scrolls({ scrollTop: 0, scrollHeight: 500, clientHeight: 500 })).toBe(false)
    expect(scrolls({ scrollTop: 0, scrollHeight: 501, clientHeight: 500 })).toBe(false)
    expect(scrolls({ scrollTop: 0, scrollHeight: 640, clientHeight: 500 })).toBe(true)
  })
})

describe('lockAxis', () => {
  it('waits until the finger has moved', () => {
    expect(lockAxis(1, 2)).toBeNull()
    expect(lockAxis(AXIS_SLOP - 1, 0)).toBeNull()
  })

  it('reads the first real movement and which way it leans', () => {
    expect(lockAxis(0, AXIS_SLOP)).toBe('vertical')
    expect(lockAxis(2, 12)).toBe('vertical')
    expect(lockAxis(12, 2)).toBe('horizontal')
    expect(lockAxis(-9, 5)).toBe('horizontal')
  })
})

describe('velocityOf', () => {
  it('is px per ms over the last 100 ms, down is positive', () => {
    const samples = [
      { y: 100, time: 0 },
      { y: 130, time: 30 },
      { y: 190, time: 60 },
    ]
    expect(velocityOf(samples, 62)).toBeCloseTo(1.5)
    expect(velocityOf(samples.map((s) => ({ ...s, y: -s.y })), 62)).toBeCloseTo(-1.5)
  })

  it('forgets what lies further back than the window', () => {
    const samples = [
      { y: 0, time: 0 },
      { y: 400, time: 20 },
      { y: 410, time: 150 },
      { y: 420, time: 180 },
    ]
    expect(velocityOf(samples, 185)).toBeCloseTo(10 / 30)
  })

  it('is 0 for a finger that stopped before it let go, and for one sample', () => {
    expect(velocityOf([{ y: 0, time: 0 }, { y: 200, time: 40 }], 300)).toBe(0)
    expect(velocityOf([{ y: 0, time: 0 }], 10)).toBe(0)
    expect(velocityOf([], 10)).toBe(0)
  })
})

describe('dismisses (a sheet with one detent)', () => {
  it('lets go after 80 px, or a quick flick', () => {
    expect(dismisses(81, 0)).toBe(true)
    expect(dismisses(60, 0.2)).toBe(false)
    expect(dismisses(30, 0.8)).toBe(true)
  })

  it('does not count a twitch as a flick', () => {
    expect(dismisses(8, 2)).toBe(false)
  })
})

describe('settle (a sheet with medium and large)', () => {
  // Medium stands 400 px below large and is 300 px high.
  const detents = { mediumPosition: 400, mediumHeight: 300, closeShare: 0.35 }

  it('goes to the nearer detent when let go slowly', () => {
    expect(settle(150, 0, detents)).toBe('large')
    expect(settle(250, 0, detents)).toBe('medium')
    expect(settle(400, 0, detents)).toBe('medium')
    expect(settle(0, 0, detents)).toBe('large')
  })

  it('takes a flick on to the next detent', () => {
    expect(settle(120, 0.6, detents)).toBe('medium')
    expect(settle(280, -0.6, detents)).toBe('large')
  })

  it('closes from past medium, whatever the speed', () => {
    expect(settle(400 + 106, 0, detents)).toBe('close')
    expect(settle(400 + 90, 0, detents)).toBe('medium')
  })

  it('closes on a flick down from medium, as on iOS', () => {
    expect(settle(430, 0.8, detents)).toBe('close')
    // …but a quick pull from large to medium stops at medium.
    expect(settle(380, 0.3, detents)).toBe('medium')
  })
})
