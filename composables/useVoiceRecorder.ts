import type { MaybeRefOrGetter } from 'vue'
import {
  LIVE_BARS,
  micProblem,
  peaksFrom,
  pickRecordingType,
  voiceMime,
  VOICE_BITS_PER_SECOND,
  type MicProblem,
  type PreparedVoice,
} from '../utils/chat/voice'

/**
 * The recorder behind the composer's microphone (UiComposer, voice messages): tap to start, tap to send, cancel
 * to throw away. `MediaRecorder` records in the best type the device has (`pickRecordingType`: AAC in
 * mp4 first, because every phone plays it), an `AnalyserNode` reads the loudness ten times a second for
 * the live bars and, at the end, the waveform that goes with the message.
 *
 * - `idle` → `start()` asks for the microphone (the phone's own permission sheet; a refusal is
 *   `problem`, `'denied'` and the others, worded by `chat.voice.problems`) → `recording`.
 * - `recording`: `elapsedMs` counts, `bars` are the latest loudness readings (0 – 1). At `maxMs`
 *   (the app's limit, Bookretreats' two minutes) it stops itself (`limitReached`): the state is `stopped`, the recording is kept and can
 *   still be sent or thrown away.
 * - `finish()` resolves to the recording (stopping it first), or null when there is none; the
 *   recorder is `idle` again. `cancel()` throws it away. Leaving the page does the same.
 *
 * Nothing leaves the device here; the app uploads what `finish()` hands over.
 */

const TICK_MS = 100

export type RecorderState = 'idle' | 'starting' | 'recording' | 'stopped'

export interface VoiceRecorderOptions {
  /** The longest recording in milliseconds: it stops itself there. */
  maxMs: MaybeRefOrGetter<number>
}

export function useVoiceRecorder(options: VoiceRecorderOptions) {
  const maxMs = () => toValue(options.maxMs)
  const state = ref<RecorderState>('idle')
  const elapsedMs = ref(0)
  const bars = ref<number[]>([])
  const problem = ref<MicProblem | null>(null)
  const limitReached = ref(false)

  let stream: MediaStream | null = null
  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let recorded: Blob | null = null
  let levels: number[] = []
  let context: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let samples: Float32Array<ArrayBuffer> | null = null
  let ticker: ReturnType<typeof setInterval> | undefined
  let startedAt = 0
  let durationMs = 0
  let stopped: Promise<void> | null = null
  /** Counts the starts: a start that finds a newer one (or a cancel) after the phone's permission sheet is dropped. */
  let attempt = 0

  const supported = computed(() => {
    if (!import.meta.client) return false
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  })

  function openContext(): AudioContext | null {
    try {
      const AudioContextClass =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      return AudioContextClass ? new AudioContextClass() : null
    } catch {
      return null
    }
  }

  function level(): number {
    if (!analyser || !samples) return 0
    analyser.getFloatTimeDomainData(samples)
    let sum = 0
    for (const v of samples) sum += v * v
    const rms = Math.sqrt(sum / samples.length)
    if (rms <= 0) return 0
    // −50 dB … 0 dB as 0 … 1: a quiet room reads low, speech reads high.
    return Math.min(1, Math.max(0, (20 * Math.log10(rms) + 50) / 50))
  }

  function tick() {
    elapsedMs.value = Math.min(performance.now() - startedAt, maxMs())
    const now = level()
    levels.push(now)
    bars.value = [...bars.value, now].slice(-LIVE_BARS)
    if (performance.now() - startedAt >= maxMs() && state.value === 'recording') {
      limitReached.value = true
      void halt()
    }
  }

  function release() {
    clearInterval(ticker)
    ticker = undefined
    for (const track of stream?.getTracks() ?? []) track.stop()
    stream = null
    void context?.close().catch(() => {})
    context = null
    analyser = null
    samples = null
  }

  /** Stops the recorder (if it runs) and waits for the last data. */
  function halt(): Promise<void> {
    if (stopped) return stopped
    const r = recorder
    if (!r || r.state === 'inactive') return Promise.resolve()
    durationMs = Math.min(performance.now() - startedAt, maxMs())
    elapsedMs.value = durationMs
    stopped = new Promise<void>((resolve) => {
      r.addEventListener(
        'stop',
        () => {
          recorded = new Blob(chunks, { type: r.mimeType || chunks[0]?.type || '' })
          release()
          state.value = 'stopped'
          stopped = null
          resolve()
        },
        { once: true },
      )
      try {
        r.stop()
      } catch {
        release()
        state.value = 'stopped'
        stopped = null
        resolve()
      }
    })
    return stopped
  }

  function reset() {
    release()
    recorder = null
    chunks = []
    recorded = null
    levels = []
    stopped = null
    bars.value = []
    elapsedMs.value = 0
    durationMs = 0
    limitReached.value = false
    state.value = 'idle'
  }

  /** Asks for the microphone and starts. Resolves to why it could not, or null. */
  async function start(): Promise<MicProblem | null> {
    if (state.value !== 'idle') return null
    problem.value = null
    const type = import.meta.client && typeof MediaRecorder !== 'undefined' ? pickRecordingType(MediaRecorder.isTypeSupported?.bind(MediaRecorder)) : null
    if (!supported.value) {
      problem.value = 'unsupported'
      return problem.value
    }
    state.value = 'starting'
    const mine = ++attempt
    // Made now, in the tap's own turn: Safari on an iPhone starts an AudioContext made after the
    // permission sheet suspended, and a suspended one reads silence (flat bars, a flat waveform).
    const early = openContext()
    context = early
    let granted: MediaStream
    try {
      granted = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch (error) {
      if (mine !== attempt) {
        void early?.close().catch(() => {})
        return null
      }
      reset()
      problem.value = micProblem(error)
      return problem.value
    }
    if (mine !== attempt) {
      for (const track of granted.getTracks()) track.stop()
      void early?.close().catch(() => {})
      return null
    }
    stream = granted
    try {
      try {
        recorder = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: VOICE_BITS_PER_SECOND } : { audioBitsPerSecond: VOICE_BITS_PER_SECOND })
      } catch {
        // An encoder that refuses the bit rate still records at its own.
        recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      }
      chunks = []
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      })
      // The phone took the microphone away (a call, the app in the background): what is there stays.
      stream.getAudioTracks()[0]?.addEventListener('ended', () => void halt())
      try {
        if (context) {
          void context.resume().catch(() => {})
          analyser = context.createAnalyser()
          analyser.fftSize = 1024
          samples = new Float32Array(analyser.fftSize)
          context.createMediaStreamSource(stream).connect(analyser)
        }
      } catch {
        // No live bars then; the recording itself is what counts.
        analyser = null
      }
      recorder.start()
      startedAt = performance.now()
      state.value = 'recording'
      ticker = setInterval(tick, TICK_MS)
      return null
    } catch (error) {
      reset()
      problem.value = micProblem(error)
      return problem.value
    }
  }

  /** The recording, stopped if it still runs; the recorder is idle again. Null when there is nothing. */
  async function finish(): Promise<PreparedVoice | null> {
    if (state.value === 'idle' || state.value === 'starting') return null
    await halt()
    const blob = recorded
    const mime = voiceMime(blob?.type)
    const result: PreparedVoice | null =
      blob && mime ? { blob, mime, durationMs, peaks: peaksFrom(levels) } : null
    reset()
    return result
  }

  /** Throws the recording away. */
  function cancel() {
    attempt++
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        // Already gone.
      }
    }
    reset()
  }

  onBeforeUnmount(cancel)

  return { state, elapsedMs, bars, problem, limitReached, supported, start, finish, cancel }
}
