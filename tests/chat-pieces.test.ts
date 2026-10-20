import { beforeAll, describe, expect, it } from 'vitest'
import { fillWords } from '../app/utils/chat/words'
import { mediaBox, reactionName, reactionsLabel, reactionWho, sameSide, type BubbleReaction } from '../app/utils/chat/message'
import { endsRun, follows, timeline } from '../app/utils/chat/timeline'
import { gifColumns, latestRequest } from '../app/utils/chat/gif'
import { LIVE_BARS, liveRow } from '../app/utils/chat/voice'

// The pure parts the chat components draw with (UiBubble, UiReactionBar, UiComposer, UiGifPicker,
// UiVoiceBubble): the words with a blank, the reaction pill's label, a picture's shape before it loads,
// the GIF grid's columns and the newest-request rule, the recorder's live bars. The components themselves
// are checked in the apps that use them (Bookretreats' `chat`, `chat-media`, `chat-voice` flows).

describe('fillWords', () => {
  it('fills the blanks it is given', () => {
    expect(fillWords('{name} from you', { name: 'Heart' })).toBe('Heart from you')
    expect(fillWords('{elapsed} of {max}', { elapsed: '0:07', max: '2:00' })).toBe('0:07 of 2:00')
    expect(fillWords('Page {n}', { n: 2 })).toBe('Page 2')
  })

  it('leaves a blank it is not given, so it shows instead of reading as nothing', () => {
    expect(fillWords('For “{q}”', {})).toBe('For “{q}”')
    expect(fillWords('No blanks', { q: 'x' })).toBe('No blanks')
  })
})

describe('the reaction pill', () => {
  const words = {
    names: { '❤️': 'Heart', '🔥': 'Fire' },
    byYou: '{name} from you',
    byOther: '{name} from them',
    byBoth: '{name} from both of you',
    byMany: '{name} from {count}',
    pill: 'Reactions: {parts}',
  }
  const r = (emoji: string, count: number, mine: boolean): BubbleReaction => ({ emoji, count, mine })

  it('names each emoji and whose it is', () => {
    expect(reactionsLabel([r('❤️', 1, true)], words)).toBe('Reactions: Heart from you')
    expect(reactionsLabel([r('❤️', 1, false), r('🔥', 2, true)], words)).toBe(
      'Reactions: Heart from them, Fire from both of you ×2',
    )
  })

  it('says "both" only for the reader and one other; more than that by the count (a group)', () => {
    expect(reactionWho({ count: 1, mine: true })).toBe('byYou')
    expect(reactionWho({ count: 1, mine: false })).toBe('byOther')
    expect(reactionWho({ count: 2, mine: true })).toBe('byBoth')
    expect(reactionWho({ count: 2, mine: false })).toBe('byMany')
    expect(reactionWho({ count: 3, mine: true })).toBe('byMany')
    expect(reactionsLabel([r('🔥', 3, false)], words)).toBe('Reactions: Fire from 3')
  })

  it('carries the number the pill shows (label in name), once', () => {
    // "from both of you" does not say 2; "from 3" already does.
    expect(reactionsLabel([r('🔥', 2, true)], words)).toBe('Reactions: Fire from both of you ×2')
    expect(reactionsLabel([r('🔥', 2, false)], words)).toBe('Reactions: Fire from 2')
    expect(reactionsLabel([r('🔥', 3, false), r('❤️', 1, true)], words)).toBe('Reactions: Fire from 3, Heart from you')
  })

  it('reads an emoji without a name as itself', () => {
    expect(reactionName('📚', words.names)).toBe('📚')
    expect(reactionsLabel([r('📚', 1, false)], words)).toBe('Reactions: 📚 from them')
  })
})

