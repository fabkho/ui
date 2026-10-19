// What the chat stories draw from: sample messages, pictures, a recording and a GIF provider, all
// local (no network, no real people). Not part of the package: only `.storybook/` and the stories use it.
import type { BubbleMedia, BubbleMessage, BubbleQuote } from '../utils/chat/message'
import type { GifFeed, GifItem, GifResult, GifSearch } from '../utils/chat/gif'

/** The app's reaction set, in the order of the bar (`emojis`). */
export const EMOJIS = ['❤️', '😂', '😮', '😢', '🔥'] as const

/** `minutes` ago, as a message's `createdAt`. */
export const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

let counter = 0
/** A stored message of theirs, unless told otherwise. */
export function message(partial: Partial<BubbleMessage> = {}): BubbleMessage {
  const n = ++counter
  return {
    key: `m${n}`,
    id: `id${n}`,
    mine: false,
    kind: 'text',
    body: 'I finished it on the train. The last chapter is wonderful.',
    createdAt: ago(30),
    delivery: 'sent',
    reactions: [],
    myReaction: null,
    ...partial,
  }
}

export const quote = (partial: Partial<BubbleQuote> = {}): BubbleQuote => ({
  id: 'id-quoted',
  mine: false,
  name: 'Sam',
  preview: 'Did you get to the last chapter yet?',
  ...partial,
})

/** A picture as a data URI: a gradient with a circle, `width` × `height`, so nothing is fetched. */
export function picture(width: number, height: number, from = '#b8782a', to = '#3b2430'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><circle cx="${width * 0.68}" cy="${height * 0.34}" r="${Math.min(width, height) * 0.16}" fill="#fff" fill-opacity="0.55"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** A silent WAV of `seconds`, as a data URI: the play button really plays it. */
export function silence(seconds: number): string {
  const rate = 8000
  const samples = Math.round(seconds * rate)
  const bytes = new Uint8Array(44 + samples).fill(128)
  const view = new DataView(bytes.buffer)
  const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples, true)
  text(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  text(36, 'data')
  view.setUint32(40, samples, true)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `data:audio/wav;base64,${btoa(binary)}`
}

/** A waveform of 32 bars, 0 – 100 each. */
export const PEAKS = [20, 34, 52, 70, 44, 28, 62, 88, 76, 48, 30, 22, 40, 66, 92, 80, 56, 36, 24, 46, 72, 60, 38, 26, 50, 68, 54, 32, 22, 18, 30, 14]

export const picturesMedia = (kind: 'image' | 'gif', width = 240, height = 320, extra: Partial<BubbleMedia> = {}): BubbleMedia => ({
  kind,
  url: picture(width, height),
  path: `chat/${kind}.svg`,
  width,
  height,
  removed: false,
  ...extra,
})

export const voiceMedia = (durationMs = 23_000, extra: Partial<BubbleMedia> = {}): BubbleMedia => ({
  kind: 'voice',
  url: silence(2),
  path: 'chat/voice.webm',
  width: 1,
  height: 1,
  removed: false,
  durationMs,
  peaks: PEAKS,
  mime: 'audio/webm',
  ...extra,
})

export const voiceMessage = (partial: Partial<BubbleMessage> = {}, media: Partial<BubbleMedia> = {}): BubbleMessage =>
  message({ kind: 'media', body: '', media: voiceMedia(23_000, media), ...partial })

export const photoMessage = (partial: Partial<BubbleMessage> = {}, media: Partial<BubbleMedia> = {}): BubbleMessage =>
  message({ kind: 'media', body: '', media: picturesMedia('image', 240, 320, media), ...partial })

// ------------------------------------------------------------------ a GIF provider

const HUES: Array<[string, string]> = [
  ['#e3b878', '#b8782a'],
  ['#a3b4ec', '#3e5081'],
  ['#a3c48e', '#4a6361'],
  ['#ec8063', '#4a2624'],
  ['#d9c2e8', '#5b4a5e'],
  ['#9fd3d8', '#22303f'],
]
const SHAPES: Array<[number, number]> = [
  [200, 150],
  [160, 200],
  [200, 200],
  [220, 124],
  [150, 210],
  [200, 170],
]

/** A page of `size` GIFs that are gradients: the same words give the same GIFs. */
function page(topic: string, number: number, size = 8): GifItem[] {
  return Array.from({ length: size }, (_, i) => {
    const at = (number * size + i + topic.length) % SHAPES.length
    const [width, height] = SHAPES[at]!
    const [from, to] = HUES[(at + i) % HUES.length]!
    const url = picture(width, height, from, to)
    return { id: `${topic || 'all'}-${number}-${i}`, width, height, preview: url, title: i % 2 ? `${topic || 'Trending'} ${number * size + i + 1}` : undefined, url, sentWidth: width, sentHeight: height }
  })
}

/** What the picker takes as `search`: two pages (1 and 2) for anything, none for "nothing", an error for "broken". Answers after `delay` ms. */
export function fakeGifSearch(delay = 250): GifSearch {
  return (q, number, feed): Promise<GifResult> =>
    new Promise(resolve =>
      setTimeout(() => {
        const words = q.trim().toLowerCase()
        if (words === 'broken') return resolve({ data: null, error: 'The GIF service did not answer. Try again in a moment.' })
        if (words === 'nothing') return resolve({ data: { items: [], next: null }, error: null })
        resolve({ data: { items: page(words || feed, number), next: number < 2 ? number + 1 : null }, error: null })
      }, delay),
    )
}

/** A search that never answers (the grid's placeholder stays). */
export const slowGifSearch: GifSearch = () => new Promise<GifResult>(() => {})

/** A search that fails (the sentence and its retry). */
export const brokenGifSearch: GifSearch = () => Promise.resolve({ data: null, error: 'The GIF service did not answer. Try again in a moment.' })

export const GIF_FEEDS: GifFeed[] = [
  { key: 'trending', label: 'Trending', query: '' },
  { key: 'reading', label: 'Reading', query: 'reading' },
  { key: 'cozy', label: 'Cozy', query: 'cozy' },
  { key: 'wow', label: 'Wow', query: 'wow' },
]

// ------------------------------------------------------------------ the microphone

/**
 * Stands in for the microphone: a hum with a slow tremolo on a `MediaStream`, so "Record" works without
 * a permission prompt (and in the headless test run), and the live bars move. Call it before the tap.
 */
export function fakeMicrophone() {
  const devices = navigator.mediaDevices
  if (!devices) return
  devices.getUserMedia = async () => {
    const context = new AudioContext()
    const destination = context.createMediaStreamDestination()
    const hum = context.createOscillator()
    const gain = context.createGain()
    const tremolo = context.createOscillator()
    const depth = context.createGain()
    hum.frequency.value = 180
    gain.gain.value = 0.15
    tremolo.frequency.value = 2.2
    depth.gain.value = 0.12
    tremolo.connect(depth).connect(gain.gain)
    hum.connect(gain).connect(destination)
    hum.start()
    tremolo.start()
    return destination.stream
  }
}
