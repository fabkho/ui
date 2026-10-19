/**
 * Voice messages: what a phone records, how a recording is described and when it can be played.
 * Framework-free: the rules and the pure helpers run anywhere (Vitest); `MediaRecorder` and
 * `Audio` belong to the recorder and the player (composables). Not auto-imported: import from
 * `#ui/utils/chat/voice`.
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

/** What the recorder asks the encoder for: speech, small (two minutes ≈ 0.7 MB). */
export const VOICE_BITS_PER_SECOND = 48_000

/** How many bars a waveform has by default. */
export const PEAK_COUNT = 32

/** The three types a recording is stored as, with the extension its path has. */
export const VOICE_TYPES = [
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/ogg', ext: 'ogg' },
] as const
export type VoiceMime = (typeof VOICE_TYPES)[number]['mime']

/** What the recorder tries, best first; the codec is part of what `MediaRecorder` is asked for. */
export const RECORDING_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus'] as const

/** `audio/webm;codecs=opus` → `audio/webm`: the type as it is stored; null for anything else. */
export function voiceMime(type: string | null | undefined): VoiceMime | null {
  const base = (type ?? '').split(';')[0]!.trim().toLowerCase()
  return VOICE_TYPES.find((t) => t.mime === base)?.mime ?? null
}

/** The extension a recording of this type is stored under. */
export function voiceExtension(mime: VoiceMime): string {
  return VOICE_TYPES.find((t) => t.mime === mime)!.ext
}

/** The type a stored recording has, from its path (`…/uuid.m4a` → `audio/mp4`). */
export function mimeOfPath(path: string | null | undefined): VoiceMime | null {
  const ext = /\.([a-z0-9]+)$/.exec(path ?? '')?.[1]
  return VOICE_TYPES.find((t) => t.ext === ext)?.mime ?? null
}

/** The first of `RECORDING_TYPES` the device can record, or null (no `MediaRecorder`, or none of them). */
export function pickRecordingType(isTypeSupported: ((type: string) => boolean) | null | undefined): string | null {
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
 */
export function canPlayVoice(mime: VoiceMime | null, probe: ((type: string) => string) | null | undefined): boolean {
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
 */
export function peaksFrom(levels: readonly number[], count = PEAK_COUNT, floor = 8): number[] {
  if (levels.length === 0) return []
  const n = Math.min(count, levels.length)
  const bars: number[] = []
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

/** `7` → "0:07", `125` → "2:05". Whole seconds, rounded down (a timer), or up with `up` (a length). */
export function clock(seconds: number, up = false): string {
  const whole = Math.max(0, up ? Math.ceil(seconds - 1e-6) : Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** How a recording that went wrong is told: no permission, no microphone, taken, or unknown. */
export type MicProblem = 'denied' | 'none' | 'busy' | 'unsupported' | 'failed'

/** The reason for a `getUserMedia` / `MediaRecorder` error (by its `name`). */
export function micProblem(error: unknown): MicProblem {
  const name = (error as { name?: string } | null)?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'none'
  if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') return 'busy'
  if (name === 'NotSupportedError' || name === 'TypeError') return 'unsupported'
  return 'failed'
}

/** A recording as the chat sends it. */
export type PreparedVoice = {
  blob: Blob
  mime: VoiceMime
  /** Milliseconds. */
  durationMs: number
  /** The waveform, 0 – 100 each. */
  peaks: number[]
}

/** The app's limits for a recording: shorter is a slip of the finger, bigger does not fit the store. */
export interface VoiceLimits {
  /** The shortest recording, in milliseconds. */
  minMs: number
  /** The most bytes a recording may have. */
  maxBytes: number
}

/** Why a finished recording is not sent; the app words it. */
export type VoiceRejection = 'short' | 'large' | 'type'

/** Whether a finished recording may be sent under `limits`, and what is wrong when not. */
export function checkVoice(blob: Blob, durationMs: number, limits: VoiceLimits): VoiceRejection | null {
  if (!voiceMime(blob.type)) return 'type'
  if (durationMs < limits.minMs) return 'short'
  if (blob.size > limits.maxBytes || blob.size === 0) return 'large'
  return null
}
