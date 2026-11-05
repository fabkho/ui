import { describe, expect, it } from 'vitest'
import {
  HOLD_CANCEL_PX,
  HOLD_LOCK_PX,
  TAP_MS,
  TOO_SHORT_MS,
  cancelProgress,
  holdStep,
  initialHold,
  lockProgress,
  type HoldEffect,
  type HoldEvent,
  type HoldState,
} from '../app/utils/chat/voiceGesture'

/**
 * The microphone's gesture (WhatsApp's): hold to record, release to send, slide up to lock, slide towards
 * the start side to cancel; a tap, and a press the permission sheet eats, fall back to the tap-to-record
 * panel. Pure: events in, state and effects out, the clock a number.
 */

const X = 300
const Y = 600

/** Runs the events in order from a state, returning the last state and every effect there was. */
function run(events: HoldEvent[], from: HoldState = initialHold()) {
  let state = from
  const effects: HoldEffect[] = []
  for (const event of events) {
    const step = holdStep(state, event)
    state = step.state
    effects.push(...step.effects)
  }
  return { state, effects }
}

const press = (at = 0, rtl = false): HoldEvent => ({ type: 'press', pointerId: 1, x: X, y: Y, at, rtl })
const move = (dx: number, dy: number, pointerId = 1): HoldEvent => ({ type: 'move', pointerId, x: X + dx, y: Y + dy })
const release = (at: number, live = true, pointerId = 1): HoldEvent => ({ type: 'release', pointerId, at, live })

describe('a hold', () => {
  it('starts the recorder at once, on the press', () => {
    const { state, effects } = run([press()])
    expect(state.phase).toBe('holding')
    expect(state.pointerId).toBe(1)
    expect(effects).toEqual([{ type: 'start' }])
  })

  it('sends when it is let go after being held long enough', () => {
    const { state, effects } = run([press(0), release(TOO_SHORT_MS + 1)])
    expect(state.phase).toBe('sent')
    expect(effects).toEqual([{ type: 'start' }, { type: 'send' }])
  })

  it('sends a long hold that wandered, as long as it did not go far', () => {
    const { state } = run([press(0), move(-40, -30), move(-20, -10), release(5000)])
    expect(state.phase).toBe('sent')
  })

  it('is thrown away when it is let go before it is long enough to send', () => {
    for (const at of [TAP_MS, TOO_SHORT_MS - 1]) {
      const { state, effects } = run([press(0), release(at)])
      expect(state.phase).toBe('cancelled')
      expect(state.discardedFor).toBe('short')
      expect(effects).toEqual([{ type: 'start' }, { type: 'discard', why: 'short' }])
    }
  })

  it('sends at exactly the shortest length, and not a millisecond before', () => {
    expect(run([press(0), release(TOO_SHORT_MS)]).state.phase).toBe('sent')
    expect(run([press(0), release(TOO_SHORT_MS - 1)]).state.phase).toBe('cancelled')
  })
})

describe('the tap fallback', () => {
  it('locks instead of sending or throwing away when released within the tap time', () => {
    const { state, effects } = run([press(0), release(TAP_MS - 1)])
    expect(state.phase).toBe('locked')
    expect(state.lockedBy).toBe('tap')
    expect(effects).toEqual([{ type: 'start' }, { type: 'lock', how: 'tap' }])
  })

  it('locks when released before the microphone is live (the permission sheet is up), however long it took', () => {
    const { state } = run([press(0), release(2500, false)])
    expect(state.phase).toBe('locked')
    expect(state.lockedBy).toBe('tap')
  })

  it('locks when the permission sheet cancels the touch', () => {
    const { state, effects } = run([press(0), { type: 'pointercancel', pointerId: 1, live: false }])
    expect(state.phase).toBe('locked')
    expect(state.lockedBy).toBe('prompt')
    expect(effects.at(-1)).toEqual({ type: 'lock', how: 'prompt' })
  })

  it('locks on a plain activation (Enter, Space, VoiceOver, voiceHold off): start and lock', () => {
    const { state, effects } = run([{ type: 'tap' }])
    expect(state.phase).toBe('locked')
    expect(effects).toEqual([{ type: 'start' }, { type: 'lock', how: 'tap' }])
  })

  it('does not start a second recording from a tap while one runs', () => {
    const locked = run([{ type: 'tap' }]).state
    expect(holdStep(locked, { type: 'tap' }).effects).toEqual([])
    const holding = run([press()]).state
    expect(holdStep(holding, { type: 'tap' }).effects).toEqual([])
  })
})

