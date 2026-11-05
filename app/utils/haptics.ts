/**
 * Haptic ticks for the rating control: one short tick each time the Rating
 * moves to another step (a quarter while dragging, a whole star on a tap); and
 * for the progress wheel, one per value (`stepTick`, at the end of this file).
 *
 * - Android Chrome (and other browsers with it): `navigator.vibrate(8)`.
 * - iOS Safari has no Vibration API. Safari 17.4+ plays a haptic when an
 *   `<input type="checkbox" switch>` toggles, so a hidden one is toggled
 *   through its `<label>`. It only counts inside a user gesture, which the
 *   control's pointer and key handlers are.
 * - The voice message gesture (`voiceHaptic`, at the end of this file) is firmer than a rating's tick, because
 *   it marks moments the thumb cannot see (the microphone is on, it is locked, the cancel is armed): on
 *   Android it vibrates patterns of 20 – 160 ms. The web cannot set an amplitude, so strength is length
 *   and rhythm, each kind distinct from the others. On iOS it is the same switch tick as above, for
 *   `start` and `lock` only, and only where WebKit lets it count (inside a click; a pointer handler's
 *   may be a silent no-op); nothing else is attempted there. Chrome wants a user activation before it
 *   vibrates: the press that starts the hold is one, and the page keeps it (sticky), so the buzz
 *   when sliding to cancel, in a `pointermove`, should still play (unverified on a device).
 * - Anywhere else (desktop browsers, macOS trackpads: the web cannot reach
 *   their haptics) it does nothing. Haptics are not motion, so Reduce Motion
 *   does not silence them; the system's own settings still do (a silenced
 *   phone or switched-off system haptics make the tick a no-op).
 */

/** How long the vibration lasts, in ms: a tick, not a buzz. */
export const TICK_MS = 8

/** Whether moving from one Rating to another is a step that earns a tick. */
export function isRatingStep(from: number | null, to: number | null): boolean {
  return (from ?? 0) !== (to ?? 0)
}

export type HapticsKind = 'vibrate' | 'switch' | null

/** Which way this device can tick, if any. */
export function hapticsKind(): HapticsKind {
  if (typeof navigator === 'undefined') return null
  if (typeof navigator.vibrate === 'function') return 'vibrate'
  // WebKit on a touch device (iPhone, iPad): the `switch` checkbox. `-webkit-touch-callout`
  // is a WebKit-on-iOS property, so desktop Safari (no tap haptics) is left out.
  if (
    typeof document !== 'undefined'
    && navigator.maxTouchPoints > 0
    && typeof CSS !== 'undefined'
    && CSS.supports?.('-webkit-touch-callout', 'none')
  ) return 'switch'
  return null
}

let label: HTMLLabelElement | null = null

function switchLabel(): HTMLLabelElement {
  if (label?.isConnected) return label
  label = document.createElement('label')
  label.setAttribute('aria-hidden', 'true')
  label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.tabIndex = -1
  label.append(input)
  document.body.append(label)
  return label
}

/** One tick, where the device has one. Call it from a user gesture. Never throws. */
export function tick(): void {
  try {
    const kind = hapticsKind()
    if (kind === 'vibrate') navigator.vibrate(TICK_MS)
    else if (kind === 'switch') switchLabel().click()
  } catch {
    // A haptic is a nicety; a browser that refuses it is left alone.
  }
}

/**
 * The shortest gap between two value ticks, in ms. A fling of the progress wheel
 * passes values faster than a motor can tell them apart; closer ticks would blur
 * into one buzz, so the ones in between are left out.
 */
export const STEP_GAP_MS = 40

let lastStep = Number.NEGATIVE_INFINITY

/**
 * One tick for a value passing the centre of the progress wheel (issue #68), or a
 * − / + step. Vibration only: on iOS the switch trick plays only inside a tap, never
 * while a finger drags or a fling runs, so the wheel stays silent there rather than
 * ticking for some values and not others. Throttled to `STEP_GAP_MS`. `now` is the
 * event's time stamp (or `performance.now()`); returns whether it ticked.
 */
export function stepTick(now: number): boolean {
  if (now - lastStep < STEP_GAP_MS) return false
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
    lastStep = now
    navigator.vibrate(TICK_MS)
    return true
  } catch {
    return false
  }
}

/**
 * The haptics of the voice message gesture (UiComposer, `utils/chat/voiceGesture.ts` decides when).
 * Vibration patterns in ms, alternating vibrate / pause / vibrate. Deliberately long: the Vibration API has
 * no amplitude, so a firm feel is a long, distinct pulse.
 */
export const VOICE_HAPTICS = {
  /** The microphone is on (the press): one firm pulse. */
  start: 45,
  /** The same by a tap or a key (the panel, no thumb on it): shorter. */
  tapStart: 25,
  /** Locked: a double pulse. */
  lock: [35, 45, 70],
  /** The thumb crossed the cancel distance: a firm buzz, longer than any other single pulse. */
  armed: 60,
  /** The thumb came back from it: a short pulse. */
  disarmed: 20,
  /** Let go to send: one medium pulse. */
  send: 30,
  /** Let go while armed, the recording thrown away: a long pattern. */
  discard: [60, 40, 90],
} as const satisfies Record<string, number | readonly number[]>

export type VoiceHaptic = keyof typeof VOICE_HAPTICS

/** Which kinds iOS gets (the switch tick); it has nothing for the others. */
const IOS_VOICE_HAPTICS: readonly VoiceHaptic[] = ['start', 'lock']

/** One haptic of the voice gesture, where the device has one. Never throws; true when a vibration was asked for. */
export function voiceHaptic(kind: VoiceHaptic): boolean {
  try {
    const way = hapticsKind()
    if (way === 'vibrate') {
      const pattern = VOICE_HAPTICS[kind]
      // `vibrate` answers false when it refuses (no activation yet, the user's settings); nothing to do then.
      return navigator.vibrate(pattern as number | number[]) !== false
    }
    if (way === 'switch' && IOS_VOICE_HAPTICS.includes(kind)) {
      tick()
      return true
    }
  } catch {
    // A haptic is a nicety; a browser that refuses it is left alone.
  }
  return false
}
