import { afterEach, describe, expect, it, vi } from 'vitest'
import { hapticsKind, isRatingStep, STEP_GAP_MS, stepTick, tick, TICK_MS, VOICE_HAPTICS, voiceHaptic, type VoiceHaptic } from '../app/utils/haptics'

describe('a haptic tick on the rating', () => {
  it('ticks when the Rating moves to another step, not when it stays', () => {
    expect(isRatingStep(null, 4)).toBe(true)
    expect(isRatingStep(4, 5)).toBe(true)
    expect(isRatingStep(20, null)).toBe(true)
    expect(isRatingStep(7, 7)).toBe(false)
    // Empty is empty, whether null or 0.
    expect(isRatingStep(null, null)).toBe(false)
    expect(isRatingStep(null, 0)).toBe(false)
  })

  describe('on a device', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('does nothing without a navigator, or where the browser has no way to tick', () => {
      vi.stubGlobal('navigator', undefined)
      expect(hapticsKind()).toBeNull()
      expect(() => tick()).not.toThrow()
      vi.stubGlobal('navigator', { maxTouchPoints: 0 })
      expect(hapticsKind()).toBeNull()
      expect(() => tick()).not.toThrow()
    })

    it('vibrates a few milliseconds where the Vibration API exists', () => {
      const vibrate = vi.fn(() => true)
      vi.stubGlobal('navigator', { vibrate, maxTouchPoints: 5 })
      expect(hapticsKind()).toBe('vibrate')
      tick()
      expect(vibrate).toHaveBeenCalledExactlyOnceWith(TICK_MS)
    })

    it('uses the switch checkbox on a touch WebKit without the Vibration API', () => {
      vi.stubGlobal('navigator', { maxTouchPoints: 5 })
      vi.stubGlobal('document', {})
      vi.stubGlobal('CSS', { supports: (name: string) => name === '-webkit-touch-callout' })
      expect(hapticsKind()).toBe('switch')
    })

    it('leaves a touchless WebKit (desktop Safari) alone', () => {
      vi.stubGlobal('navigator', { maxTouchPoints: 0 })
      vi.stubGlobal('document', {})
      vi.stubGlobal('CSS', { supports: () => true })
      expect(hapticsKind()).toBeNull()
    })

    it('swallows a browser that refuses the vibration', () => {
      vi.stubGlobal('navigator', { vibrate: () => { throw new Error('blocked') } })
      expect(() => tick()).not.toThrow()
    })
  })
})

describe('a tick per value on the progress wheel', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('vibrates once per value, but never closer together than a motor can tell apart', () => {
    const vibrate = vi.fn(() => true)
    vi.stubGlobal('navigator', { vibrate, maxTouchPoints: 5 })
    const start = 1_000_000
    expect(stepTick(start)).toBe(true)
    expect(stepTick(start + STEP_GAP_MS / 2)).toBe(false)
    expect(stepTick(start + STEP_GAP_MS)).toBe(true)
    expect(vibrate).toHaveBeenCalledTimes(2)
    expect(vibrate).toHaveBeenCalledWith(TICK_MS)
  })

  it('stays silent where there is no Vibration API (iOS, desktops): no switch trick while dragging', () => {
    vi.stubGlobal('navigator', { maxTouchPoints: 5 })
    vi.stubGlobal('document', {})
    vi.stubGlobal('CSS', { supports: () => true })
    expect(stepTick(2_000_000)).toBe(false)
    vi.stubGlobal('navigator', undefined)
    expect(stepTick(3_000_000)).toBe(false)
  })

  it('swallows a browser that refuses the vibration', () => {
    vi.stubGlobal('navigator', { vibrate: () => { throw new Error('blocked') } })
    expect(stepTick(4_000_000)).toBe(false)
  })
})

describe('the haptics of the voice gesture', () => {
  afterEach(() => vi.unstubAllGlobals())
  const kinds = Object.keys(VOICE_HAPTICS) as VoiceHaptic[]

  it('vibrates each kind with its own pattern where the Vibration API exists', () => {
    const vibrate = vi.fn(() => true)
    vi.stubGlobal('navigator', { vibrate, maxTouchPoints: 5 })
    for (const kind of kinds) expect(voiceHaptic(kind)).toBe(true)
    expect(vibrate.mock.calls.map(([pattern]) => pattern)).toEqual(kinds.map(kind => VOICE_HAPTICS[kind]))
    expect(VOICE_HAPTICS.start).toBe(45)
    expect(VOICE_HAPTICS.lock).toEqual([35, 45, 70])
    expect(VOICE_HAPTICS.armed).toBe(60)
    expect(VOICE_HAPTICS.disarmed).toBe(20)
    expect(VOICE_HAPTICS.send).toBe(30)
    expect(VOICE_HAPTICS.discard).toEqual([60, 40, 90])
  })

  it('is firmer than the rating tick, and the kinds are told apart', () => {
    for (const kind of kinds) {
      const pattern = VOICE_HAPTICS[kind]
      expect(Math.max(...[pattern].flat())).toBeGreaterThan(TICK_MS)
    }
    expect(new Set(kinds.map(kind => JSON.stringify(VOICE_HAPTICS[kind]))).size).toBe(kinds.length)
    // The cancel buzz is the longest single pulse; the lock and the discard are patterns.
    expect(VOICE_HAPTICS.armed).toBeGreaterThan(VOICE_HAPTICS.start)
    expect(Array.isArray(VOICE_HAPTICS.lock) && Array.isArray(VOICE_HAPTICS.discard)).toBe(true)
  })

  it('does not throw, and says so, when the API is absent, refuses (false) or throws', () => {
    vi.stubGlobal('navigator', undefined)
    expect(() => voiceHaptic('armed')).not.toThrow()
    expect(voiceHaptic('armed')).toBe(false)
    vi.stubGlobal('navigator', { maxTouchPoints: 0 })
    expect(voiceHaptic('lock')).toBe(false)
    vi.stubGlobal('navigator', { vibrate: () => false })
    expect(voiceHaptic('lock')).toBe(false)
    vi.stubGlobal('navigator', { vibrate: () => { throw new Error('blocked') } })
    expect(() => voiceHaptic('discard')).not.toThrow()
    expect(voiceHaptic('discard')).toBe(false)
  })

  it('gives iOS the switch tick for start and lock only', () => {
    const click = vi.fn()
    const label = { setAttribute() {}, style: {}, append() {}, click, isConnected: true }
    vi.stubGlobal('navigator', { maxTouchPoints: 5 })
    vi.stubGlobal('CSS', { supports: (name: string) => name === '-webkit-touch-callout' })
    vi.stubGlobal('document', {
      createElement: () => ({ ...label, append() {} }),
      body: { append() {} },
    })
    expect(voiceHaptic('armed')).toBe(false)
    expect(voiceHaptic('send')).toBe(false)
    expect(voiceHaptic('discard')).toBe(false)
    expect(click).not.toHaveBeenCalled()
    expect(voiceHaptic('start')).toBe(true)
    expect(voiceHaptic('lock')).toBe(true)
  })
})
