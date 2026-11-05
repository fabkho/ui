/**
 * The gesture of the composer's microphone (UiComposer, `voiceHold`), as WhatsApp has it: hold to
 * record, let go to send, slide up to lock, slide towards the start side to cancel. No DOM and no
 * timers here: the component feeds pointer and page events in, with the clock reading, and gets
 * the next state and what to do about it back, so Vitest can drive the whole of it
 * (tests/chat-voice-gesture.test.ts).
 *
 *   idle ──press──▶ holding ──release──▶ sent         (held long enough, mic live)
 *                      │  └──release──▶ cancelled      (too short; or slid past `HOLD_CANCEL_PX`)
 *                      │  └──release──▶ locked         (a tap: under `TAP_MS`, or the mic is not live yet)
 *                      ├──move up past `HOLD_LOCK_PX`──▶ locked   (the recording goes on without the finger)
 *                      ├──pointercancel──▶ locked | cancelled
 *                      └──page hidden / window blurred──▶ cancelled
 *   idle ──tap──▶ locked                                (keyboard, VoiceOver, Switch Control, `voiceHold` off)
 *
 * `locked` is today's recording panel (✕, bars, timer, send); only the person ends it from there.
 * `cancelled` and `sent` are over: the next press starts again. "Live" is whether the microphone is
 * recording yet: before that the phone's permission sheet may be up, and it eats the finger's
 * `pointerup`, so a release or a cancel before it means "a tap": lock, never lose the recording.
 *
 * Haptics are effects too (`{ type: 'haptic', kind }`, see `VoiceHaptic` in utils/haptics.ts), one per
 * transition and never from a move that stays where it is: `start` on a press (`tapStart`, shorter, on a
 * plain activation), `lock` when the slide locks, `armed` when the thumb crosses the cancel distance
 * and `disarmed` when it comes back before letting go (only after it armed), `send` on the release that
 * sends, `discard` on the release that throws away an armed slide. Nothing for a tap's lock, a hold too
 * short, a `pointercancel`, the page leaving: no gesture of the person's is going on then.
 *
 * Direction: "towards the cancel side" is the start side of the line, so left in LTR and right in
 * RTL (the caller says which, `rtl`); up is up in both.
 */

/** How far up (px) the thumb goes to lock the recording. */
export const HOLD_LOCK_PX = 70

/** How far towards the start side (px) it goes to arm the cancel: letting go there throws the recording away. */
export const HOLD_CANCEL_PX = 90

/** A press released within this many ms (or before the microphone is live) is a tap, not a hold: it locks. */
export const TAP_MS = 300

/** A held recording released before this many ms is too short to send and is discarded. */
export const TOO_SHORT_MS = 700

import type { VoiceHaptic } from '../haptics'

export type HoldPhase = 'idle' | 'holding' | 'locked' | 'cancelled' | 'sent'

/** Why it locked: the thumb slid up, a tap, the system took the touch after the lock distance, or the permission sheet took it. */
export type LockHow = 'slide' | 'tap' | 'pointercancel' | 'prompt'

/** Why it was thrown away. */
export type DiscardWhy = 'slide' | 'short' | 'pointercancel' | 'hidden' | 'blur'

export interface HoldState {
  phase: HoldPhase
  /** The one pointer that owns the gesture (a second finger is ignored); null when none. */
  pointerId: number | null
  rtl: boolean
  startX: number
  startY: number
  startedAt: number
  /** How far (px) the thumb is towards the cancel side, 0 or more. */
  cancel: number
  /** How far (px) the thumb is up, 0 or more. */
  lift: number
  /** The cancel distance is passed and it is the way the thumb goes: letting go now throws the recording away. */
  armed: boolean
  lockedBy: LockHow | null
  discardedFor: DiscardWhy | null
}

export type HoldEvent =
  | { type: 'press'; pointerId: number; x: number; y: number; at: number; rtl: boolean }
  | { type: 'move'; pointerId: number; x: number; y: number }
  | { type: 'release'; pointerId: number; at: number; live: boolean }
  /** `pointercancel`, or the capture lost without a `pointerup`. `pointerId` may be left out when unknown. */
  | { type: 'pointercancel'; pointerId?: number; live: boolean }
  /** The page went to the background (`visibilitychange`, hidden). */
  | { type: 'hidden' }
  /** The window lost focus. */
  | { type: 'blur'; live: boolean }
  /** A plain activation (Enter or Space on the button, VoiceOver's double tap, `voiceHold` off). */
  | { type: 'tap' }

/** What the component has to do. */
export type HoldEffect =
  /** Start the recorder, in the press's own turn (the phone only allows the microphone from a gesture). */
  | { type: 'start' }
  | { type: 'send' }
  | { type: 'discard'; why: DiscardWhy }
  | { type: 'lock'; how: LockHow }
  /** One haptic, for a transition (never repeated while the thumb stays past a threshold). */
  | { type: 'haptic'; kind: VoiceHaptic }

