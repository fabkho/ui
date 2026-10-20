import { describe, expect, it } from 'vitest'
import {
  canPlayVoice,
  checkVoice,
  clock,
  micProblem,
  mimeOfPath,
  peaksFrom,
  pickRecordingType,
  PEAK_COUNT,
  voiceExtension,
  voiceMime,
} from '../app/utils/chat/voice'

/**
 * Voice messages without a stack: which type a phone records and how it is stored, when a device
 * can play it, the waveform and the clock, what may be sent and the mic errors. Moved from
 * Bookretreats' `chat-voice-rules.test.ts` with the same assertions; what stayed there is its own:
 * the limits' values, the German words, the database's refusals and how a row reads as a message.
 */

describe('the recording type', () => {
  it('takes AAC in mp4 first, then opus in webm, then in ogg', () => {
    expect(pickRecordingType(() => true)).toBe('audio/mp4')
    expect(pickRecordingType((t) => t.startsWith('audio/webm') || t.startsWith('audio/ogg'))).toBe('audio/webm;codecs=opus')
    expect(pickRecordingType((t) => t.startsWith('audio/ogg'))).toBe('audio/ogg;codecs=opus')
    expect(pickRecordingType(() => false)).toBeNull()
    expect(pickRecordingType(null)).toBeNull()
    expect(
      pickRecordingType(() => {
        throw new Error('unknown type')
      }),
    ).toBeNull()
  })

  it('stores the real type without its codec, under the extension it has', () => {
    expect(voiceMime('audio/mp4;codecs=mp4a.40.2')).toBe('audio/mp4')
    expect(voiceMime('audio/webm;codecs=opus')).toBe('audio/webm')
    expect(voiceMime('Audio/Ogg; codecs=opus')).toBe('audio/ogg')
    expect(voiceMime('audio/mpeg')).toBeNull()
    expect(voiceMime('')).toBeNull()
    expect(voiceMime(undefined)).toBeNull()
    expect(voiceExtension('audio/mp4')).toBe('m4a')
    expect(voiceExtension('audio/webm')).toBe('webm')
    expect(voiceExtension('audio/ogg')).toBe('ogg')
    expect(mimeOfPath('c/s/0000.m4a')).toBe('audio/mp4')
    expect(mimeOfPath('c/s/0000.webm')).toBe('audio/webm')
    expect(mimeOfPath('c/s/0000.jpg')).toBeNull()
    expect(mimeOfPath(null)).toBeNull()
  })
})

describe('playing it', () => {
  it('asks the device: a WebM an iPhone cannot decode is not offered a play button', () => {
    const iphone = (type: string) => (type.startsWith('audio/mp4') ? 'maybe' : '')
    const chrome = () => 'probably'
    expect(canPlayVoice('audio/mp4', iphone)).toBe(true)
    expect(canPlayVoice('audio/webm', iphone)).toBe(false)
    expect(canPlayVoice('audio/ogg', iphone)).toBe(false)
    expect(canPlayVoice('audio/webm', chrome)).toBe(true)
    // Without an audio element it tries rather than refuses; an unknown type never plays.
    expect(canPlayVoice('audio/webm', null)).toBe(true)
    expect(canPlayVoice(null, chrome)).toBe(false)
  })
})

describe('the waveform and the clock', () => {
  it('draws the loudest slice of each share, the loudest bar at 100, never below the floor', () => {
    const levels = Array.from({ length: 64 }, (_, i) => (i === 10 ? 0.8 : i === 50 ? 0.4 : 0))
    const peaks = peaksFrom(levels)
    expect(peaks).toHaveLength(PEAK_COUNT)
    expect(Math.max(...peaks)).toBe(100)
    expect(Math.min(...peaks)).toBe(8)
    expect(peaks.filter((p) => p === 50)).toHaveLength(1)
    expect(peaksFrom([0, 0, 0, 0])).toEqual([8, 8, 8, 8])
    expect(peaksFrom([])).toEqual([])
    // Fewer readings than bars: one bar each.
    expect(peaksFrom([0.2, 0.4])).toEqual([50, 100])
    // What the database takes: 0 – 100, at most 48.
    expect(peaksFrom(levels, 48).every((p) => p >= 0 && p <= 100)).toBe(true)
  })

  it('writes a timer as 0:07 and a length as it plays', () => {
    expect(clock(0)).toBe('0:00')
    expect(clock(7.9)).toBe('0:07')
    expect(clock(125)).toBe('2:05')
    expect(clock(120)).toBe('2:00')
    expect(clock(2.0, true)).toBe('0:02')
    expect(clock(2.4, true)).toBe('0:03')
  })
})

describe('what may be sent', () => {
  const audio = (size: number, type = 'audio/mp4') => new Blob([new Uint8Array(size)], { type })

  // Bookretreats' limits (3 MB at most, a second at least), which stay in that
  // app (`VOICE_MAX_BYTES` etc.): here the rule takes them as parameters.
  const VOICE_MAX_BYTES = 3 * 1024 * 1024
  const limits = { minMs: 1_000, maxBytes: VOICE_MAX_BYTES }

  it('is a second at least, a size at most, a type the bucket takes', () => {
    expect(checkVoice(audio(100_000), 5_000, limits)).toBeNull()
    expect(checkVoice(audio(100_000, 'audio/webm;codecs=opus'), 120_000, limits)).toBeNull()
    expect(checkVoice(audio(100_000), 400, limits)).toBe('short')
    expect(checkVoice(audio(VOICE_MAX_BYTES + 1), 5_000, limits)).toBe('large')
    expect(checkVoice(audio(0), 5_000, limits)).toBe('large')
    expect(checkVoice(audio(100, 'audio/mpeg'), 5_000, limits)).toBe('type')
  })
})

describe('when the microphone does not start', () => {
  it('names the reason', () => {
    expect(micProblem({ name: 'NotAllowedError' })).toBe('denied')
    expect(micProblem({ name: 'NotFoundError' })).toBe('none')
    expect(micProblem({ name: 'NotReadableError' })).toBe('busy')
    expect(micProblem({ name: 'NotSupportedError' })).toBe('unsupported')
    expect(micProblem(new Error('x'))).toBe('failed')
    expect(micProblem(null)).toBe('failed')
  })
})
