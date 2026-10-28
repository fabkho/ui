import type { Ref } from 'vue'
import { keyboardShown, layoutHeightOf, pinHold, pinHolds, readViewport, strandedViewport } from '../utils/keyboard'

/**
 * How much of the layout viewport the on-screen keyboard covers, in px (0
 * while it is down, or where there is no visual viewport). iOS lays the
 * keyboard over the page instead of resizing it, so its height is read from
 * the visual viewport: whatever of the layout viewport's height the visual
 * viewport neither shows nor has scrolled past. Chrome on Android resizes the
 * page instead (`interactive-widget=resizes-content`, the app's viewport meta):
 * the layout viewport shrinks with the visual one, this reads 0 and nothing is
 * lifted twice (utils/keyboard.ts). In the installed iOS app it is reported as the
 * keyboard starts to move, so whatever follows it (the search palette, a
 * sheet) rides up on the keyboard's own curve (`--duration-keyboard`,
 * `--ease-keyboard`); in Safari with its toolbar expanded only at the end
 * (WebKit bug 265578).
 *
 * Listens only while `active` is true and reads 0 otherwise, so a closed sheet
 * holds no listeners and does not start the next opening lifted.
 */
export function useKeyboardInset(active: () => boolean, options: KeyboardViewportOptions = {}): Readonly<Ref<number>> {
  return useKeyboardViewport(active, options).inset
}

export interface KeyboardViewportOptions {
  /**
   * Holds the page still while active (added for Bookretreats). When a field in
   * a fixed layer at the bottom (a sheet, the palette, a chat's composer) takes
   * the keyboard, iOS scrolls the document by the keyboard's height to reveal
   * it — measured in the Simulator: the visual viewport's `offsetTop` and
   * `scrollY` both jump by it once the keyboard is up — and reports that pan
   * late (`offsetTop` stale for a few frames; in the installed app 0 in the
   * resize event, WebKit bug 237851), so a layer following it jumps. A layer
   * that lifts itself onto the keyboard wants no pan at all. With `pin`:
   *
   * - on iOS a tap on a field that does not have focus yet focuses it
   *   ourselves with `preventScroll` (the tap's own focus is cancelled), which
   *   is the focus without the pan; programmatic focus in the layer already
   *   passes `preventScroll` (useModalLayer, the palette). The caret goes to
   *   the end of what is there instead of under the finger, for that first tap.
   * - while a field has the focus or the keyboard is up, every scroll of the
   *   window is put back to where it was when a field last took the keyboard
   *   (utils/keyboard.ts, pinHold) — a pan that still happens: a drag on the
   *   chrome with the keyboard up, a keyboard switching to emoji — at once, or
   *   once a pan under a finger has settled. With no field focused and the
   *   keyboard down the hold follows the page (pinHolds): a pinned screen opened
   *   from a scrolled list never drags the window back to the list's place;
   * - a pan the pin cannot put back (iOS also pans the visual viewport where
   *   the window cannot scroll: the root is `overflow: hidden` under a modal
   *   layer) is counted, once `offsetTop` can be trusted: not inside the event
   *   that reports it, a frame or more later (utils/keyboard.ts, readViewport).
   */
  pin?: boolean
}

/**
 * The keyboard inset (useKeyboardInset) and, while the keyboard is up, how tall
 * the part of the page still in view is (`room`, null with it down): what a
 * sheet must fit in, wherever Safari has panned to (utils/keyboard.ts,
 * keyboardRoomOf). `shown` (added for Bookretreats): whether a keyboard is up
 * at all, also where it resized the page and the inset reads 0 (Android).
 *
 * All users share one reading and one set of listeners. While any is active the
 * inset is also on the root element as `--keyboard-inset` (px), for CSS that
 * stands on the keyboard (`bottom: var(--keyboard-inset)`).
 */
export function useKeyboardViewport(
  active: () => boolean,
  options: KeyboardViewportOptions = {},
): {
  inset: Readonly<Ref<number>>
  room: Readonly<Ref<number | null>>
  shown: Readonly<Ref<boolean>>
} {
  const on = ref(false)
  const inset = computed(() => (on.value ? reading.inset : 0))
  const room = computed(() => (on.value ? reading.room : null))
  const shown = computed(() => on.value && reading.shown)

  if (import.meta.client) {
    const pin = Boolean(options.pin)
    const set = (isActive: boolean) => {
      if (isActive === on.value) return
      on.value = isActive
      join(isActive ? 1 : -1, pin)
    }
    watch(active, set, { immediate: true })
    onUnmounted(() => set(false))
  }

  return { inset, room, shown }
}