export interface HoldStep {
  state: HoldState
  effects: HoldEffect[]
}

export function initialHold(): HoldState {
  return {
    phase: 'idle',
    pointerId: null,
    rtl: false,
    startX: 0,
    startY: 0,
    startedAt: 0,
    cancel: 0,
    lift: 0,
    armed: false,
    lockedBy: null,
    discardedFor: null,
  }
}

/** The hint's progress (0 – 1) on its way to the cancel distance: it fades and shifts with it. */
export function cancelProgress(state: Pick<HoldState, 'cancel'>): number {
  return Math.min(1, Math.max(0, state.cancel / HOLD_CANCEL_PX))
}

/** The lock mark's progress (0 – 1) on its way to the lock distance. */
export function lockProgress(state: Pick<HoldState, 'lift'>): number {
  return Math.min(1, Math.max(0, state.lift / HOLD_LOCK_PX))
}

const haptic = (kind: VoiceHaptic): HoldEffect => ({ type: 'haptic', kind })

const stay = (state: HoldState): HoldStep => ({ state, effects: [] })

function lock(state: HoldState, how: LockHow, ...extra: HoldEffect[]): HoldStep {
  return { state: { ...state, phase: 'locked', armed: false, lockedBy: how }, effects: [{ type: 'lock', how }, ...extra] }
}

function discard(state: HoldState, why: DiscardWhy, ...extra: HoldEffect[]): HoldStep {
  return { state: { ...state, phase: 'cancelled', armed: false, discardedFor: why }, effects: [{ type: 'discard', why }, ...extra] }
}

/** The next state for an event, and what to do about it. Events that mean nothing in a state change nothing. */
export function holdStep(state: HoldState, event: HoldEvent): HoldStep {
  const free = state.phase === 'idle' || state.phase === 'cancelled' || state.phase === 'sent'

  switch (event.type) {
    case 'press': {
      // One pointer only: a second finger (or a press while the recording runs) is not the gesture's.
      if (!free) return stay(state)
      return {
        state: {
          ...initialHold(),
          phase: 'holding',
          pointerId: event.pointerId,
          rtl: event.rtl,
          startX: event.x,
          startY: event.y,
          startedAt: event.at,
        },
        effects: [{ type: 'start' }, haptic('start')],
      }
    }

    case 'tap': {
      if (!free) return stay(state)
      const locked: HoldState = { ...initialHold(), phase: 'locked', lockedBy: 'tap' }
      return { state: locked, effects: [{ type: 'start' }, { type: 'lock', how: 'tap' }, haptic('tapStart')] }
    }

    case 'move': {
      if (state.phase !== 'holding' || event.pointerId !== state.pointerId) return stay(state)
      const dx = event.x - state.startX
      const cancel = Math.max(0, state.rtl ? dx : -dx)
      const lift = Math.max(0, state.startY - event.y)
      const moved = { ...state, cancel, lift }
      // Whichever way the thumb mostly goes decides: up locks at once, the cancel waits for the release.
      if (lift >= HOLD_LOCK_PX && lift >= cancel) return lock(moved, 'slide', haptic('lock'))
      const armed = cancel >= HOLD_CANCEL_PX && cancel > lift
      // One buzz when it arms, one short pulse when it disarms: on the change, not on every move past it.
      const effects: HoldEffect[] = armed === state.armed ? [] : [haptic(armed ? 'armed' : 'disarmed')]
      return { state: { ...moved, armed }, effects }
    }

    case 'release': {
      if (state.phase !== 'holding' || event.pointerId !== state.pointerId) return stay(state)
      if (state.armed) return discard(state, 'slide', haptic('discard'))
      const held = event.at - state.startedAt
      if (!event.live || held < TAP_MS) return lock(state, 'tap')
      if (held < TOO_SHORT_MS) return discard(state, 'short')
      return { state: { ...state, phase: 'sent' }, effects: [{ type: 'send' }, haptic('send')] }
    }

    case 'pointercancel': {
      if (state.phase !== 'holding') return stay(state)
      if (event.pointerId !== undefined && event.pointerId !== state.pointerId) return stay(state)
      // The system took the touch (a gesture of its own, the permission sheet): what was gained stays.
      if (state.lift >= HOLD_LOCK_PX) return lock(state, 'pointercancel')
      if (!event.live) return lock(state, 'prompt')
      return discard(state, 'pointercancel')
    }

    case 'hidden': {
      if (state.phase !== 'holding') return stay(state)
      return discard(state, 'hidden')
    }

    case 'blur': {
      if (state.phase !== 'holding') return stay(state)
      // Before the microphone is live a blur is the permission sheet taking the focus: the cancel or the release that follows decides.
      if (!event.live) return stay(state)
      return discard(state, 'blur')
    }
  }
}
