import { beforeAll, describe, expect, it } from 'vitest'
import { dayLabel, timeline } from '../utils/chat/timeline'
import { quoteName, quotePreview } from '../utils/chat/reply'

// The layer's own chat words (`ui.text.chat` in app.config.ts): English, like the rest of
// `ui.text`, and usable as they are as the words the chat utils take. `defineAppConfig` is a
// Nuxt auto-import, so it is stubbed as the identity to read the file in plain Node.
type Chat = any

let chat: Chat
beforeAll(async () => {
  ;(globalThis as { defineAppConfig?: unknown }).defineAppConfig = (config: unknown) => config
  chat = ((await import('../app.config')).default as { ui: { text: { chat: Chat } } }).ui.text.chat
})

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h)

describe('the English defaults of ui.text.chat', () => {
  it('spell the day separators', () => {
    const now = at(2026, 3, 11)
    expect(chat.locale).toBe('en')
    expect(dayLabel(at(2026, 3, 11), now, chat)).toBe('Today')
    expect(dayLabel(at(2026, 3, 10), now, chat)).toBe('Yesterday')
    expect(dayLabel(at(2026, 3, 9), now, chat)).toBe('Monday')
    expect(dayLabel(at(2026, 3, 4), now, chat)).toBe('March 4')
    expect(dayLabel(at(2025, 12, 24), now, chat)).toBe('December 24, 2025')
    const rows = timeline([{ createdAt: at(2026, 3, 11).toISOString() }], now, () => 'a', chat)
    expect(rows[0]).toMatchObject({ type: 'day', label: 'Today' })
  })

  it('word the quotes', () => {
    const text = { body: 'Hello', media: null }
    expect(quotePreview(text, chat)).toBe('Hello')
    expect(quotePreview({ body: '', media: { kind: 'voice', removed: false } }, chat)).toBe('🎤 Voice message')
    expect(quotePreview({ body: '', media: { kind: 'gif', removed: false } }, chat)).toBe('GIF')
    expect(quotePreview({ body: '', media: { kind: 'image', removed: false } }, chat)).toBe('Photo')
    expect(quotePreview({ body: '', media: { kind: 'voice', removed: true } }, chat)).toBe('Voice message removed')
    expect(quotePreview({ body: '', media: { kind: 'gif', removed: true } }, chat)).toBe('GIF removed')
    expect(quotePreview({ body: '', media: { kind: 'image', removed: true } }, chat)).toBe('Photo removed')
    expect(quotePreview({ body: '', media: null, gone: true }, chat)).toBe('No longer available')
    expect(quoteName(true, 'Berit', chat)).toBe('You')
    expect(quoteName(false, 'Berit', chat)).toBe('Berit')
  })
})