describe('sliding up', () => {
  it('locks as soon as the thumb is past the lock distance, with no release', () => {
    const { state, effects } = run([press(0), move(0, -(HOLD_LOCK_PX - 1)), move(0, -HOLD_LOCK_PX)])
    expect(state.phase).toBe('locked')
    expect(state.lockedBy).toBe('slide')
    expect(effects).toEqual([{ type: 'start' }, { type: 'lock', how: 'slide' }])
  })

  it('does not lock short of the distance', () => {
    const { state } = run([press(0), move(0, -(HOLD_LOCK_PX - 1))])
    expect(state.phase).toBe('holding')
  })

  it('ignores what the finger does after the lock', () => {
    const { state, effects } = run([press(0), move(0, -100), release(2000), move(-200, 0)])
    expect(state.phase).toBe('locked')
    expect(effects).toEqual([{ type: 'start' }, { type: 'lock', how: 'slide' }])
  })

  it('does not lock when the thumb mostly went the other way', () => {
    const { state } = run([press(0), move(-(HOLD_LOCK_PX + 30), -HOLD_LOCK_PX)])
    expect(state.phase).toBe('holding')
    expect(state.armed).toBe(true)
  })

  it('counts a move down as no lift', () => {
    const { state } = run([press(0), move(0, 200)])
    expect(state.lift).toBe(0)
    expect(state.phase).toBe('holding')
  })
})

describe('sliding to cancel', () => {
  it('throws the recording away when let go past the cancel distance', () => {
    const { state, effects } = run([press(0), move(-HOLD_CANCEL_PX, 0), release(3000)])
    expect(state.phase).toBe('cancelled')
    expect(state.discardedFor).toBe('slide')
    expect(effects).toEqual([{ type: 'start' }, { type: 'discard', why: 'slide' }])
  })

  it('is not cancelled by the slide alone: it waits for the release', () => {
    const { state, effects } = run([press(0), move(-HOLD_CANCEL_PX - 50, 0)])
    expect(state.phase).toBe('holding')
    expect(state.armed).toBe(true)
    expect(effects).toEqual([{ type: 'start' }])
  })

  it('cancels a quick flick as well, even inside the tap time or before the microphone is live', () => {
    expect(run([press(0), move(-HOLD_CANCEL_PX, 0), release(100)]).state.phase).toBe('cancelled')
    expect(run([press(0), move(-HOLD_CANCEL_PX, 0), release(100, false)]).state.phase).toBe('cancelled')
  })

  it('takes the cancel back when the thumb returns before it is let go', () => {
    const { state } = run([press(0), move(-HOLD_CANCEL_PX - 20, 0), move(-20, 0), release(3000)])
    expect(state.armed).toBe(false)
    expect(state.phase).toBe('sent')
  })

  it('does not cancel short of the distance', () => {
    expect(run([press(0), move(-(HOLD_CANCEL_PX - 1), 0), release(3000)]).state.phase).toBe('sent')
  })

  it('does not count the other direction (towards the end side) as cancelling', () => {
    const { state } = run([press(0), move(HOLD_CANCEL_PX + 40, 0), release(3000)])
    expect(state.cancel).toBe(0)
    expect(state.phase).toBe('sent')
  })

  it('reports how far it is, for the hint to fade and the lock mark to rise', () => {
    const { state } = run([press(0), move(-HOLD_CANCEL_PX / 2, -HOLD_LOCK_PX / 4)])
    expect(cancelProgress(state)).toBeCloseTo(0.5)
    expect(lockProgress(state)).toBeCloseTo(0.25)
    expect(cancelProgress({ cancel: 5000 })).toBe(1)
    expect(lockProgress({ lift: 0 })).toBe(0)
  })
})

describe('right to left', () => {
  it('cancels towards the right, the start side of the line', () => {
    const { state } = run([press(0, true), move(HOLD_CANCEL_PX, 0), release(3000)])
    expect(state.phase).toBe('cancelled')
    expect(state.discardedFor).toBe('slide')
  })

  it('does not cancel towards the left', () => {
    const { state } = run([press(0, true), move(-(HOLD_CANCEL_PX + 40), 0), release(3000)])
    expect(state.cancel).toBe(0)
    expect(state.phase).toBe('sent')
  })

  it('locks upwards, as in LTR', () => {
    expect(run([press(0, true), move(0, -HOLD_LOCK_PX)]).state.phase).toBe('locked')
  })
})