// ------------------------------------------------------------ the one reader

const reading = reactive({ inset: 0, room: null as number | null, shown: false })
let users = 0
let pins = 0
/** Where the window is held while a pinned user is active. */
let pinned = { x: 0, y: 0 }
/** The tallest layout viewport seen at this width: the page with the keyboard down. */
let tallest = { width: 0, height: 0 }
let later = 0

function join(delta: 1 | -1, pin: boolean) {
  const before = users
  users += delta
  if (pin) {
    if (delta === 1 && pins === 0) pinned = { x: window.scrollX, y: window.scrollY }
    pins += delta
  }
  if (before === 0 && users > 0) listen(true)
  else if (before > 0 && users === 0) listen(false)
  if (users > 0) {
    measure(true)
    look()
  } else {
    // The last layer on the keyboard closed: whatever the keyboard left behind is the watcher's now.
    lookAfterViewport()
    reading.inset = 0
    pan = 0
    reading.room = null
    reading.shown = false
    document.documentElement.style.removeProperty('--keyboard-inset')
  }
}

function listen(start: boolean) {
  const method = start ? 'addEventListener' : 'removeEventListener'
  window.visualViewport?.[method]('resize', onResize)
  window.visualViewport?.[method]('scroll', onScroll)
  window[method]('scroll', onScroll, { passive: true })
  if (iosWebKit()) document[method]('mousedown', onMousedown, true)
  document[method]('focusin', onFocusChange)
  document[method]('focusout', onFocusChange)
  for (const type of ['touchstart', 'touchend', 'touchcancel'] as const) document[method](type, onTouch, { capture: true, passive: true })
  if (!start) {
    cancelAnimationFrame(later)
    later = 0
    clearTimeout(settle)
    settle = 0
    touching = false
  }
}

/** WebKit on an iPhone or iPad: the only engine that knows `-webkit-touch-callout`. */
function iosWebKit(): boolean {
  return Boolean(CSS.supports?.('-webkit-touch-callout', 'none'))
}

/** A tap on a field that is about to take the keyboard, in a pinned layer: focus it without the pan. */
function onMousedown(event: MouseEvent) {
  const field = event.target
  if (pins === 0 || event.button !== 0 || !isTextField(field) || field === document.activeElement) return
  event.preventDefault()
  field.focus({ preventScroll: true })
}

function isTextField(element: EventTarget | null): element is HTMLElement {
  if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly
  if (element instanceof HTMLInputElement) {
    return !element.disabled && !element.readOnly && !/^(button|checkbox|color|file|hidden|image|radio|range|reset|submit)$/.test(element.type)
  }
  return element instanceof HTMLElement && element.isContentEditable
}

/** The keyboard moved: follow it at once (its curve starts now; the pan as it was), and keep looking while WebKit settles. */
function onResize() {
  measure(false)
  look()
}

/**
 * The page or the visual viewport scrolled: put a pinned page back, and measure
 * once it is. A pan the browser made by itself (a field revealed, the keyboard
 * switching to emoji) goes back at once. One under a finger (a drag on
 * something that does not scroll, and the momentum after it) is left alone
 * until it has settled: snapping back against a moving finger shakes the page
 * by tens of pixels every frame (measured in the iOS Simulator), and a rubber
 * band mostly comes back by itself. With no field focused and the keyboard down
 * nothing is held: the hold goes where the page is (utils/keyboard.ts, pinHolds).
 */
function onScroll() {
  if (pins > 0 && displaced()) {
    if (!holding()) follow()
    else if (touching || performance.now() - lastTouch < SETTLE_MS) restoreWhenSettled()
    else restore()
  }
  look()
}

/** Whether the pin holds the window now: a field has the focus, or the keyboard is up (pinHolds). */
function holding(): boolean {
  return pinHolds(isTextField(document.activeElement), reading.shown)
}

/** The hold goes where the page is. */
function follow() {
  clearTimeout(settle)
  settle = 0
  pinned = { x: window.scrollX, y: window.scrollY }
}

