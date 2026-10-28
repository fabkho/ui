import { describe, expect, it } from 'vitest'
import {
  keyboardInsetOf,
  keyboardRoomOf,
  keyboardShown,
  layoutHeightOf,
  paletteBottomOnScreen,
  paletteLift,
  pinHold,
  pinHolds,
  readViewport,
  revealDelta,
  sheetLift,
  strandedViewport,
  type ViewportReading,
  type ViewportSample,
} from '../app/utils/keyboard'

/**
 * Following the on-screen keyboard (composables/useKeyboardInset.ts, UiSheet): how
 * much of the window it covers, how far a sheet goes up to sit on it, and how
 * far the sheet's body scrolls to show the focused field.
 */
describe('the keyboard inset', () => {
  it('is what of the window the visual viewport neither shows nor has scrolled past', () => {
    // iPhone 16: 852 tall, a 336 keyboard.
    expect(keyboardInsetOf(852, { height: 516, offsetTop: 0 })).toBe(336)
    // Safari panned the page up by 120 to show the field: the keyboard still covers 336.
    expect(keyboardInsetOf(852, { height: 516, offsetTop: 0.4 })).toBe(336)
    expect(keyboardInsetOf(852, { height: 396, offsetTop: 120 })).toBe(336)
  })

  it('is 0 with the keyboard down, without a visual viewport, and never negative', () => {
    expect(keyboardInsetOf(852, { height: 852, offsetTop: 0 })).toBe(0)
    expect(keyboardInsetOf(852, null)).toBe(0)
    // Pinch-zoomed out past the window: nothing is covered.
    expect(keyboardInsetOf(852, { height: 900, offsetTop: 0 })).toBe(0)
  })
})

// What Chrome 145 on a Pixel 9 emulator (411 × 923, gesture navigation) reported
// in a browser tab, its toolbar shown: 813 tall without the keyboard; with Gboard
// up the gesture inset goes and 477 of 789 stay visible (e2e/android/smoke.ts).
describe('the keyboard inset on Android', () => {
  it('is the covered part when Chrome lays the keyboard over the page (resizes-visual)', () => {
    expect(keyboardInsetOf(layoutHeightOf(789, 789), { height: 477, offsetTop: 0 })).toBe(312)
    // Chrome panned the page up to show a field under the keyboard: the fixed sheet is in view.
    expect(keyboardInsetOf(layoutHeightOf(789, 789), { height: 477, offsetTop: 312 })).toBe(0)
  })

  it('still finds the layout viewport where innerHeight follows the visual viewport', () => {
    expect(layoutHeightOf(477, 789)).toBe(789)
    expect(keyboardInsetOf(layoutHeightOf(477, 789), { height: 477, offsetTop: 0 })).toBe(312)
  })

  it('is 0 when Chrome resizes the page to the keyboard (resizes-content): no second lift', () => {
    expect(keyboardInsetOf(layoutHeightOf(477, 477), { height: 477, offsetTop: 0 })).toBe(0)
  })

  it('takes the taller height where Safari has collapsed its toolbar', () => {
    // iPhone 16 Safari: the small viewport (clientHeight) 659, the current one 745.
    expect(layoutHeightOf(745, 659)).toBe(745)
    expect(layoutHeightOf(852, 852)).toBe(852)
  })
})

describe('a sheet on the keyboard', () => {
  it('goes up by the keyboard, less its home-indicator padding that may go behind it', () => {
    expect(sheetLift(336, 34)).toBe(302)
    expect(sheetLift(336, 0)).toBe(336)
  })

  it('stays where it is with the keyboard down', () => {
    expect(sheetLift(0, 34)).toBe(0)
    expect(sheetLift(20, 34)).toBe(0)
  })
})

