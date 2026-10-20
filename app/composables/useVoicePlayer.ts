import { canPlayVoice, type VoiceMime } from '../utils/chat/voice'

/**
 * Plays the voice messages of the chat (UiVoiceBubble): one `Audio` for the whole app, one voice at a time —
 * starting another stops the first, as in every messenger. The bubble asks `toggle(key, url)`; the
 * state is shared (`current.key` is the bubble that has the sound, `playing`, `positionMs`).
 *
 * The length comes from the message (`durationMs`), never from the file: what `MediaRecorder`
 * writes often has no length in its header (`audio.duration` is `Infinity` in Chrome's webm), so
 * the progress is `positionMs / durationMs`, clamped. Seeking is left out for the same reason.
 *
 * `failed` marks the bubble whose sound could not start or broke off (a link that expired, a type
 * the device cannot decode); the next tap tries again with the URL it is given then.
 */

type Current = { key: string | null; playing: boolean; positionMs: number; failed: boolean }

const current = reactive<Current>({ key: null, playing: false, positionMs: 0, failed: false })
let audio: HTMLAudioElement | null = null
let frame = 0

function watchPosition() {
  cancelAnimationFrame(frame)
  const step = () => {
    if (!audio || !current.playing) return
    current.positionMs = Math.round(audio.currentTime * 1000)
    frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}

function drop() {
  cancelAnimationFrame(frame)
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    audio = null
  }
  current.key = null
  current.playing = false
  current.positionMs = 0
  current.failed = false
}

/** Whether this device can play a recording of this type (asked of the browser, once per type). */
export function canPlayHere(mime: VoiceMime | null): boolean {
  if (!import.meta.client) return true
  const probe = typeof Audio === 'undefined' ? null : (type: string) => new Audio().canPlayType(type)
  return canPlayVoice(mime, probe)
}

export function useVoicePlayer() {
  /** Play the bubble `key` from `url`, pause it when it is the one playing, resume it when it is paused. */
  function toggle(key: string, url: string): void {
    if (audio && current.key === key && !current.failed) {
      if (current.playing) {
        audio.pause()
        current.playing = false
        return
      }
      void audio.play().then(
        () => {
          current.playing = true
          watchPosition()
        },
        () => (current.failed = true),
      )
      return
    }
    drop()
    const element = new Audio(url)
    element.preload = 'auto'
    audio = element
    current.key = key
    current.failed = false
    element.addEventListener('ended', () => {
      if (audio !== element) return
      cancelAnimationFrame(frame)
      current.playing = false
      current.positionMs = 0
      current.key = null
    })
    element.addEventListener('error', () => {
      if (audio !== element) return
      cancelAnimationFrame(frame)
      current.playing = false
      current.failed = true
    })
    element.addEventListener('pause', () => {
      if (audio === element && !element.ended) current.playing = false
    })
    void element.play().then(
      () => {
        if (audio !== element) return
        current.playing = true
        watchPosition()
      },
      () => {
        if (audio === element) current.failed = true
      },
    )
  }

  /** Silence (leaving the chat). */
  function stop() {
    drop()
  }

  return { current, toggle, stop }
}
