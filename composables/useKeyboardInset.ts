import type { Ref } from 'vue'
import { keyboardInsetOf, keyboardRoomOf, keyboardShown, layoutHeightOf } from '../utils/keyboard'

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
   * - every scroll of the window is put back to where it was when the first
   *   pinned user became active (a pan that still happens: a drag on the
   *   chrome with the keyboard up, a keyboard switching to emoji) — at once,
   *   or once a pan under a finger has settled;
   * - the visual viewport is taken as not panned (`offsetTop` 0) while not
   *   pinch-zoomed, so a stale `offsetTop` never moves anything.
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
  if (users > 0) measure()
  else {
    reading.inset = 0
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

/** The keyboard moved: follow it at once (its curve starts now), and look again once WebKit has settled. */
function onResize() {
  measure()
  measureLater()
}

/**
 * The page or the visual viewport scrolled: put a pinned page back, and measure
 * once it is. A pan the browser made by itself (a field revealed, the keyboard
 * switching to emoji) goes back at once. One under a finger (a drag on
 * something that does not scroll, and the momentum after it) is left alone
 * until it has settled: snapping back against a moving finger shakes the page
 * by tens of pixels every frame (measured in the iOS Simulator), and a rubber
 * band mostly comes back by itself.
 */
function onScroll() {
  if (pins > 0 && displaced()) {
    if (touching || performance.now() - lastTouch < SETTLE_MS) restoreWhenSettled()
    else restore()
  }
  measureLater()
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
  if (pins > 0 && displaced()) window.scrollTo({ left: pinned.x, top: pinned.y, behavior: 'instant' })
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
 * Two frames on: in the installed iOS app the visual viewport's `offsetTop` can
 * still be the old one inside its own resize event (WebKit bug 237851).
 */
function measureLater() {
  if (later) return
  later = requestAnimationFrame(() => {
    later = requestAnimationFrame(() => {
      later = 0
      if (users > 0) measure()
    })
  })
}

function measure() {
  const visual = window.visualViewport ?? null
  // Pinned and not pinch-zoomed: the page is held where it was, so the visual viewport is not panned.
  const viewport = visual && pins > 0 && Math.abs(visual.scale - 1) <= 0.01 ? { height: visual.height, offsetTop: 0, scale: visual.scale } : visual
  const layout = layoutHeightOf(window.innerHeight, document.documentElement.clientHeight)
  const width = window.innerWidth
  if (width !== tallest.width) tallest = { width, height: layout }
  else tallest.height = Math.max(tallest.height, layout)
  reading.inset = keyboardInsetOf(layout, viewport)
  reading.room = keyboardRoomOf(layout, viewport)
  reading.shown = keyboardShown(reading.inset, layout, tallest.height)
  document.documentElement.style.setProperty('--keyboard-inset', `${reading.inset}px`)
}
