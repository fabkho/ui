import { describe, expect, it } from 'vitest'
import {
  AXIS_PX,
  AXIS_RATIO,
  EDGE_PX,
  REPLY_MAX,
  REPLY_THRESHOLD,
  canStartSwipe,
  gestureAxis,
  oneline,
  quoteName,
  quotePreview,
  replyArmed,
  replyProgress,
  replyTravel,
  type ReplyWords,
} from '../utils/chat/reply'

// The chat's pure reply rules ("Antworten"): the swipe that arms a reply and the words a
// quote shows. The gesture itself (the pointer events, the bubble that follows the finger)
// is a bubble's and is driven in the apps; what is decided here is arithmetic. Moved from
// Bookretreats with the same assertions; the words come in as the layer's `ui.text.chat`
// brings them, and a withdrawn number is the app's `gone` flag (it was `kind: 'phone_share'`
// with an empty body, a domain the base does not know).
const words: ReplyWords = {
  reply: { you: 'Du', voice: '🎤 Sprachnachricht', gif: 'GIF', photo: 'Foto', gone: 'Nicht mehr verfügbar' },
  media: { gifRemoved: 'GIF entfernt', photoRemoved: 'Foto entfernt' },
  voice: { bubble: { removed: 'Sprachnachricht entfernt' } },
}

describe('the swipe', () => {
  it('starts anywhere but in the back-swipe edge', () => {
    expect(canStartSwipe(0)).toBe(false)
    expect(canStartSwipe(EDGE_PX)).toBe(false)
    expect(canStartSwipe(EDGE_PX + 1)).toBe(true)
    expect(canStartSwipe(200)).toBe(true)
  })

  it('has no direction until the finger has clearly gone somewhere', () => {
    expect(gestureAxis(0, 0)).toBe('none')
    expect(gestureAxis(AXIS_PX - 1, AXIS_PX - 1)).toBe('none')
    expect(gestureAxis(AXIS_PX, 0)).toBe('horizontal')
    expect(gestureAxis(0, AXIS_PX)).toBe('vertical')
    expect(gestureAxis(6, 40)).toBe('vertical')
  })

  it('keeps the thread scrolling: only a clearly rightward finger is the swipe\'s', () => {
    // A thumb that scrolls wanders sideways as it goes, and a finger to the left never answers.
    expect(gestureAxis(-AXIS_PX, 0)).toBe('vertical')
    expect(gestureAxis(-60, 4)).toBe('vertical')
    expect(gestureAxis(AXIS_PX, AXIS_PX - 1)).toBe('vertical')
    expect(gestureAxis(40, 30)).toBe('vertical')
    // Right enough to be a swipe.
    expect(gestureAxis(40, 6)).toBe('horizontal')
    expect(gestureAxis(AXIS_PX, 0)).toBe('horizontal')
    expect(gestureAxis(60, 39)).toBe('horizontal')
    expect(gestureAxis(60, 41)).toBe('vertical')
    // The ratio is the rule, not a magic number.
    expect(gestureAxis(REPLY_THRESHOLD, REPLY_THRESHOLD / AXIS_RATIO - 1)).toBe('horizontal')
    expect(gestureAxis(REPLY_THRESHOLD, REPLY_THRESHOLD / AXIS_RATIO + 1)).toBe('vertical')
  })

  it('answers only past the threshold', () => {
    expect(replyArmed(0)).toBe(false)
    expect(replyArmed(REPLY_THRESHOLD - 1)).toBe(false)
    expect(replyArmed(REPLY_THRESHOLD)).toBe(true)
    expect(replyArmed(REPLY_THRESHOLD * 3)).toBe(true)
  })

  it('pulls the bubble with the finger, and no further', () => {
    expect(replyTravel(-40)).toBe(0)
    expect(replyTravel(0)).toBe(0)
    expect(replyTravel(30)).toBe(30)
    expect(replyTravel(REPLY_THRESHOLD)).toBe(REPLY_THRESHOLD)
    // Past the threshold the pull has done its job: a third of the rest, never more than the cap.
    expect(replyTravel(REPLY_THRESHOLD + 30)).toBe(REPLY_THRESHOLD + 10)
    expect(replyTravel(500)).toBe(REPLY_MAX)
  })

  it('has the arrow there by the time letting go would answer', () => {
    expect(replyProgress(0)).toBe(0)
    expect(replyProgress(REPLY_THRESHOLD / 2)).toBe(0.5)
    expect(replyProgress(REPLY_THRESHOLD)).toBe(1)
    expect(replyProgress(REPLY_THRESHOLD * 2)).toBe(1)
  })
})

describe('the words a quote shows', () => {
  it('keeps what she wrote on one line', () => {
    expect(oneline('Hallo   Bea,\n\nwie geht es dir? ')).toBe('Hallo Bea, wie geht es dir?')
    expect(oneline('\n\n  ')).toBe('')
  })

  it('is her words for a text', () => {
    expect(quotePreview({ body: 'Hallo   Bea,\nwie geht es dir?', media: null }, words)).toBe(
      'Hallo Bea, wie geht es dir?',
    )
  })

  it('names the kind of message for what is not words', () => {
    expect(quotePreview({ body: '', media: { kind: 'voice', removed: false } }, words)).toBe('🎤 Sprachnachricht')
    expect(quotePreview({ body: '', media: { kind: 'gif', removed: false } }, words)).toBe('GIF')
    expect(quotePreview({ body: '', media: { kind: 'image', removed: false } }, words)).toBe('Foto')
  })

  it('says what happened to a picture or a recording whose sender is gone', () => {
    expect(quotePreview({ body: '', media: { kind: 'voice', removed: true } }, words)).toBe('Sprachnachricht entfernt')
    expect(quotePreview({ body: '', media: { kind: 'gif', removed: true } }, words)).toBe('GIF entfernt')
    expect(quotePreview({ body: '', media: { kind: 'image', removed: true } }, words)).toBe('Foto entfernt')
  })

  it('shows a shared number as it was shared, and says when it is gone', () => {
    expect(quotePreview({ body: '+4915123456789', media: null }, words)).toBe('+4915123456789')
    expect(quotePreview({ body: '', media: null, gone: true }, words)).toBe('Nicht mehr verfügbar')
  })

  it('calls her own message "Du" and hers by her name', () => {
    expect(quoteName(true, 'Berit', words)).toBe('Du')
    expect(quoteName(false, 'Berit', words)).toBe('Berit')
  })
})
