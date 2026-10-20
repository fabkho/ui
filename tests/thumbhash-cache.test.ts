import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `thumbhashDataUrl` keeps its last decodes (utils/cloth.ts): the same output as decoding every time, the decoder
 * called once per hash while it is in the cache, the oldest dropped past `THUMBHASH_CACHE_SIZE`.
 */
const decode = vi.hoisted(() => vi.fn((bytes: Uint8Array) => `data:image/png;base64,${Array.from(bytes).join('.')}`))
vi.mock('thumbhash', () => ({ thumbHashToDataURL: decode }))

const { THUMBHASH_CACHE_SIZE, thumbhashDataUrl } = await import('../app/utils/cloth')

/** A distinct, valid base64 hash per number. */
const hashOf = (n: number) => btoa(String.fromCharCode(n % 256, Math.floor(n / 256), 7))

beforeEach(() => {
  decode.mockClear()
})

describe('thumbhashDataUrl', () => {
  it('gives the decoder’s output, and null for nothing or for a hash that does not decode', () => {
    expect(thumbhashDataUrl(hashOf(1))).toBe('data:image/png;base64,1.0.7')
    expect(thumbhashDataUrl(null)).toBeNull()
    expect(thumbhashDataUrl(undefined)).toBeNull()
    expect(thumbhashDataUrl('')).toBeNull()
    expect(thumbhashDataUrl('not base64 !!')).toBeNull()
  })

  it('decodes a hash once while it is cached, a bad one too', () => {
    const hash = hashOf(1000)
    const first = thumbhashDataUrl(hash)
    expect(thumbhashDataUrl(hash)).toBe(first)
    expect(decode).toHaveBeenCalledTimes(1)
    thumbhashDataUrl('not base64 !!')
    thumbhashDataUrl('not base64 !!')
    expect(decode).toHaveBeenCalledTimes(1)
  })

  it('is bounded: past the limit the least recently used goes, and reading a hash keeps it', () => {
    expect(THUMBHASH_CACHE_SIZE).toBe(200)
    // What the other tests left in the cache is pushed out first.
    for (let n = 0; n < THUMBHASH_CACHE_SIZE; n++) thumbhashDataUrl(hashOf(5000 + n))
    const kept = hashOf(2000)
    thumbhashDataUrl(kept)
    for (let n = 0; n < THUMBHASH_CACHE_SIZE - 1; n++) thumbhashDataUrl(hashOf(3000 + n))
    // The cache is full: `kept` is the oldest. Reading it makes the next oldest the one to go.
    thumbhashDataUrl(kept)
    thumbhashDataUrl(hashOf(9000))
    decode.mockClear()
    thumbhashDataUrl(kept)
    expect(decode).not.toHaveBeenCalled()
    thumbhashDataUrl(hashOf(3000))
    expect(decode).toHaveBeenCalledTimes(1)
  })
})