// What Safari on iOS 27 (iPhone 18 Pro simulator, 402 × 874) reported in a tab:
// 714 tall; the review field in the Finish sheet focused, 384 left in view, and
// Safari panned the page down by 330 to the field, so the inset reads 0.
describe('the room a sheet has on the keyboard', () => {
  it('is what the visual viewport shows, wherever Safari has panned to', () => {
    expect(keyboardInsetOf(layoutHeightOf(633, 714), { height: 384, offsetTop: 330 })).toBe(0)
    expect(keyboardRoomOf(layoutHeightOf(633, 714), { height: 384, scale: 1 })).toBe(384)
    expect(keyboardRoomOf(714, { height: 384.4 })).toBe(384)
  })

  it('is no limit with the keyboard down, pinch-zoomed, or where Chrome resized the page', () => {
    expect(keyboardRoomOf(714, { height: 714, scale: 1 })).toBeNull()
    expect(keyboardRoomOf(714, { height: 357, scale: 2 })).toBeNull()
    expect(keyboardRoomOf(layoutHeightOf(477, 477), { height: 477, scale: 1 })).toBeNull()
    expect(keyboardRoomOf(714, null)).toBeNull()
  })
})

describe('revealing the focused field in a sheet', () => {
  const body = { top: 100, bottom: 400 }

  it('leaves a field that shows whole', () => {
    expect(revealDelta(body, { top: 200, bottom: 250 }, 16)).toBe(0)
  })

  it('scrolls down just enough for a field below the fold, with the margin', () => {
    expect(revealDelta(body, { top: 380, bottom: 430 }, 16)).toBe(46)
  })

  it('scrolls up just enough for a field above it', () => {
    expect(revealDelta(body, { top: 60, bottom: 110 }, 16)).toBe(-56)
  })

  it('lines a field taller than the body up with its top', () => {
    expect(revealDelta(body, { top: 150, bottom: 600 }, 16)).toBe(34)
  })
})

describe('the search palette on the keyboard', () => {
  it('goes up by the keyboard plus its gap, less where float-bottom already puts it', () => {
    // 336 keyboard, 12 gap, resting 30 above the bottom edge (safe area 34 - 4).
    expect(paletteLift(336, 12, 30)).toBe(318)
  })

  it('stays where it is with the keyboard down, and never goes down', () => {
    expect(paletteLift(0, 12, 30)).toBe(0)
    expect(paletteLift(10, 12, 30)).toBe(0)
  })
})

describe('whether a keyboard is up', () => {
  it('is when it covers part of the window (iOS)', () => {
    expect(keyboardShown(336, 852, 852)).toBe(true)
  })

  it('is when it made the page shorter than it was at this width (Chrome on Android, resizes-content)', () => {
    // The Pixel 9's installed app: 845 tall, 533 with Gboard up; the inset reads 0.
    expect(keyboardShown(0, 533, 845)).toBe(true)
  })

  it('is not for a browser toolbar coming and going, nor for iOS\'s bar over a hardware keyboard', () => {
    // iPhone 16 Safari: 659 with the toolbar, 745 without.
    expect(keyboardShown(0, 659, 745)).toBe(false)
    // Only the accessory bar (a hardware keyboard attached): about 50.
    expect(keyboardShown(50, 852, 852)).toBe(false)
    expect(keyboardShown(0, 852, 852)).toBe(false)
  })
})

describe('what counts as a keyboard', () => {
  it('ignores a covered height under 80 (iOS 26\'s accessory bar alone over a hardware keyboard, a toolbar)', () => {
    expect(keyboardInsetOf(852, { height: 802, offsetTop: 0 })).toBe(0)
    expect(keyboardInsetOf(852, { height: 773, offsetTop: 0 })).toBe(0)
    expect(keyboardInsetOf(852, { height: 772, offsetTop: 0 })).toBe(80)
  })

  it('reads the installed iOS 26 app against the layout viewport that holds still (Tamagui, on a device)', () => {
    // visualViewport 714 → 404 while innerHeight wobbles to 561 and clientHeight stays 714.
    expect(keyboardInsetOf(layoutHeightOf(561, 714), { height: 404, offsetTop: 0 })).toBe(310)
    expect(keyboardInsetOf(layoutHeightOf(714, 714), { height: 714, offsetTop: 0 })).toBe(0)
  })
})