/** How long after a finger left a pan still counts as its momentum, and how long a pan must be still. */
const SETTLE_MS = 160
let touching = false
let lastTouch = -Infinity
let settle = 0

function displaced(): boolean {
  return Math.abs(window.scrollY - pinned.y) > 0.5 || Math.abs(window.scrollX - pinned.x) > 0.5
}

function restore() {
  clearTimeout(settle)
  settle = 0
  if (pins === 0 || !displaced()) return
  if (holding()) window.scrollTo({ left: pinned.x, top: pinned.y, behavior: 'instant' })
  else follow()
}

function restoreWhenSettled() {
  clearTimeout(settle)
  settle = window.setTimeout(() => (touching ? restoreWhenSettled() : restore()), SETTLE_MS)
}

function onTouch(event: TouchEvent) {
  touching = event.touches.length > 0
  lastTouch = performance.now()
}

/**
 * How long the reader keeps looking after the last thing that can move the keyboard (a viewport `resize` or
 * `scroll`, a window scroll, a field taking or losing the focus): every frame, until nothing has happened for this
 * long. iOS gives no event for the end of the keyboard's animation, reports the pan late (WebKit bug 237851, see
 * readViewport) and changes the accessory bar's height (QuickType coming and going) on its own schedule, so one
 * look in the event and one two frames later was not enough. 300 ms is about the keyboard's own animation.
 */
const LOOK_MS = 300
let lookUntil = 0
/** Frames since the last event: the one right after it may still read the old `offsetTop`, the second on is trusted. */
let framesSince = 0

function look() {
  lookUntil = performance.now() + LOOK_MS
  framesSince = 0
  if (!later) later = requestAnimationFrame(frame)
}

function frame() {
  later = 0
  if (users === 0) return
  framesSince += 1
  if (framesSince >= 2) measure(true)
  if (framesSince < 2 || performance.now() < lookUntil) later = requestAnimationFrame(frame)
}

function onFocusChange(event: FocusEvent) {
  // A field takes the keyboard: a pinned page holds where it is now, not where it was when the pin began (pinHold).
  if (pins > 0 && event.type === 'focusin' && isTextField(event.target)) {
    pinned = pinHold(pinned, { x: window.scrollX, y: window.scrollY }, reading.shown)
  }
  look()
}

/** The pan the last reading went by (readViewport): kept while `offsetTop` cannot be trusted. */
let pan = 0

function measure(settled: boolean) {
  const visual = window.visualViewport ?? null
  const next = readViewport(
    {
      innerHeight: window.innerHeight,
      clientHeight: document.documentElement.clientHeight,
      viewport: visual && { height: visual.height, offsetTop: visual.offsetTop, scale: visual.scale },
    },
    { pinned: pins > 0, settled, pan },
  )
  pan = next.pan
  const width = window.innerWidth
  if (width !== tallest.width) tallest = { width, height: next.layout }
  else tallest.height = Math.max(tallest.height, next.layout)
  const changed = reading.inset !== next.inset || !document.documentElement.style.getPropertyValue('--keyboard-inset')
  reading.inset = next.inset
  reading.room = next.room
  reading.shown = keyboardShown(next.inset, next.layout, tallest.height)
  if (reading.shown) keyboardSince = true
  if (changed) document.documentElement.style.setProperty('--keyboard-inset', `${next.inset}px`)
}

// ------------------------------------------------------- the viewport left behind

/**
 * Puts right what iOS 26 leaves behind once the keyboard has gone (added for Bookretreats, r10): a visual viewport
 * still panned, or a layout viewport shrunk for good — fixed chrome (the tab bar) then stands far up the screen
 * (utils/keyboard.ts, strandedViewport, has the cases and the sources). Always on in WebKit on an iPhone or iPad
 * (plugins/stranded-viewport.client.ts), not only while a layer stands on the keyboard: the tab bar has no reader of
 * its own. It looks once things have been still for `LOOK_MS` after a viewport resize or scroll, a field taking or
 * losing the focus, a layer on the keyboard closing, the app coming back (`pageshow`, `visibilitychange`), never under a
 * finger. What it cannot put right by a scroll nudge it compensates: `--viewport-pan` on the root, which the
 * floating chrome (`float-bottom`) and the sheets subtract from their `bottom`. Only after a keyboard
 * (`keyboardSince`): a reading no keyboard left behind is left alone (strandedViewport).
 */
