/**
 * The geometry behind following the on-screen keyboard (composables/useKeyboardInset.ts,
 * components/ui/Sheet.vue, components/shell/SearchOverlay.vue). Pure, so a native port copies it and the tests pin it.
 *
 * Two models meet here. iOS lays the keyboard over the page: the layout viewport
 * (where `position: fixed` things sit) keeps its height and only the visual
 * viewport shrinks, so the palette and the sheets lift themselves by what is
 * covered. Chrome on Android, told `interactive-widget=resizes-content`
 * (nuxt.config.ts), shrinks the layout viewport itself: nothing is covered, the
 * inset reads 0 and fixed chrome already stands on the keyboard — no second lift.
 */

/**
 * The layout viewport's height: the larger of `innerHeight` and the root's
 * `clientHeight`. Usually they agree; where a browser takes `innerHeight` from
 * the visual viewport (Chromium does while pinch-zoomed, and has done for the
 * keyboard), `clientHeight` still is the layout viewport, and where Safari has
 * collapsed its toolbar `innerHeight` is the taller, current one. In the installed iOS 26 app (Tamagui's
 * Sheet measured it on a device: visualViewport 714 → 404, innerHeight 714 → 561 and wobbling) only
 * `clientHeight` holds still at 714; the larger of the two is then `clientHeight` itself, which is what
 * Tamagui's `getStableLayoutViewportHeight` reads. Taking the larger also covers the toolbar case above.
 */
export function layoutHeightOf(innerHeight: number, clientHeight: number): number {
  return Math.max(innerHeight, clientHeight)
}

/**
 * How much of the window the keyboard covers: the part of the layout viewport
 * the visual viewport neither shows nor has scrolled past. 0 without a visual
 * viewport, with the keyboard down, or where the keyboard resized the layout
 * viewport instead (Chrome on Android with `resizes-content`).
 */
export function keyboardInsetOf(windowHeight: number, viewport: { height: number; offsetTop: number } | null): number {
  if (!viewport) return 0
  const covered = Math.max(0, Math.round(windowHeight - viewport.height - viewport.offsetTop))
  return covered < MIN_KEYBOARD_HEIGHT ? 0 : covered
}

/**
 * The least that counts as a keyboard (added for Bookretreats, after Tamagui's Sheet, which ignores changes
 * under 80 px "so URL bar collapses and accessory bars do not read as a keyboard"): iOS 26's form accessory bar
 * alone over a hardware keyboard covers about 50.
 */
export const MIN_KEYBOARD_HEIGHT = 80

/**
 * How tall the part of the page the member still sees is while the keyboard is
 * up (the visual viewport's height), or null with it down or while
 * pinch-zoomed. Unlike the inset this does not depend on where the browser has
 * panned to: Safari ignores `interactive-widget` and pans the visual viewport
 * down to a focused field near the bottom, so the inset can read 0 with the
 * keyboard up, and a sheet sized to the layout viewport then runs off the top
 * of the screen. A sheet that never grows past this stays whole.
 */
export function keyboardRoomOf(
  layoutHeight: number,
  viewport: { height: number; scale?: number } | null,
): number | null {
  if (!viewport || Math.abs((viewport.scale ?? 1) - 1) > 0.01) return null
  return viewport.height < layoutHeight - 1 ? Math.round(viewport.height) : null
}

/**
 * Whether an on-screen keyboard is up (added for Bookretreats): it covers part of the
 * window (iOS), or it made the layout viewport shorter than the tallest seen at
 * this width (Chrome on Android with `resizes-content`, where the inset reads 0).
 * A browser toolbar coming and going moves less than `threshold`.
 */
export function keyboardShown(inset: number, layoutHeight: number, tallestHeight: number, threshold = 120): boolean {
  return inset > threshold || tallestHeight - layoutHeight > threshold
}

/**
 * How far a bottom sheet goes up to sit on the keyboard. The sheet's own
 * bottom padding is for the home indicator, which the keyboard covers too, so
 * that part may go behind it.
 */
export function sheetLift(keyboard: number, bottomPadding: number): number {
  return keyboard > 0 ? Math.max(0, keyboard - bottomPadding) : 0
}

/**
 * How far a scroller has to scroll (px, + down) so an element inside it shows
 * whole, with `margin` around it — the least that does, like
 * `scrollIntoView({ block: 'nearest' })` but for this one scroller only. An
 * element taller than the scroller lines up with its top.
 */
export function revealDelta(
  scroller: { top: number; bottom: number },
  element: { top: number; bottom: number },
  margin = 0,
): number {
  const above = element.top - margin - scroller.top
  const below = element.bottom + margin - scroller.bottom
  if (above < 0) return above
  if (below > 0) return Math.min(below, above)
  return 0
}

/**
 * How far up the search palette goes to sit `gap` above the keyboard, from its
 * resting `bottom` (what `float-bottom` gives it). Never down, and not at all
 * with the keyboard down.
 */
export function paletteLift(keyboard: number, gap: number, resting: number): number {
  return keyboard > 0 ? Math.max(0, keyboard + gap - resting) : 0
}

/** One look at the window, as the shared reader (composables/useKeyboardInset.ts) takes it. */
export interface ViewportSample {
  innerHeight: number
  clientHeight: number
  viewport: { height: number; offsetTop: number; scale?: number } | null
}