/**
 * A model of what iOS reports while the search palette takes the keyboard (r10), fed through the one reader
 * (readViewport) step by step, as useKeyboardViewport does: a reading in the event itself (`settled` false: the
 * installed app's `offsetTop` can still be the old one there, WebKit bug 237851), then the ones a frame or more on.
 * `actual` is where the visual viewport really is; the palette is right when its bottom is `gap` above the
 * keyboard's top edge on the screen (`viewport.height`: the accessory pill is outside the visual viewport).
 *
 * Numbers: an iPhone 15 Pro (393 × 852) in the installed app, the owner's screenshot of 2026-10-13: keyboard and
 * pill cover 366, so 486 stay in view; the palette's bottom stood at 325 instead of 478, 155 too high — the pan iOS
 * made to reveal the query, which the pin had taken as 0. innerHeight wobbling under clientHeight is Tamagui's
 * measurement on iOS 26.
 */
describe('the search palette on the iOS keyboard, step by step (r10)', () => {
  const gap = 8
  const resting = 30
  interface Step {
    what: string
    sample: ViewportSample
    actual: number
    settled: boolean
  }
  const sample = (height: number, offsetTop: number, innerHeight = 852, clientHeight = 852): ViewportSample => ({
    innerHeight,
    clientHeight,
    viewport: { height, offsetTop, scale: 1 },
  })

  /** Replays the steps through the reader and returns, per step, where the palette's bottom is against where it should be. */
  function replay(steps: Step[], pinned = true) {
    let pan = 0
    return steps.map((step) => {
      const reading: ViewportReading = readViewport(step.sample, { pinned, settled: step.settled, pan })
      pan = reading.pan
      const keyboardUp = reading.inset > 0
      const bottom = paletteBottomOnScreen(reading, step.actual, gap, resting)
      // Keyboard down: at rest, not lifted (a pan iOS leaves behind moves everything fixed alike; nothing to follow).
      const want = keyboardUp ? step.sample.viewport!.height - gap : reading.layout - resting - step.actual
      return { what: step.what, settled: step.settled, inset: reading.inset, bottom, want }
    })
  }

  const focusAndPan: Step[] = [
    { what: 'before the focus', sample: sample(852, 0), actual: 0, settled: true },
    // The installed app reports the keyboard's end height as it starts to move; innerHeight wobbles, clientHeight holds.
    { what: 'the keyboard starts (resize event)', sample: sample(486, 0, 561), actual: 0, settled: false },
    { what: 'mid-animation', sample: sample(486, 0, 700), actual: 0, settled: true },
    // iOS pans the visual viewport to the query; the window cannot scroll (root overflow hidden), so the pin cannot undo it.
    { what: 'the pan, in its own event (offsetTop still 0)', sample: sample(486, 0, 561), actual: 155, settled: false },
    { what: 'the pan, two frames on', sample: sample(486, 155, 561), actual: 155, settled: true },
    { what: 'settled (300 ms on)', sample: sample(486, 155), actual: 155, settled: true },
    // QuickType's bar comes (44) and goes, on its own schedule.
    { what: 'QuickType bar on, in its event', sample: sample(442, 155), actual: 155, settled: false },
    { what: 'QuickType bar on', sample: sample(442, 155), actual: 155, settled: true },
    { what: 'QuickType bar off', sample: sample(486, 155), actual: 155, settled: true },
    // A drag on the chrome scrolled the window and the pin put it back: the pan is gone.
    { what: 'after a scroll put back, settled', sample: sample(486, 0), actual: 0, settled: true },
    // Done: the keyboard goes; on iOS 26 the visual viewport can stay panned (Apple Developer Forums 800125).
    { what: 'the keyboard down, still panned', sample: sample(852, 24), actual: 24, settled: true },
    { what: 'the next keyboard (resize event)', sample: sample(486, 0), actual: 0, settled: false },
    { what: 'the next keyboard, settled', sample: sample(486, 0), actual: 0, settled: true },
  ]

  it('sits right above the keyboard in every settled step', () => {
    for (const step of replay(focusAndPan).filter((s) => s.settled)) {
      expect({ what: step.what, bottom: step.bottom }).toEqual({ what: step.what, bottom: step.want })
    }
  })

  it('rides the keyboard from its first event, before the pan is known', () => {
    const [, starts] = replay(focusAndPan)
    expect(starts!.bottom).toBe(486 - gap)
    expect(starts!.inset).toBe(366)
  })

  it('keeps the pan it knew through an event that reads the old offsetTop (QuickType)', () => {
    const steps = replay(focusAndPan)
    const quickType = steps.find((s) => s.what === 'QuickType bar on, in its event')!
    expect(quickType.bottom).toBe(quickType.want)
  })

  it('is off by the pan only inside the event that reports it, for a frame', () => {
    const steps = replay(focusAndPan)
    expect(steps.filter((s) => s.bottom !== s.want).map((s) => s.what)).toEqual(['the pan, in its own event (offsetTop still 0)'])
  })

  it('reproduces the screenshot when the pan is taken as 0 (the pinned reader before r10)', () => {
    const before = keyboardInsetOf(layoutHeightOf(561, 852), { height: 486, offsetTop: 0 })
    expect(before).toBe(366)
    // Its bottom stood at 486 − 8 − 155 = 323 on the screen: about the 325 of the owner's screenshot.
    expect(paletteBottomOnScreen({ inset: before, layout: 852 }, 155, gap, resting)).toBe(323)
  })

  it('starts the next keyboard from no pan once the keyboard went down', () => {
    expect(readViewport(sample(852, 24), { pinned: true, settled: true, pan: 155 }).pan).toBe(0)
    expect(readViewport(sample(852, 24), { pinned: true, settled: true, pan: 155 }).inset).toBe(0)
  })

  it('takes offsetTop as it is when not pinned (a field in the page) or pinch-zoomed, as Libellus does', () => {
    expect(readViewport(sample(486, 155), { pinned: false, settled: false, pan: 0 }).inset).toBe(211)
    const zoomed = { innerHeight: 852, clientHeight: 852, viewport: { height: 300, offsetTop: 200, scale: 2 } }
    expect(readViewport(zoomed, { pinned: true, settled: false, pan: 0 }).pan).toBe(200)
  })

  it('fits the palette in what stays in view, so its far end is on the screen and its list can reach every row', () => {
    // room − safe area top (59) − xxxl (48) − gap: the most the palette may be; its top then sits under the status bar.
    const reading = readViewport(sample(486, 155), { pinned: true, settled: true, pan: 0 })
    expect(reading.room).toBe(486)
    const height = reading.room! - 59 - 48 - gap
    const bottom = paletteBottomOnScreen(reading, 155, gap, resting)
    expect(bottom - height).toBe(59 + 48)
  })

  it('reads no keyboard without a visual viewport', () => {
    expect(readViewport({ innerHeight: 852, clientHeight: 852, viewport: null }, { pinned: true, settled: true, pan: 0 })).toEqual({
      inset: 0,
      room: null,
      layout: 852,
      pan: 0,
    })
  })
})

