/**
 * Voice messages: what a phone records, how a recording is described and when it can be played.
 * Framework-free: the rules and the pure helpers run anywhere (Vitest, plain Node); `MediaRecorder`
 * and `Audio` belong to the recorder and the player (composables). Not auto-imported: import from
 * `#ui/utils/chat/voice`, or from `@fabkho/ui/pure/voice` in plain Node.
 *
 * Plain ESM with JSDoc types (no build step): TypeScript reads the JSDoc, so consumers get the types
 * without a compile of their own.
 *
 * **Types.** The recorder asks `MediaRecorder.isTypeSupported` in `RECORDING_TYPES`' order and
 * takes the first it can: `audio/mp4` (AAC: Safari since 14.3, Chrome since 126, so it plays on
 * every phone that can record it), then `audio/webm;codecs=opus` (older Chrome, Android), then
 * `audio/ogg;codecs=opus` (Firefox). The real type is what is stored (the mime type, and the
 * extension in the path: `.m4a`, `.webm`, `.ogg`). Playing is another question: Safari on an
 * iPhone plays mp4 but not (always) webm or ogg, Firefox the reverse. `canPlayVoice` asks the
 * device (`canPlayType`) before a bubble offers a play button. There is no transcoding on the phone.
 *
 * **Limits are the app's.** How long a recording may be, how big, how short is a slip of the
 * finger are policy (a bucket's size, a database's check): `checkVoice` takes them as `VoiceLimits`.
 */

/**
 * The mime types a recording is stored as.
 * @typedef {'audio/mp4' | 'audio/webm' | 'audio/ogg'} VoiceMime
 */

/**
 * A recording as the chat sends it.
 * @typedef {object} PreparedVoice
 * @property {Blob} blob
 * @property {VoiceMime} mime
 * @property {number} durationMs Milliseconds.
 * @property {number[]} peaks The waveform, 0 – 100 each.
 */

/**
 * The app's limits for a recording: shorter is a slip of the finger, bigger does not fit the store.
 * @typedef {object} VoiceLimits
 * @property {number} minMs The shortest recording, in milliseconds.
 * @property {number} maxBytes The most bytes a recording may have.
 */

/**
 * Why a finished recording is not sent; the app words it.
 * @typedef {'short' | 'large' | 'type'} VoiceRejection
 */

/**
 * How a recording that went wrong is told: no permission, no microphone, taken, or unknown.
 * @typedef {'denied' | 'none' | 'busy' | 'unsupported' | 'failed'} MicProblem
 */

/** What the recorder asks the encoder for: speech, small (two minutes ≈ 0.7 MB). */
export const VOICE_BITS_PER_SECOND = 48_000

/** How many bars a waveform has by default. */
export const PEAK_COUNT = 32

/**
 * The three types a recording is stored as, with the extension its path has.
 * @type {ReadonlyArray<{ readonly mime: VoiceMime, readonly ext: string }>}
 */
export const VOICE_TYPES = [
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/ogg', ext: 'ogg' },
]

/**
 * What the recorder tries, best first; the codec is part of what `MediaRecorder` is asked for.
 * @type {readonly string[]}
 */
export const RECORDING_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus']

/**
 * `audio/webm;codecs=opus` → `audio/webm`: the type as it is stored; null for anything else.
 * @param {string | null | undefined} type
 * @returns {VoiceMime | null}
 */
export function voiceMime(type) {
  const base = (type ?? '').split(';')[0].trim().toLowerCase()
  return VOICE_TYPES.find((t) => t.mime === base)?.mime ?? null
}

/**
 * The extension a recording of this type is stored under.
 * @param {VoiceMime} mime
 * @returns {string}
 */
export function voiceExtension(mime) {
  return VOICE_TYPES.find((t) => t.mime === mime).ext
}

/**
 * The type a stored recording has, from its path (`…/uuid.m4a` → `audio/mp4`).
 * @param {string | null | undefined} path
 * @returns {VoiceMime | null}
 */
export function mimeOfPath(path) {
  const ext = /\.([a-z0-9]+)$/.exec(path ?? '')?.[1]
  return VOICE_TYPES.find((t) => t.ext === ext)?.mime ?? null
}

