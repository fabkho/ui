/**
 * Answering one message: the swipe that arms the reply, and the words a quote shows while it is
 * being written and in the bubble that was sent. The rules are pure and live here so Vitest can
 * hold them (tests/chat-reply.test.ts); a bubble draws with them, the app builds the quotes with
 * them. The words come in (the layer's `ui.text.chat`, see `ReplyWords`).
 *
 * Not auto-imported: import from `#ui/utils/chat/reply`, or in plain Node from `@fabkho/ui/pure/reply`.
 * Plain ESM with JSDoc types (no build step).
 */

/** How far right (px) the finger has to travel before letting go answers. */
export const REPLY_THRESHOLD = 60

/** How far the bubble follows the finger at most (px): a hint, not a move. */
export const REPLY_MAX = 88

/** The left edge of the screen belongs to the back swipe (the browser's or iOS's): a gesture that starts
 *  there is never a reply. */
export const EDGE_PX = 20

/** Before a finger has travelled this far (px) it has no direction yet: a tap or a wobble is no gesture. */
export const AXIS_PX = 8

/** How much more a finger has to go right than up or down before the gesture is the reply's. */
export const AXIS_RATIO = 1.5

/**
 * The kinds of media a quote names; an app's own media kinds map onto these.
 * @typedef {'voice' | 'gif' | 'image'} QuotedMediaKind
 */

/**
 * What a quote is drawn from: the words, or the media the message is.
 * @typedef {object} Quoted
 * @property {string} body
 * @property {{ kind: QuotedMediaKind, removed: boolean } | null} media
 * @property {boolean} [gone] The message's content was withdrawn (a number shared and cleared with its
 *   owner's account): the quote says `words.gone`. The app decides what counts, the base only draws it.
 */

/**
 * The words a quote says: a slice of the layer's `ui.text.chat`, so `useUiText().value.chat` can be
 * passed as it is. An app with its own copy builds the same shape from it.
 * @typedef {object} ReplyWords
 * @property {{ you: string, voice: string, gif: string, photo: string, gone: string }} reply
 * @property {{ gifRemoved: string, photoRemoved: string }} media
 * @property {{ bubble: { removed: string } }} voice
 */

/**
 * Which way the finger is going, once it has clearly gone somewhere. Only a clearly
 * **rightward** finger may become a reply — "clearly" because a thumb that scrolls the thread
 * wanders sideways as it goes, and a scroll must never turn into an answer (nor an answer
 * into a scroll): right by `AXIS_RATIO` times the vertical travel, at least `AXIS_PX` far.
 * Everything else — a finger to the left (which can never answer), one that mostly goes up or
 * down — is the thread's, and nothing but a gesture that starts away from the left edge (the
 * back swipe) is looked at at all.
 * @param {number} dx
 * @param {number} dy
 * @returns {'none' | 'horizontal' | 'vertical'}
 */
export function gestureAxis(dx, dy) {
  if (Math.abs(dx) < AXIS_PX && Math.abs(dy) < AXIS_PX) return 'none'
  return dx >= AXIS_PX && dx > AXIS_RATIO * Math.abs(dy) ? 'horizontal' : 'vertical'
}

/**
 * Whether a finger that came down at `x` may start a reply at all (not in the back-swipe edge).
 * @param {number} x
 * @returns {boolean}
 */
export function canStartSwipe(x) {
  return x > EDGE_PX
}

/**
 * Whether letting go now would answer: past the threshold.
 * @param {number} dx
 * @returns {boolean}
 */
export function replyArmed(dx) {
  return dx >= REPLY_THRESHOLD
}

/**
 * How far the bubble follows the finger: 1:1 up to the threshold, then a third of it (the
 * pull has done its job), never more than `REPLY_MAX`.
 * @param {number} dx
 * @returns {number}
 */
export function replyTravel(dx) {
  if (dx <= 0) return 0
  const direct = Math.min(dx, REPLY_THRESHOLD)
  return Math.min(REPLY_MAX, direct + Math.max(0, dx - REPLY_THRESHOLD) / 3)
}

/**
 * How far the arrow has come, 0 – 1: faded and small at the start, full at the threshold.
 * @param {number} dx
 * @returns {number}
 */
export function replyProgress(dx) {
  return Math.min(1, Math.max(0, dx / REPLY_THRESHOLD))
}

/**
 * A message's words as one line: the quote shows one (or two), whatever she wrote.
 * @param {string} text
 * @returns {string}
 */
export function oneline(text) {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * What the quote of a message says under its name: the words on one line, or what kind of a
 * message it is — a voice message, a GIF, a photo; media whose sender is gone reads as it does
 * in the thread. Withdrawn content (`gone`) says so.
 * @param {Quoted} quoted
 * @param {ReplyWords} words
 * @returns {string}
 */
export function quotePreview(quoted, words) {
  const media = quoted.media
  if (media) {
    if (media.removed) {
      if (media.kind === 'voice') return words.voice.bubble.removed
      return media.kind === 'gif' ? words.media.gifRemoved : words.media.photoRemoved
    }
    if (media.kind === 'voice') return words.reply.voice
    return media.kind === 'gif' ? words.reply.gif : words.reply.photo
  }
  if (quoted.gone) return words.reply.gone
  return oneline(quoted.body)
}

/**
 * What the quote calls the one who wrote the message it shows: "You" for one's own, else the name.
 * @param {boolean} mine
 * @param {string} name
 * @param {Pick<ReplyWords, 'reply'>} words
 * @returns {string}
 */
export function quoteName(mine, name, words) {
  return mine ? words.reply.you : name
}