/** What the reader makes of a sample: the keyboard inset, the room left in view, and the pan it went by. */
export interface ViewportReading {
  inset: number
  room: number | null
  /** The layout viewport's height the inset is measured against (`layoutHeightOf`). */
  layout: number
  /** How far the visual viewport is taken to be panned down (its `offsetTop`, once that can be trusted). */
  pan: number
}

/**
 * The one measurement of the keyboard (added for Bookretreats), for every layer that stands on it: UiSheet,
 * UiConfirm, the search palettes, the chat. Everything fixed is laid out in the layout viewport, and what the
 * member sees of it starts `offsetTop` down: a layer stands on the keyboard when its bottom is at
 * `offsetTop + height` of the visual viewport, so the inset is `layout − height − offsetTop` (Libellus' and
 * Tamagui's formula).
 *
 * The pan is where iOS is unreliable. In the installed app the visual viewport's `offsetTop` reads 0 inside its own
 * `resize` event while it is really panned (WebKit bug 237851: right 50 ms later, or two frames on), and on iOS 26 it
 * can stay panned after the keyboard went (Apple Developer Forums 800125). So a reading taken in the event
 * (`settled` false) keeps the pan it had (`pan`), and one taken a frame or more later (`settled`) takes `offsetTop`
 * as it is. A pinned layer used to take the pan as 0 always, trusting the pin to undo it — but iOS also pans the
 * visual viewport where the window cannot scroll (the root is `overflow: hidden` under a modal layer), the pin then
 * has nothing to put back, and the layer went up by the keyboard and the pan together (r10: the palette ~155 pt
 * over the keyboard on an iPhone, its top off the screen).
 *
 * Pinch-zoomed or not pinned, the pan is `offsetTop` as it is (Libellus).
 */
export function readViewport(sample: ViewportSample, options: { pinned: boolean; settled: boolean; pan: number }): ViewportReading {
  const layout = layoutHeightOf(sample.innerHeight, sample.clientHeight)
  const viewport = sample.viewport
  if (!viewport) return { inset: 0, room: null, layout, pan: 0 }
  const zoomed = Math.abs((viewport.scale ?? 1) - 1) > 0.01
  const offsetTop = Math.max(0, viewport.offsetTop)
  const pan = !options.pinned || zoomed || options.settled ? offsetTop : options.pan
  // With the keyboard down the pan moves nothing; the next keyboard starts from none (its event reads 0 anyway).
  const down = viewport.height >= layout - MIN_KEYBOARD_HEIGHT
  return {
    inset: keyboardInsetOf(layout, { height: viewport.height, offsetTop: pan }),
    room: keyboardRoomOf(layout, viewport),
    layout,
    pan: down ? 0 : pan,
  }
}

/**
 * Where a layer standing on the keyboard has its bottom edge on the screen (px from the top of what the member
 * sees), given the reading it was lifted by and where the visual viewport really is: for the tests' model of iOS
 * (web/tests/ui-keyboard.test.ts) and for anyone checking a placement by hand.
 */
export function paletteBottomOnScreen(reading: Pick<ViewportReading, 'inset' | 'layout'>, actualOffsetTop: number, gap: number, resting: number): number {
  return reading.layout - resting - paletteLift(reading.inset, gap, resting) - actualOffsetTop
}

/**
 * What to do about a viewport iOS left behind once the keyboard has gone (added for Bookretreats, r10: the tab bar
 * stood ~330 pt up the screen on Friends, no keyboard in sight). Two iOS 26 faults leave fixed chrome too high:
 *
 * - the visual viewport stays panned (`offsetTop` > 0 with the keyboard down; Apple Developer Forums 800125). A
 *   pinned sheet's field takes the keyboard, iOS pans the visual viewport to it (the window cannot scroll under the
 *   modal layer), the sheet closes, the keyboard goes — and the pan stays: everything fixed stands `offsetTop` up
 *   the screen. First a scroll nudge (`nudge`: a scroll of the window and back, which makes WebKit place the
 *   viewports again); if the pan is still there afterwards (`nudged`), the bottom chrome is moved down by it
 *   (`pan`, the root's `--viewport-pan`);
 * - in the installed app on iOS 26.0 the layout viewport itself shrinks and stays short (WebKit bug 301857, fixed in
 *   26.1; dev.to, cederhook): `innerHeight`, `clientHeight` and the visual viewport all read less than the tallest seen
 *   at this width. Then `reflow`: a display flip of the page, which makes WebKit measure the viewport again.
 *
 * Nothing while a text field has the focus (the keyboard is the reader's, `readViewport`), pinch-zoomed, or with the
 * keyboard up.
 */
export function strandedViewport(
  sample: ViewportSample,
  options: { tallest: number; typing: boolean; nudged: boolean; standalone: boolean },
): { nudge: boolean; pan: number; reflow: boolean } {
  const none = { nudge: false, pan: 0, reflow: false }
  const viewport = sample.viewport
  if (!viewport || options.typing || Math.abs((viewport.scale ?? 1) - 1) > 0.01) return none
  const layout = layoutHeightOf(sample.innerHeight, sample.clientHeight)
  if (viewport.height < layout - MIN_KEYBOARD_HEIGHT) return none
  const offsetTop = Math.round(Math.max(0, viewport.offsetTop))
  const shrunk = options.standalone && options.tallest - layout > MIN_KEYBOARD_HEIGHT
  if (offsetTop < 1) return { ...none, reflow: shrunk }
  return options.nudged ? { nudge: false, pan: offsetTop, reflow: shrunk } : { nudge: true, pan: 0, reflow: false }
}
