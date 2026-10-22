import { beforeAll, describe, expect, it } from 'vitest'

// UiThreadRow's words in the app config (`ui.text.threadRow`): English, with only the blanks the row fills,
// and none that could carry message text.
describe('the English words of UiThreadRow', () => {
  let words: Record<string, string>
  beforeAll(async () => {
    ;(globalThis as { defineAppConfig?: unknown }).defineAppConfig = (config: unknown) => config
    words = ((await import('../app/app.config')).default as { ui: { text: { threadRow: Record<string, string> } } }).ui.text.threadRow
  })
  it('name only the blanks the row fills', () => {
    const blanks: Record<string, string[]> = { comments: ['count'], unread: ['count'] }
    expect(Object.keys(words).sort()).toEqual(['comments', 'commentsOne', 'unread', 'veiled'])
    for (const [key, text] of Object.entries(words)) {
      expect([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]), key).toEqual(blanks[key] ?? [])
      expect(text.trim(), key).not.toBe('')
    }
  })
  it('has the veil words of the bubble', async () => {
    const chat = ((await import('../app/app.config')).default as { ui: { text: { chat: { veiled: Record<string, string> } } } }).ui.text.chat
    expect(Object.keys(chat.veiled).sort()).toEqual(['label', 'show'])
  })
})
