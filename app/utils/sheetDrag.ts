/**
 * Which one a finger moves, the sheet or the content inside it: the decision of
 * an iOS bottom sheet, framework-free so Vitest pins it (composables/useSheetTouch.ts
 * is the part that listens, UiSheet and the member sheet use it).
 *
 * `position` is how far the sheet's top edge stands below its tallest place, in
 * px: 0 is the sheet at its largest detent (a UiSheet at rest, the member sheet
 * at large), more is lower. A finger's movement `delta` is positive downwards.
 */

/** Which of the two a movement belongs to. */
export type Route = 'sheet' | 'scroll'

/**
 * The iOS rule, move by move:
 * - a downward move scrolls the content while it is not at its top, and moves the
 *   sheet down once it is — but only in a gesture that came down on content which
 *   was already at its top (`startedAtTop`): a gesture that found the content
 *   scrolled is that content's to the end, however far it runs past the top;
 * - an upward move brings a sheet that stands below its tallest place up first
 *   (a lower detent grows, a dragged sheet comes back) and scrolls once it is up.
 *
 * `startedAtTop` is the content's place when the finger came down. iOS hands a live
 * scroll to nobody else: a gesture that scrolled the content to its top and goes on
 * pulling keeps scrolling it (its rubber band) and leaves the sheet where it stands.
 * The hand-off the sheet is meant to do — pull it down from the content's own top —
 * is a gesture that begins there. Taking the sheet over half way through a scroll is
 * what cost the content its momentum and let a flick that ran up to the top drag the
 * sheet down to medium instead of bouncing there (r10).
 */
export function routeMove(delta: number, atTop: boolean, position: number, startedAtTop: boolean): Route {
  if (delta > 0) return atTop && startedAtTop ? 'sheet' : 'scroll'
  if (delta < 0) return position > 0 ? 'sheet' : 'scroll'
  return 'scroll'
}

/** What an element reports of its scroll, as `scrollTop` & co. say it. */
export interface ScrollMetrics {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  /** A column laid out in reverse (a chat, the palettes' answers): its `scrollTop` is 0 at the bottom and counts down. */
  reversed?: boolean
}

/** Sub-pixel scroll positions (zoom, fractional layouts) count as the edge. */
const EDGE = 1

/** Whether the content is scrolled to its top: nothing above is hidden. */
export function atScrollTop({ scrollTop, scrollHeight, clientHeight, reversed }: ScrollMetrics): boolean {
  if (reversed) return scrollTop - -(scrollHeight - clientHeight) <= EDGE
  return scrollTop <= EDGE
}

/** Whether the content can scroll at all. */
export function scrolls({ scrollHeight, clientHeight }: ScrollMetrics): boolean {
  return scrollHeight - clientHeight > EDGE
}

/** What the finger has to move before it is read as a direction at all (px). */
export const AXIS_SLOP = 4

export type Axis = 'vertical' | 'horizontal'

/**
 * Which way a gesture goes, read once from its first movement beyond the slop and
 * kept for the rest of it: a horizontal one (a shelf of covers scrolling sideways)
 * is never the sheet's. `null` while the finger has not moved enough.
 */
export function lockAxis(dx: number, dy: number, slop = AXIS_SLOP): Axis | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < slop) return null
  return Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal'
}

/** A touch sample: where and when. */
export interface Sample {
  y: number
  time: number
}

/** How far back a release looks for the speed of the finger (ms). */
const VELOCITY_WINDOW = 100

/**
 * The finger's speed at release, px per ms, positive downwards: from the samples
 * of the last `VELOCITY_WINDOW` ms, so a drag that stopped before it let go is not
 * a flick.
 */
export function velocityOf(samples: readonly Sample[], now: number): number {
  const recent = samples.filter((sample) => now - sample.time <= VELOCITY_WINDOW)
  const first = recent[0]
  const last = recent[recent.length - 1]
  if (!first || !last || last.time === first.time) return 0
  // A finger that has held still since its last sample is not moving.
  if (now - last.time > VELOCITY_WINDOW / 2) return 0
  return (last.y - first.y) / (last.time - first.time)
}

/** How far the sheet has to travel down before it lets go (px). */
export const DISMISS_DISTANCE = 80
/** …or how fast a short flick has to be (px per ms). */
export const DISMISS_VELOCITY = 0.5
/** A flick is more than a twitch: the least distance it has to cover (px). */
export const FLICK_DISTANCE = 12

/** Whether a sheet with one detent, let go at `position` at `velocity`, is dismissed. */
export function dismisses(position: number, velocity: number): boolean {
  return position > DISMISS_DISTANCE || (position > FLICK_DISTANCE && velocity > DISMISS_VELOCITY)
}

/** How far ahead the finger's speed carries a released sheet (ms): where it would come to rest. */
const PROJECTION = 160

/**
 * Where a sheet with two detents ends up when let go at `position` at `velocity`
 * (the member sheet): carried on by its speed a little way, then the nearer of the
 * two detents, or closed when it stands past medium by more than `closeShare` of
 * medium's height (and a flick down from medium closes it, as on iOS).
 * `mediumPosition` is medium's position (how far it stands below large).
 */
export function settle(
  position: number,
  velocity: number,
  { mediumPosition, mediumHeight, closeShare }: { mediumPosition: number; mediumHeight: number; closeShare: number },
): 'large' | 'medium' | 'close' {
  const below = position - mediumPosition
  if (below > mediumHeight * closeShare) return 'close'
  if (below > FLICK_DISTANCE && velocity > DISMISS_VELOCITY) return 'close'
  const projected = position + velocity * PROJECTION
  if (projected > mediumPosition + mediumHeight * closeShare) return 'close'
  return Math.abs(projected) < Math.abs(projected - mediumPosition) ? 'large' : 'medium'
}