export function watchStrandedViewport(): void {
  if (watching || !window.visualViewport || !iosWebKit()) return
  watching = true
  window.visualViewport.addEventListener('resize', lookAfterViewport)
  window.visualViewport.addEventListener('scroll', lookAfterViewport)
  document.addEventListener('focusin', onWatchedFocus)
  document.addEventListener('focusout', lookAfterViewport)
  window.addEventListener('pageshow', lookAfterViewport)
  document.addEventListener('visibilitychange', lookAfterViewport)
  for (const type of ['touchstart', 'touchend', 'touchcancel'] as const) document.addEventListener(type, onWatchedTouch, { capture: true, passive: true })
  noteTallest()
  lookAfterViewport()
}

let watching = false
/** Its own listener: the reader's (`onTouch`) is removed when the last layer on the keyboard closes. */
const onWatchedTouch = (event: TouchEvent) => onTouch(event)
/** A field took the keyboard: what follows may be left behind by it. */
function onWatchedFocus(event: FocusEvent) {
  if (isTextField(event.target)) keyboardSince = true
  lookAfterViewport()
}
/**
 * A keyboard was up (a field had the focus, or the reader saw one) since the viewport last read clear: only then can
 * a pan or a shrunk viewport be what it left behind (utils/keyboard.ts, strandedViewport).
 */
let keyboardSince = false
/** The next look is the one right after the watcher's own scroll nudge. */
let justNudged = false
let healTimer = 0
let nudged = false
let viewportPan = 0

function noteTallest(): number {
  const layout = layoutHeightOf(window.innerHeight, document.documentElement.clientHeight)
  const width = window.innerWidth
  if (width !== tallest.width) tallest = { width, height: layout }
  else tallest.height = Math.max(tallest.height, layout)
  return tallest.height
}

/** Looks again once nothing has happened for `LOOK_MS` (and no finger is on the screen). */
export function lookAfterViewport(): void {
  if (!watching) return
  clearTimeout(healTimer)
  healTimer = window.setTimeout(() => requestAnimationFrame(heal), LOOK_MS)
}

function heal() {
  if (touching || performance.now() - lastTouch < LOOK_MS) return lookAfterViewport()
  const visual = window.visualViewport
  if (!visual) return
  const afterNudge = justNudged
  justNudged = false
  const height = noteTallest()
  const verdict = strandedViewport(
    {
      innerHeight: window.innerHeight,
      clientHeight: document.documentElement.clientHeight,
      viewport: { height: visual.height, offsetTop: visual.offsetTop, scale: visual.scale },
    },
    {
      tallest: height,
      typing: isTextField(document.activeElement),
      nudged,
      standalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
      keyboardSince,
    },
  )
  // Clear: what the keyboard left is gone, and the next pan is not its — unless this is the look right after the
  // nudge, which may have cleared the pan only until iOS puts it back.
  if (verdict.clear && !afterNudge) keyboardSince = false
  if (verdict.nudge) {
    nudged = true
    justNudged = true
    const { scrollX: x, scrollY: y } = window
    window.scrollTo({ left: x, top: y > 0 ? y - 1 : y + 1, behavior: 'instant' })
    window.scrollTo({ left: x, top: y, behavior: 'instant' })
    return lookAfterViewport()
  }
  if (!verdict.pan) nudged = false
  setViewportPan(verdict.pan)
  if (verdict.reflow) reflow()
}

function setViewportPan(value: number) {
  if (value === viewportPan) return
  viewportPan = value
  if (value) document.documentElement.style.setProperty('--viewport-pan', `${value}px`)
  else document.documentElement.style.removeProperty('--viewport-pan')
}

/**
 * The installed app's shrunk layout viewport, measured again: a display flip of the page with a synchronous layout in
 * between (no paint), its scroll put back (dev.to, cederhook: the only thing that brought the height back without
 * quitting the app). Once per shrink: if it did not help, the next look finds the same and the tallest is forgotten.
 */
function reflow() {
  const body = document.body
  const { scrollX: x, scrollY: y } = window
  body.style.display = 'none'
  void body.offsetHeight
  body.style.display = ''
  window.scrollTo({ left: x, top: y, behavior: 'instant' })
  requestAnimationFrame(() => {
    const layout = layoutHeightOf(window.innerHeight, document.documentElement.clientHeight)
    if (tallest.height - layout > 0) tallest.height = layout
  })
}