/**
 * The tab bar left up the screen (r10: on Friends, ~330 pt up, no keyboard in sight), replayed through
 * strandedViewport the way watchStrandedViewport takes it: a field in a pinned sheet takes the keyboard, iOS pans the
 * visual viewport to it (the window cannot scroll under the sheet), the sheet closes, the keyboard goes — and iOS 26
 * leaves the pan (Apple Developer Forums 800125). Fixed chrome then stands `offsetTop` up the screen, so the tab bar's
 * bottom on the screen is `layout − floatBottom − offsetTop + --viewport-pan`.
 */
describe('the tab bar after a keyboard in a sheet (r10)', () => {
  const float = 21
  interface Step {
    what: string
    height: number
    offsetTop: number
    typing: boolean
    innerHeight?: number
  }
  function replay(steps: Step[], options: { standalone?: boolean; nudgeHelps?: boolean } = {}) {
    let nudged = false
    let pan = 0
    let tallest = 0
    // The watcher's memory of a keyboard: a field took the focus, until the viewport reads clear again.
    let keyboardSince = false
    const out: { what: string; barBottom: number; nudge: boolean; reflow: boolean }[] = []
    for (const step of steps) {
      const layout = step.innerHeight ?? 852
      tallest = Math.max(tallest, layout)
      let offsetTop = step.offsetTop
      if (step.typing) keyboardSince = true
      let verdict = strandedViewport(
        { innerHeight: layout, clientHeight: layout, viewport: { height: step.height, offsetTop, scale: 1 } },
        { tallest, typing: step.typing, nudged, standalone: options.standalone ?? true, keyboardSince },
      )
      const nudge = verdict.nudge
      if (verdict.nudge) {
        nudged = true
        if (options.nudgeHelps) offsetTop = 0
        // The watcher looks again after its nudge.
        verdict = strandedViewport(
          { innerHeight: layout, clientHeight: layout, viewport: { height: step.height, offsetTop, scale: 1 } },
          { tallest, typing: step.typing, nudged, standalone: options.standalone ?? true, keyboardSince },
        )
      }
      // A look that reads clear forgets the keyboard, but not the one right after the watcher's own nudge: iOS may
      // pan again once the nudge has passed.
      if (verdict.clear && !nudge) keyboardSince = false
      if (!verdict.pan) nudged = false
      pan = verdict.pan
      out.push({ what: step.what, barBottom: layout - float - offsetTop + pan, nudge, reflow: verdict.reflow })
    }
    return out
  }

  const sheetThenTabs: Step[] = [
    { what: 'Friends, before', height: 852, offsetTop: 0, typing: false },
    { what: 'a field in a sheet takes the keyboard', height: 486, offsetTop: 0, typing: true },
    { what: 'iOS pans to the field', height: 486, offsetTop: 330, typing: true },
    { what: 'the sheet closes, the keyboard goes; the pan stays', height: 852, offsetTop: 330, typing: false },
    { what: 'a scroll on Friends, still panned', height: 852, offsetTop: 330, typing: false },
    { what: 'iOS lets go of the pan', height: 852, offsetTop: 0, typing: false },
  ]

  it('puts the tab bar back on the screen\'s bottom after the keyboard, whether or not the nudge helps', () => {
    for (const nudgeHelps of [true, false]) {
      // While the keyboard is up the tab bar is under the sheet and the keyboard: only the steps without it count.
      for (const step of replay(sheetThenTabs, { nudgeHelps }).filter((_, n) => !sheetThenTabs[n]!.typing)) {
        expect({ what: step.what, barBottom: step.barBottom }).toEqual({ what: step.what, barBottom: 852 - float })
      }
    }
  })

  it('tries the scroll nudge first, once', () => {
    expect(replay(sheetThenTabs).map((s) => s.nudge)).toEqual([false, false, false, true, false, false])
  })

  it('leaves the keyboard to the reader while a field has the focus or the keyboard is up', () => {
    const viewport = { height: 486, offsetTop: 330, scale: 1 }
    const after = { nudged: true, standalone: true, keyboardSince: true }
    expect(strandedViewport({ innerHeight: 852, clientHeight: 852, viewport }, { ...after, tallest: 852, typing: true })).toEqual({ nudge: false, pan: 0, reflow: false, clear: false })
    expect(strandedViewport({ innerHeight: 852, clientHeight: 852, viewport }, { ...after, tallest: 852, typing: false }).pan).toBe(0)
    const zoomed = { height: 426, offsetTop: 200, scale: 2 }
    expect(strandedViewport({ innerHeight: 852, clientHeight: 852, viewport: zoomed }, { ...after, tallest: 852, typing: false }).pan).toBe(0)
  })

  it('measures the installed app\'s viewport again when iOS 26.0 shrank it for good (WebKit bug 301857)', () => {
    // 852 → 744 after the keyboard, innerHeight, clientHeight and the visual viewport alike; no pan.
    const shrunk: Step[] = [
      { what: 'before', height: 852, offsetTop: 0, typing: false },
      { what: 'keyboard', height: 486, offsetTop: 0, typing: true },
      { what: 'after, shrunk', height: 744, offsetTop: 0, typing: false, innerHeight: 744 },
    ]
    expect(replay(shrunk).map((s) => s.reflow)).toEqual([false, false, true])
    // Not in a Safari tab, where toolbars change the height too.
    expect(replay(shrunk, { standalone: false }).map((s) => s.reflow)).toEqual([false, false, false])
  })
})

