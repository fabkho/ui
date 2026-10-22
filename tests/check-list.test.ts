import { beforeAll, describe, expect, it } from 'vitest'
import { filterOptions, fold, toggled } from '../app/utils/checkList'

// UiCheckList's pure parts (the filter and the selection rule), and its words in the app config.
// The component itself is checked in its stories (keyboard play function, axe, both themes).
const options = [
  { id: 'a', label: 'Ida Berg', sublabel: 'Reads with you' },
  { id: 'b', label: 'José Álvarez' },
  { id: 'c', label: 'Clara Nowak', sublabel: 'Buddy since March' },
]

describe('filterOptions', () => {
  it('keeps everything for an empty or blank query, in order', () => {
    expect(filterOptions(options, '').map((o) => o.id)).toEqual(['a', 'b', 'c'])
    expect(filterOptions(options, '   ').map((o) => o.id)).toEqual(['a', 'b', 'c'])
  })
  it('ignores case and accents', () => {
    expect(fold('José')).toBe('jose')
    expect(filterOptions(options, 'jose').map((o) => o.id)).toEqual(['b'])
    expect(filterOptions(options, 'IDA').map((o) => o.id)).toEqual(['a'])
  })
  it('looks in the sublabel too and wants every word', () => {
    expect(filterOptions(options, 'march').map((o) => o.id)).toEqual(['c'])
    expect(filterOptions(options, 'clara march').map((o) => o.id)).toEqual(['c'])
    expect(filterOptions(options, 'clara ida')).toEqual([])
  })
})

describe('toggled', () => {
  it('adds in the order ticked and removes', () => {
    expect(toggled([], 'b', true)).toEqual(['b'])
    expect(toggled(['b'], 'a', true)).toEqual(['b', 'a'])
    expect(toggled(['b', 'a'], 'b', false)).toEqual(['a'])
  })
  it('changes nothing when it already is so', () => {
    expect(toggled(['a'], 'a', true)).toEqual(['a'])
    expect(toggled(['a'], 'c', false)).toEqual(['a'])
  })
  it('does not go past max, but always lets one go', () => {
    expect(toggled(['a', 'b'], 'c', true, 2)).toEqual(['a', 'b'])
    expect(toggled(['a', 'b'], 'a', false, 2)).toEqual(['b'])
  })
  it('keeps ids no option has any more', () => {
    expect(toggled(['gone'], 'a', true)).toEqual(['gone', 'a'])
  })
})

describe('the English words', () => {
  let words: Record<string, string>
  beforeAll(async () => {
    ;(globalThis as { defineAppConfig?: unknown }).defineAppConfig = (config: unknown) => config
    words = ((await import('../app/app.config')).default as { ui: { text: { checkList: Record<string, string> } } }).ui.text.checkList
  })
  it('name only the blanks UiCheckList fills', () => {
    const blanks: Record<string, string[]> = { count: ['count'], countMax: ['count', 'max'], atLeast: ['min'] }
    for (const [key, text] of Object.entries(words)) {
      expect([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]), key).toEqual(blanks[key] ?? [])
      expect(text.trim(), key).not.toBe('')
    }
  })
})
