import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { layerFiles, stripFileComments } from '../testing/contract.mjs'

/**
 * No zoom on focus on iPhone without `maximum-scale` (assets/css/ui.css): iOS zooms in on a field under 16 px, and a
 * viewport that says `maximum-scale` or `user-scalable=no` fails axe's `meta-viewport` (WCAG 1.4.4). So the layer
 * never writes either, and gives fields their 16 px in CSS, on iOS only. The rule's effect is checked in a real
 * WebKit (Bookretreads' iPhone project); here it is pinned as text.
 */
const css = readFileSync(fileURLToPath(new URL('../app/assets/css/ui.css', import.meta.url)), 'utf8')
const ios = css.slice(css.indexOf('@supports (-webkit-touch-callout: none) {\n  @layer base'), css.indexOf('/* Safari has no `scrollbar-color`'))

describe('no zoom on focus', () => {
  it('never changes the viewport: no maximum-scale, no user-scalable, in any file the layer ships', () => {
    const offenders = layerFiles()
      .filter(file => /maximum-scale|user-scalable|minimum-scale/.test(stripFileComments(file, readFileSync(file, 'utf8'))))
    expect(offenders).toEqual([])
  })

  it('gives a text field 16 px at least on iOS, and leaves the bigger sizes alone', () => {
    expect(ios).not.toBe('')
    expect(ios).toContain('font-size: max(16px, 1em)')
    expect(ios).toMatch(/\.text-body \{\n {4}font-size: max\(16px, var\(--text-body\)\);/)
    expect(ios).toMatch(/\.text-subhead, \.text-footnote, \.text-caption\) \{\n {4}font-size: 16px;/)
    for (const bigger of ['text-input', 'text-callout']) expect(ios).not.toContain(bigger)
  })

  it('leaves fields that take no keyboard alone', () => {
    for (const type of ['checkbox', 'radio', 'range', 'file', 'button', 'submit']) expect(ios).toContain(`[type='${type}']`)
  })

  it('only on iOS: the rules sit inside the -webkit-touch-callout support query', () => {
    expect(css).not.toMatch(/^:is\(input, textarea, select\)/m)
    expect(ios.startsWith('@supports (-webkit-touch-callout: none) {')).toBe(true)
  })
})