describe('when the system or the page takes over', () => {
  it('throws the hold away on a pointercancel before the lock distance', () => {
    const { state, effects } = run([press(0), move(0, -(HOLD_LOCK_PX - 10)), { type: 'pointercancel', pointerId: 1, live: true }])
    expect(state.phase).toBe('cancelled')
    expect(state.discardedFor).toBe('pointercancel')
    expect(effects.at(-1)).toEqual({ type: 'discard', why: 'pointercancel' })
  })

  it('locks on a pointercancel after the lock distance (the thumb went up and a system gesture took it)', () => {
    // Up past the lock distance, but further sideways: no lock by the slide, then the system cancels.
    const { state, effects } = run([
      press(0),
      move(-(HOLD_LOCK_PX + 20), -(HOLD_LOCK_PX + 5)),
      { type: 'pointercancel', pointerId: 1, live: true },
    ])
    expect(state.phase).toBe('locked')
    expect(state.lockedBy).toBe('pointercancel')
    expect(effects.at(-1)).toEqual({ type: 'lock', how: 'pointercancel' })
  })

  it('throws the hold away when the page goes to the background, live or not', () => {
    for (const events of [[press(0), { type: 'hidden' } as HoldEvent], [press(0), move(0, -20), { type: 'hidden' } as HoldEvent]]) {
      const { state, effects } = run(events)
      expect(state.phase).toBe('cancelled')
      expect(state.discardedFor).toBe('hidden')
      expect(effects.at(-1)).toEqual({ type: 'discard', why: 'hidden' })
    }
  })

  it('throws the hold away when the window loses focus while the microphone is live', () => {
    const { state } = run([press(0), { type: 'blur', live: true }])
    expect(state.phase).toBe('cancelled')
    expect(state.discardedFor).toBe('blur')
  })

  it('does not take a blur for a cancel while the permission sheet is up (the microphone is not live yet)', () => {
    const { state, effects } = run([press(0), { type: 'blur', live: false }])
    expect(state.phase).toBe('holding')
    expect(effects).toEqual([{ type: 'start' }])
  })

  it('leaves a locked recording alone when the page goes away or the window blurs', () => {
    const locked = run([{ type: 'tap' }]).state
    for (const event of [{ type: 'hidden' }, { type: 'blur', live: true }, { type: 'pointercancel', live: true }] as HoldEvent[]) {
      const step = holdStep(locked, event)
      expect(step.state.phase).toBe('locked')
      expect(step.effects).toEqual([])
    }
  })
})

describe('one pointer', () => {
  it('ignores a second finger: its press, its moves and its release', () => {
    const { state, effects } = run([
      press(0),
      { type: 'press', pointerId: 2, x: 10, y: 10, at: 50, rtl: false },
      move(-HOLD_CANCEL_PX, -HOLD_LOCK_PX, 2),
      release(5000, true, 2),
      { type: 'pointercancel', pointerId: 2, live: true },
    ])
    expect(state.phase).toBe('holding')
    expect(state.pointerId).toBe(1)
    expect(state.cancel).toBe(0)
    expect(effects).toEqual([{ type: 'start' }])
  })

  it('takes a new press once the last gesture is over', () => {
    for (const events of [
      [press(0), release(2000)],
      [press(0), move(-HOLD_CANCEL_PX, 0), release(2000)],
    ]) {
      const over = run(events).state
      expect(['sent', 'cancelled']).toContain(over.phase)
      const again = holdStep(over, { type: 'press', pointerId: 7, x: X, y: Y, at: 9000, rtl: false })
      expect(again.state.phase).toBe('holding')
      expect(again.state.pointerId).toBe(7)
      expect(again.state.cancel).toBe(0)
      expect(again.effects).toEqual([{ type: 'start' }])
    }
  })

  it('does nothing for events while nothing is held', () => {
    for (const event of [move(-200, -200), release(1000), { type: 'pointercancel', live: true }, { type: 'hidden' }, { type: 'blur', live: true }] as HoldEvent[]) {
      const step = holdStep(initialHold(), event)
      expect(step.state.phase).toBe('idle')
      expect(step.effects).toEqual([])
    }
  })
})
