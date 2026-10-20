import { describe, expect, it } from 'vitest'
import {
  coverFailed,
  coverInputChanged,
  coverNow,
  coverShown,
  startCover,
  type ArtworkOf,
  type CoverInput,
  type CoverShowing,
} from '../app/utils/coverShowing'

/**
 * What a mounted cover shows (utils/coverShowing.ts), taken from BetterReads' tests/cover-showing.test.ts: a cover
 * follows its subject (a row kept alive and a page mounted later show the same picture), a size that fails is the
 * same picture at another size, and which URLs are one artwork is the app's to say. The sources here are a made-up
 * CDN that renders any `<width>x<height>` of an artwork, as Apple's does.
 */

const cdn = (box: string, id = 'dune') => `https://cdn.test/${id}/${box}.jpg`
const SMALL = cdn('120x180')
const LARGE = cdn('600x900')
/** What the catalogue stores later: another artwork of the same edition. */
const CHANGED = cdn('120x180', 'dune-2')

/** The artwork a URL is of: the size is not part of it. */
const artwork: ArtworkOf = (url) => url.replace(/\/\d+x\d+\.jpg$/, '')

/** A chain like a size-aware app builds: the own size, then the stored one, then a row's. */
const input = (src: string | null, size: 'sm' | 'xl' = 'sm', identity = 'edition-1'): CoverInput => ({
  src,
  fallbacks: src ? [LARGE, SMALL].map((url) => src.replace(/\d+x\d+\.jpg$/, url.split('/').pop()!)).filter((url) => url !== src) : [],
  identity,
})

/** A cover with its image loaded and in view, then given `more`. */
function inView(url = SMALL, ...more: CoverInput[]): CoverShowing {
  let state = coverShown(startCover(input(url)), url)
  for (const next of more) state = coverInputChanged(state, next, artwork)
  return state
}

describe('a mounted cover follows its subject', () => {
  it('shows the new artwork, as a cover mounted now does', () => {
    const row = inView(SMALL, input(CHANGED))
    const page = startCover(input(cdn('600x900', 'dune-2'), 'xl'))
    expect(coverNow(row)).toBe(CHANGED)
    expect(row.shown).toBeNull() // the old picture is gone, the new one loads
    expect(artwork(coverNow(row)!)).toBe(artwork(coverNow(page)!))
  })

  it('shows the Placeholder when the subject has lost its cover', () => {
    expect(coverNow(inView(SMALL, input(null)))).toBeNull()
  })

  it('takes another size of the artwork in view as that artwork: it stays in view until the size has loaded', () => {
    const state = inView(SMALL, input(LARGE, 'xl'))
    expect(coverNow(state)).toBe(LARGE)
    expect(state.shown).toBe(SMALL)
  })

  it('stays as it is when the same chain comes again (a parent re-rendered)', () => {
    const state = inView(SMALL)
    expect(coverInputChanged(state, input(SMALL), artwork)).toBe(state)
  })

  it('starts afresh when what the cover is of changes, even at the same artwork (a change of edition)', () => {
    const state = inView(SMALL, input(LARGE, 'xl', 'edition-2'))
    expect(coverNow(state)).toBe(LARGE)
    expect(state.shown).toBeNull()
  })

  it('starts afresh at any new URL without an `artwork` function: every URL is an artwork of its own', () => {
    const state = coverInputChanged(coverShown(startCover(input(SMALL)), SMALL), input(LARGE, 'xl'))
    expect(coverNow(state)).toBe(LARGE)
    expect(state.shown).toBeNull()
  })

  it('starts afresh when nothing was in view yet, whatever the new URL is', () => {
    const state = coverInputChanged(startCover(input(SMALL)), input(LARGE, 'xl'), artwork)
    expect(coverNow(state)).toBe(LARGE)
    expect(state.attempt).toBe(0)
  })
})

describe('a size that fails is the same picture at another size', () => {
  it('moves from a row’s size to the stored one, never to another picture or the Placeholder first', () => {
    const state = coverFailed(startCover(input(SMALL)), SMALL, artwork)
    expect(coverNow(state)).toBe(LARGE)
  })

  it('moves from the page’s size to a row’s', () => {
    const state = coverFailed(startCover(input(LARGE, 'xl')), LARGE, artwork)
    expect(coverNow(state)).toBe(SMALL)
  })

  it('ends in the Placeholder only when every size of it failed', () => {
    const state = coverFailed(coverFailed(startCover(input(SMALL)), SMALL, artwork), LARGE, artwork)
    expect(coverNow(state)).toBeNull()
  })

  it('leaves the artwork in view when another size of it fails (a srcset pick that 404s)', () => {
    const state = coverFailed(inView(SMALL, input(LARGE, 'xl')), LARGE, artwork)
    expect(coverNow(state)).toBe(SMALL)
    expect(state.shown).toBe(SMALL)
    expect(state.srcset).toBe(false) // it does not offer the sizes again
    expect(state.chain).toEqual([SMALL]) // and does not try the shown one twice
  })

  it('moves on from the image in view when it fails itself, to its other size', () => {
    const state = coverFailed(inView(SMALL), SMALL, artwork)
    expect(coverNow(state)).toBe(LARGE)
    expect(state.shown).toBeNull()
  })

  it('offers the sizes again for the next source after one failed', () => {
    const state = coverFailed(startCover(input(SMALL)), SMALL, artwork)
    expect(state.srcset).toBe(true)
    expect(state.attempt).toBe(1)
  })

  it('treats a failing image of another artwork as the one in view failing (it is no size of it)', () => {
    const state = coverFailed(inView(SMALL), CHANGED, artwork)
    expect(state.shown).toBeNull()
    expect(state.attempt).toBe(1)
  })
})

describe('the chain', () => {
  it('has no repeats and none when there is no src', () => {
    expect(startCover({ src: SMALL, fallbacks: [SMALL, LARGE, LARGE], identity: 'a' }).chain).toEqual([SMALL, LARGE])
    expect(startCover({ src: null, fallbacks: [SMALL], identity: 'a' }).chain).toEqual([])
    expect(coverNow(startCover({ src: '', fallbacks: [], identity: 'a' }))).toBeNull()
  })
})
