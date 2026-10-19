import type { VoiceMime } from './voice'
import { fillWords } from './words'

/**
 * What the chat components draw a message from: the least an app's own message has to carry.
 * Bookretreats' `ChatItem` (its chat store) fits as it is; another app maps its rows onto it.
 * Domain kinds (a shared phone number, a system line) are the app's: it draws them in UiBubble's
 * `body` slot, or outside the bubble altogether.
 *
 * Not auto-imported: import from `#ui/utils/chat/message`.
 */

/** Where a message of one's own is: on its way, stored, or refused (a tap sends it again). */
export type Delivery = 'sending' | 'sent' | 'failed'

/** A picture or a recording. */
export interface BubbleMedia {
  kind: 'image' | 'gif' | 'voice'
  /** What the bubble shows or plays; null while it is being signed (or never, `unavailable`). */
  url: string | null
  /** The file it was signed from: what `mediaFailed` hands back to sign it again. */
  path: string | null
  /** In pixels, for the picture's shape before it loads (1 × 1 for a recording). */
  width: number
  height: number
  /** Its sender is gone, and the file with them. */
  removed: boolean
  /** It could not be loaded and nothing new is coming: the bubble says so. */
  unavailable?: boolean
  /** A recording: its length (ms), its waveform (0 – 100 each) and its type. */
  durationMs?: number | null
  peaks?: number[] | null
  mime?: VoiceMime | null
}

/** One emoji on a message: how many chose it, and whether one of them is the reader. */
export interface BubbleReaction {
  emoji: string
  count: number
  mine: boolean
}

/** One message as the bubble draws it. */
export interface BubbleMessage {
  /** Stable from the optimistic bubble to the stored row. */
  key: string
  /** The stored id; null while it is on its way (it cannot be reacted to or answered yet). */
  id: string | null
  mine: boolean
  /** `text` and `media` are drawn by the bubble; any other kind fills its `body` slot. */
  kind: string
  body: string
  createdAt: string
  delivery: Delivery
  /** Why it was refused (the app's sentence), else null. */
  error?: string | null
  media?: BubbleMedia | null
  reactions: BubbleReaction[]
  myReaction: string | null
}

/** The message a bubble answers, as its quote draws it. */
export interface BubbleQuote {
  /** The original, to jump to on a tap; null when it is gone. */
  id: string | null
  /** The quoted message is the reader's own (its tint differs on an ink bubble). */
  mine: boolean
  name: string
  preview: string
}

/** The words a reaction pill says to a screen reader: a slice of `ui.text.chat.reactions`. */
export interface ReactionWords {
  names: Record<string, string>
  byYou: string
  byHer: string
  byBoth: string
  pill: string
}

/** What an emoji is called (`ui.text.chat.reactions.names`), or the emoji itself. */
export function reactionName(emoji: string, names: Record<string, string>): string {
  return names[emoji] ?? emoji
}

/** What the pill says: each emoji and whose it is ("Reactions: Heart from you, Fire from both of you"). */
export function reactionsLabel(reactions: readonly BubbleReaction[], words: ReactionWords): string {
  const parts = reactions.map((r) => {
    const name = reactionName(r.emoji, words.names)
    return fillWords(r.count > 1 ? words.byBoth : r.mine ? words.byYou : words.byHer, { name })
  })
  return fillWords(words.pill, { parts: parts.join(', ') })
}

/**
 * A picture keeps its shape before it loads: as wide as 70 % of the screen, or as wide as its shape
 * allows at 20 rem high, whichever is less.
 */
export function mediaBox(media: Pick<BubbleMedia, 'width' | 'height'>): { aspectRatio: string; width: string } {
  const ratio = media.width / media.height
  return { aspectRatio: `${media.width} / ${media.height}`, width: `min(70vw, calc(20rem * ${ratio.toFixed(4)}))` }
}
