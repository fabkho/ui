import { AXIS_SLOP, atScrollTop, lockAxis, routeMove, scrolls, velocityOf, type Sample, type ScrollMetrics } from '../utils/sheetDrag'

/** What `useSheetTouch` needs from the sheet it moves. */
export interface SheetTouchOptions {
  /** How far the sheet's top edge stands below its tallest place now (px, 0 = tallest). */
  position: () => number
  /** The finger moves the sheet: its new position (px, never above 0, never below `max`). */
  move: (position: number) => void
  /** The finger has let go of a sheet it moved: where it stands and how fast the finger went (px/ms, down is positive). */
  release: (position: number, velocity: number) => void
  /** The lowest place the finger may take the sheet to (px). Default: no limit. */
  max?: () => number
  /** A touch has begun in the sheet (before it is clear whom it belongs to). */
  start?: () => void
  /** The finger takes hold of the sheet for the first time in this gesture. */
  claim?: () => void
  /** A touch has ended (after `release`, if the sheet was moved). */
  end?: () => void
}

/** Touches that belong to the field or the control under the finger, not to the sheet. */
const OWN_TOUCH = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-no-swipe]'

/**
 * The element's own scroll as the pure rules read it. `reversed` can be handed in: a gesture reads it
 * once at its start, so a move reads layout only, not the computed style (which the sheet's own
 * transform, written a move earlier, would make the browser recompute on every move).
 */
function metricsOf(el: HTMLElement, reversed = getComputedStyle(el).flexDirection === 'column-reverse'): ScrollMetrics {
  return {
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    reversed,
  }
}

/** A vertical scroller: scrolls by its style, or is marked (`data-sheet-scroll`: the member sheet's, hidden at medium). */
function isVerticalScroller(el: HTMLElement): boolean {
  if (el.hasAttribute('data-sheet-scroll')) return true
  const { overflowY } = getComputedStyle(el)
  return (overflowY === 'auto' || overflowY === 'scroll') && scrolls(metricsOf(el))
}

/**
 * The finger of an iOS sheet (UiSheet, the member sheet): a touch that starts in
 * the sheet's content scrolls the content while it is not at its top and moves the
 * sheet once it is, an upward one on a sheet below its tallest place brings the
 * sheet up first and scrolls after it — and one gesture can pass from one to the
 * other (scroll to the top, keep pulling: the sheet follows). The decision per
 * move is `routeMove` (utils/sheetDrag.ts).
 *
 * Touch events, not pointer events: the browser takes a pan on a scroller for
 * itself and cancels the pointer (`pointercancel`), so a sheet that listens to
 * pointers never sees a drag that starts in scrolling content. A move the sheet
 * takes is `preventDefault`ed (the content then stands still under it, no
 * rubber band); once it has, the content's scrolling in the same gesture is done
 * by hand (`scrollTop`), since the browser no longer pans for it.
 *
 * Left alone: fields (the caret and the selection handles), anything marked
 * `data-no-swipe`, a second finger, and a gesture that goes sideways first (a
 * shelf of covers scrolling horizontally). Buttons and rows take part: they are
 * most of a sheet's content, and a tap on one is no drag.
 *
 * Bind `handlers` (touchstart/move/end/cancel) on the element that holds the
 * content; the element's own `touch-action` is the page's business.
 */
export function useSheetTouch(options: SheetTouchOptions) {
  let gesture: {
    x: number
    y: number
    last: number
    axis: 'vertical' | 'horizontal' | null
    claimed: boolean
    scrollers: HTMLElement[]
    /** Per scroller, read once: whether it is laid out in reverse (`metricsOf`). */
    reversed: boolean[]
    samples: Sample[]
    ignored: boolean
  } | null = null

  function onTouchstart(event: TouchEvent) {
    const touch = event.touches[0]
    const target = event.target instanceof HTMLElement ? event.target : null
    if (!touch || !target) return
    // A second finger (a pinch, a tap while dragging) is nobody's drag: the gesture is let go of as it is.
    if (event.touches.length > 1) {
      if (gesture?.claimed) finish(event.timeStamp, true)
      else gesture = null
      return
    }
    const scrollers: HTMLElement[] = []
    for (let el: HTMLElement | null = target; el; el = el.parentElement) {
      if (isVerticalScroller(el)) scrollers.push(el)
      if (el === event.currentTarget) break
    }
    gesture = {
      x: touch.clientX,
      y: touch.clientY,
      last: touch.clientY,
      axis: null,
      claimed: false,
      scrollers,
      reversed: scrollers.map((el) => getComputedStyle(el).flexDirection === 'column-reverse'),
      samples: [{ y: touch.clientY, time: event.timeStamp }],
      ignored: Boolean(target.closest(OWN_TOUCH)),
    }
    options.start?.()
  }

  function onTouchmove(event: TouchEvent) {
    const touch = event.touches[0]
    if (!gesture || gesture.ignored || !touch || event.touches.length > 1) return
    if (!gesture.axis) {
      gesture.axis = lockAxis(touch.clientX - gesture.x, touch.clientY - gesture.y, AXIS_SLOP)
      if (!gesture.axis) return
      if (gesture.axis === 'horizontal') {
        gesture.ignored = true
        return
      }
    }
    const delta = touch.clientY - gesture.last
    gesture.last = touch.clientY
    gesture.samples.push({ y: touch.clientY, time: event.timeStamp })
    if (gesture.samples.length > 12) gesture.samples.shift()
    if (!delta) return

    const atTop = gesture.scrollers.every((el, i) => atScrollTop(metricsOf(el, gesture!.reversed[i])))
    const position = options.position()
    if (routeMove(delta, atTop, position) === 'sheet') {
      if (event.cancelable) event.preventDefault()
      if (!gesture.claimed) {
        gesture.claimed = true
        options.claim?.()
      }
      const lowest = options.max?.() ?? Number.POSITIVE_INFINITY
      options.move(Math.min(lowest, Math.max(0, position + delta)))
      return
    }
    // Content's turn. While the browser pans for it, nothing to do; once the sheet has had the
    // gesture the browser has been told not to, so the content is moved by hand.
    const scroller = gesture.scrollers[0]
    if (gesture.claimed && scroller) {
      if (event.cancelable) event.preventDefault()
      scroller.scrollTop -= delta
    }
  }

  /** Lets go of the gesture: the sheet is released where it stands if it was moved, and a click that ends it is swallowed. */
  function finish(time: number, cancelled = false) {
    const done = gesture
    gesture = null
    if (!done) return
    if (done.claimed) {
      options.release(options.position(), cancelled ? 0 : velocityOf(done.samples, time))
      // WebKit sends the click of a touch that moved the sheet; it is no tap.
      const swallow = (click: Event) => click.stopPropagation()
      window.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', swallow, true), 150)
    }
    options.end?.()
  }

  function onTouchend(event: TouchEvent) {
    if (event.touches.length > 0) return
    finish(event.timeStamp)
  }
  function onTouchcancel(event: TouchEvent) {
    finish(event.timeStamp, true)
  }

  return {
    handlers: { touchstart: onTouchstart, touchmove: onTouchmove, touchend: onTouchend, touchcancel: onTouchcancel },
  }
}