describe('runs in the thread (UiChatThread’s default `sameRun`)', () => {
  type Item = { key: string; createdAt: string; mine?: boolean; kind?: string }
  const at = (minute: number) => new Date(2026, 2, 11, 12, minute).toISOString()
  const item = (key: string, minute: number, mine: boolean, kind?: string): Item => ({ key, createdAt: at(minute), mine, kind })
  const words = { today: 'Today', yesterday: 'Yesterday', locale: 'en' }

  it('joins messages from the same side, never across a system line', () => {
    expect(sameSide({ mine: true }, { mine: true })).toBe(true)
    expect(sameSide({ mine: true }, { mine: false })).toBe(false)
    expect(sameSide({ mine: false, kind: 'system' }, { mine: false, kind: 'text' })).toBe(false)
    expect(sameSide({ mine: false, kind: 'text' }, { mine: false, kind: 'system' })).toBe(false)
    expect(sameSide({ mine: false, kind: 'media' }, { mine: false, kind: 'text' })).toBe(true)
  })

  it('gives the tail to the message before a system line, as the chat page did', () => {
    const items = [item('a', 1, false, 'text'), item('s', 2, false, 'system'), item('b', 3, false, 'text'), item('c', 4, false, 'text')]
    const rows = timeline(items, new Date(2026, 2, 11, 13), (i) => i.key, words)
    // rows: day, a, s, b, c
    expect(rows.map((_, i) => follows(rows, i, sameSide))).toEqual([false, false, false, false, true])
    expect(rows.map((_, i) => endsRun(rows, i, sameSide))).toEqual([true, true, true, false, true])
  })
})

describe("a picture's shape before it loads", () => {
  it('keeps its proportions, at most 70 % of the screen wide and 20 rem high', () => {
    expect(mediaBox({ width: 800, height: 600 })).toEqual({
      aspectRatio: '800 / 600',
      width: 'min(70vw, calc(20rem * 1.3333))',
    })
    expect(mediaBox({ width: 600, height: 1200 }).width).toBe('min(70vw, calc(20rem * 0.5000))')
  })
})

describe('the GIF grid', () => {
  it('puts each GIF in the shorter of two columns, in order', () => {
    const gif = (id: string, width: number, height: number) => ({ id, width, height })
    const [left, right] = gifColumns([gif('a', 100, 200), gif('b', 100, 100), gif('c', 100, 50), gif('d', 100, 100)])
    expect(left.map((g) => g.id)).toEqual(['a'])
    expect(right.map((g) => g.id)).toEqual(['b', 'c', 'd'])
    expect(gifColumns([])).toEqual([[], []])
  })

  it('lets only the newest request count', () => {
    const requests = latestRequest()
    const first = requests.start()
    const second = requests.start()
    expect(requests.isCurrent(first)).toBe(false)
    expect(requests.isCurrent(second)).toBe(true)
    requests.cancel()
    expect(requests.isCurrent(second)).toBe(false)
  })
})

describe("the recorder's live bars", () => {
  it('draws a fixed row, the newest on the right, silence where there is nothing yet', () => {
    expect(liveRow([0.5, 1], 4)).toEqual([0, 0, 0.5, 1])
    expect(liveRow([0.1, 0.2, 0.3, 0.4, 0.5], 3)).toEqual([0.3, 0.4, 0.5])
    expect(liveRow([])).toHaveLength(LIVE_BARS)
  })
})

describe('the English defaults of the components’ words', () => {
  type Words = Record<string, unknown>
  let chat: Words
  beforeAll(async () => {
    ;(globalThis as { defineAppConfig?: unknown }).defineAppConfig = (config: unknown) => config
    chat = ((await import('../app/app.config')).default as { ui: { text: { chat: Words } } }).ui.text.chat
  })

  /** Every string under `ui.text.chat`, with its path. */
  function strings(node: unknown, path: string[] = []): Array<[string, string]> {
    if (typeof node === 'string') return [[path.join('.'), node]]
    if (node && typeof node === 'object') return Object.entries(node).flatMap(([key, value]) => strings(value, [...path, key]))
    return []
  }

  it('are all words, none empty', () => {
    const all = strings(chat)
    expect(all.length).toBeGreaterThan(80)
    for (const [path, text] of all) expect(text.trim(), path).not.toBe('')
  })

  it('name only the blanks the components fill', () => {
    const blanks: Record<string, string[]> = {
      'reply.show': ['name', 'preview'],
      'voice.timer': ['elapsed', 'max'],
      'voice.bubble.position': ['now', 'total'],
      'gifPicker.results': ['q'],
      'gifPicker.none': ['q'],
      'gifPicker.pick': ['n'],
      'gifPicker.pickTitled': ['title'],
      'reactions.pick': ['name'],
      'reactions.takeBack': ['name'],
      'reactions.byYou': ['name'],
      'reactions.byOther': ['name'],
      'reactions.byBoth': ['name'],
      'reactions.byMany': ['name', 'count'],
      'reactions.pill': ['parts'],
    }
    for (const [path, text] of strings(chat)) {
      const found = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
      expect(found, path).toEqual(blanks[path] ?? [])
    }
  })
})