// The hold of a pinned screen (r10, iPhone, iOS 26.6): a Feed post opened from far down the list kept the list's
// scroll as its hold, and with the keyboard up the pin scrolled the window there, the comment bar down behind the
// keyboard's accessory pill. Measured in Playwright (WebKit, 390 × 844): Feed scrolled down, a post opened, its pin
// put the window back to the list's 8030 instead of the post's 0.
describe('where a pinned screen holds the window', () => {
  const list = { x: 0, y: 8030 }
  const post = { x: 0, y: 0 }

  it('is where the page is when a field takes the keyboard, not where the page before it was scrolled to', () => {
    expect(pinHold(list, post, false)).toEqual(post)
  })

  it('stays while the keyboard is up (the focus moves from one field to the next, iOS has panned)', () => {
    expect(pinHold(post, { x: 0, y: 336 }, true)).toEqual(post)
  })
})

// Bookretreats, 2026-10-28 (P0): a member scrolled to the comments of a Feed post in the installed app (iPhone), no
// keyboard anywhere, and the comment bar went under the screen; „Antworten“ and „…“ did nothing, Back neither, and a
// moment later the list jumped to its top. The watcher had read a pan (and a shrunk viewport) that no keyboard had
// left behind, moved the bottom chrome and every sheet down by it (`--viewport-pan`, the „…“ sheet rose under the
// screen and left the app inert) and flipped the page (the reflow that puts every scrolled list back to its top).
describe('a viewport no keyboard left behind', () => {
  const sample = (height: number, offsetTop: number, innerHeight = 852) => ({ innerHeight, clientHeight: innerHeight, viewport: { height, offsetTop, scale: 1 } })
  const options = { tallest: 852, typing: false, nudged: false, standalone: true, keyboardSince: false }

  it('is left alone: no nudge, no pan, no reflow', () => {
    expect(strandedViewport(sample(852, 140), options)).toEqual({ nudge: false, pan: 0, reflow: false, clear: false })
    expect(strandedViewport(sample(852, 140), { ...options, nudged: true })).toEqual({ nudge: false, pan: 0, reflow: false, clear: false })
    expect(strandedViewport(sample(740, 0, 740), options)).toEqual({ nudge: false, pan: 0, reflow: false, clear: false })
  })

  it('keeps the bar on the screen through a scroll that reads a pan, and heals it once a keyboard was up', () => {
    let keyboardSince = false
    let nudged = false
    const look = (height: number, offsetTop: number, typing = false) => {
      if (typing) keyboardSince = true
      let verdict = strandedViewport(sample(height, offsetTop), { ...options, typing, nudged, keyboardSince })
      const nudge = verdict.nudge
      if (nudge) {
        nudged = true
        verdict = strandedViewport(sample(height, offsetTop), { ...options, typing, nudged, keyboardSince })
      }
      if (verdict.clear && !nudge) keyboardSince = false
      if (!verdict.pan) nudged = false
      return verdict.pan
    }
    expect(look(852, 0)).toBe(0) // the post, at rest
    expect(look(852, 140)).toBe(0) // she scrolls the comments; iOS reads a pan: the bar stays
    expect(look(852, 0)).toBe(0)
    expect(look(486, 0, true)).toBe(0) // she answers: the field takes the keyboard
    expect(look(852, 330)).toBe(330) // the keyboard went, the pan stayed (r10): healed as before
    expect(look(852, 0)).toBe(0) // iOS let go: clear, the keyboard is forgotten
    expect(look(852, 140)).toBe(0) // the next scroll that reads a pan is left alone again
  })

  it('reports the viewport clear only at rest', () => {
    expect(strandedViewport(sample(852, 0), options).clear).toBe(true)
    expect(strandedViewport(sample(852, 0), { ...options, typing: true }).clear).toBe(false)
    expect(strandedViewport(sample(486, 0), options).clear).toBe(false)
    expect(strandedViewport(sample(744, 0, 744), options).clear).toBe(false)
  })
})

describe('when a pinned screen holds the window at all', () => {
  it('holds while a field has the focus or the keyboard is up', () => {
    expect(pinHolds(true, false)).toBe(true)
    expect(pinHolds(false, true)).toBe(true)
  })

  it('follows the page with the keyboard down and no field focused (a Feed post opened from far down the Feed)', () => {
    expect(pinHolds(false, false)).toBe(false)
  })
})