/**
 * The first of `RECORDING_TYPES` the device can record, or null (no `MediaRecorder`, or none of them).
 * @param {((type: string) => boolean) | null | undefined} isTypeSupported
 * @returns {string | null}
 */
export function pickRecordingType(isTypeSupported) {
  if (!isTypeSupported) return null
  for (const type of RECORDING_TYPES) {
    try {
      if (isTypeSupported(type)) return type
    } catch {
      // A browser that throws on a type does not know it.
    }
  }
  return null
}

/**
 * Whether this device can play a recording of this type. `canPlayType` answers '' (no),
 * 'maybe' or 'probably'; anything but '' is a yes. Without an audio element (a test, a very old
 * browser) it is a yes: the bubble would rather try than refuse.
 * @param {VoiceMime | null} mime
 * @param {((type: string) => string) | null | undefined} probe
 * @returns {boolean}
 */
export function canPlayVoice(mime, probe) {
  if (!mime) return false
  if (!probe) return true
  const codecs = mime === 'audio/mp4' ? 'audio/mp4' : `${mime}; codecs="opus"`
  return probe(codecs) !== '' || probe(mime) !== ''
}

/**
 * The loudness slices of a recording (0 – 1 each, about ten a second) as the waveform the message
 * carries: `count` bars (`PEAK_COUNT` by default) of 0 – 100, each the loudest slice of its share,
 * the loudest bar 100, a quiet one never below `floor` (so the bar never vanishes). A recording of
 * silence reads flat at the floor.
 * @param {readonly number[]} levels
 * @param {number} [count]
 * @param {number} [floor]
 * @returns {number[]}
 */
export function peaksFrom(levels, count = PEAK_COUNT, floor = 8) {
  if (levels.length === 0) return []
  const n = Math.min(count, levels.length)
  /** @type {number[]} */
  const bars = []
  for (let i = 0; i < n; i++) {
    const from = Math.floor((i * levels.length) / n)
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / n))
    let peak = 0
    for (let j = from; j < to; j++) peak = Math.max(peak, levels[j] ?? 0)
    bars.push(peak)
  }
  const loudest = Math.max(...bars)
  if (loudest <= 0) return bars.map(() => floor)
  return bars.map((b) => Math.min(100, Math.max(floor, Math.round((b / loudest) * 100))))
}

/**
 * `7` → "0:07", `125` → "2:05". Whole seconds, rounded down (a timer), or up with `up` (a length).
 * @param {number} seconds
 * @param {boolean} [up]
 * @returns {string}
 */
export function clock(seconds, up = false) {
  const whole = Math.max(0, up ? Math.ceil(seconds - 1e-6) : Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * The reason for a `getUserMedia` / `MediaRecorder` error (by its `name`).
 * @param {unknown} error
 * @returns {MicProblem}
 */
export function micProblem(error) {
  const name = /** @type {{ name?: string } | null} */ (error)?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'none'
  if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') return 'busy'
  if (name === 'NotSupportedError' || name === 'TypeError') return 'unsupported'
  return 'failed'
}

/**
 * Whether a finished recording may be sent under `limits`, and what is wrong when not.
 * @param {Blob} blob
 * @param {number} durationMs
 * @param {VoiceLimits} limits
 * @returns {VoiceRejection | null}
 */
export function checkVoice(blob, durationMs, limits) {
  if (!voiceMime(blob.type)) return 'type'
  if (durationMs < limits.minMs) return 'short'
  if (blob.size > limits.maxBytes || blob.size === 0) return 'large'
  return null
}

/** How many live bars the composer draws while it records. */
export const LIVE_BARS = 28

/**
 * The live bars as a fixed row of `count`: the newest reading on the right, older ones scrolling off to
 * the left, silence (0) where there is nothing yet.
 * @param {readonly number[]} latest
 * @param {number} [count]
 * @returns {number[]}
 */
export function liveRow(latest, count = LIVE_BARS) {
  return Array.from({ length: count }, (_, i) => latest[latest.length - count + i] ?? 0)
}
