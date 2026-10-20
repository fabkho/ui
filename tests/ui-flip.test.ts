import { describe, expect, it } from 'vitest'
import { coverCrop, flipTransform, morphFrames } from '../app/utils/flip'

describe('flipTransform', () => {
  it('draws the large box where the small one is', () => {
    const from = { left: 100, top: 50, width: 72, height: 72 }
    const to = { left: 0, top: 200, width: 360, height: 360 }
    expect(flipTransform(from, to)).toBe('translate(100px, -150px) scale(0.2, 0.2)')
  })
  it('is the identity for a box with no size', () => {
    expect(flipTransform({ left: 0, top: 0, width: 0, height: 0 }, { left: 0, top: 0, width: 10, height: 10 })).toBe('none')
  })
})

describe('coverCrop', () => {
  it('shows the middle square of a landscape photo to a round face', () => {
    expect(coverCrop({ width: 400, height: 300 }, { width: 72, height: 72 })).toEqual({ left: 50, top: 0, width: 300, height: 300 })
  })
  it('shows the middle square of a portrait photo', () => {
    expect(coverCrop({ width: 300, height: 450 }, { width: 72, height: 72 })).toEqual({ left: 0, top: 75, width: 300, height: 300 })
  })
  it('is the whole photo for a square one', () => {
    expect(coverCrop({ width: 360, height: 360 }, { width: 72, height: 72 })).toEqual({ left: 0, top: 0, width: 360, height: 360 })
  })
  it('follows a target that is not square', () => {
    expect(coverCrop({ width: 400, height: 400 }, { width: 200, height: 100 })).toEqual({ left: 0, top: 100, width: 400, height: 200 })
  })
  it('gives the photo itself when there is nothing to measure', () => {
    expect(coverCrop({ width: 100, height: 100 }, { width: 0, height: 0 })).toEqual({ left: 0, top: 0, width: 100, height: 100 })
  })
})

describe('morphFrames', () => {
  const face = { left: 159, top: 100, width: 72, height: 72 }
  const radius = '16px'

  it('starts as the circle on the face and ends as the picture at rest', () => {
    const rest = { left: 15, top: 200, width: 360, height: 360 }
    const frames = morphFrames(face, rest, radius)!
    // The whole square is the crop: scaled to the face, its middle (195, 380) on the face's (195, 136).
    expect(frames.start.transform).toBe('translate(144px, -100px) scale(0.2)')
    expect(frames.start.clipPath).toBe('inset(0px 0px 0px 0px round 180px)')
    expect(frames.end).toEqual({ transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 16px)' })
  })

  it('crops a landscape photo to its middle square at the start, then opens to the whole frame', () => {
    const rest = { left: 0, top: 262, width: 390, height: 292.5 }
    const frames = morphFrames(face, rest, radius)!
    // 292.5 crop side → scale 72 / 292.5; the crop is the middle 292.5 of 390 (48.75 each side).
    expect(frames.start.clipPath).toBe('inset(0px 48.75px 0px 48.75px round 146.25px)')
    expect(frames.start.transform).toBe('translate(147px, -162px) scale(0.2462)')
  })

  it('keeps the circle a circle on the face: the crop is square and rounded by half its side', () => {
    const rest = { left: 0, top: 0, width: 300, height: 450 }
    const { start } = morphFrames(face, rest, radius)!
    expect(start.clipPath).toBe('inset(75px 0px 75px 0px round 150px)')
  })

  it('starts the way out from where a swipe let go', () => {
    const rest = { left: 15, top: 200, width: 360, height: 360 }
    expect(morphFrames(face, rest, radius, 132)!.lifted).toEqual({
      transform: 'translate(0px, 132px) scale(1)',
      clipPath: 'inset(0px 0px 0px 0px round 16px)',
    })
  })

  it('has nothing to morph without a face or a picture', () => {
    expect(morphFrames({ left: 0, top: 0, width: 0, height: 0 }, { left: 0, top: 0, width: 10, height: 10 }, radius)).toBeNull()
    expect(morphFrames(face, { left: 0, top: 0, width: 0, height: 0 }, radius)).toBeNull()
  })
})

describe('morphFrames from a rounded tile', () => {
  const radius = '16px'

  it('starts as the tile with its own corners, in the picture\'s scale, not as a circle', () => {
    // A 171 × 171 tile of a 390 × 390 photo: scale 0.4385, a 12 px corner is 27.37 px of the picture.
    const tile = { left: 20, top: 100, width: 171, height: 171 }
    const rest = { left: 0, top: 200, width: 390, height: 390 }
    const { start } = morphFrames(tile, rest, radius, 0, 12)!
    expect(start.clipPath).toBe('inset(0px 0px 0px 0px round 27.37px)')
  })

  it('is never rounder than the circle, so a pill-shaped face still starts as a circle', () => {
    const face = { left: 159, top: 100, width: 72, height: 72 }
    const rest = { left: 15, top: 200, width: 360, height: 360 }
    expect(morphFrames(face, rest, radius, 0, 9999)!.start.clipPath).toBe('inset(0px 0px 0px 0px round 180px)')
  })

  it('crops a landscape photo to the tile\'s own shape (tall tile: the middle of the picture)', () => {
    const tile = { left: 20, top: 100, width: 171, height: 228 }
    const rest = { left: 0, top: 200, width: 400, height: 300 }
    const { start } = morphFrames(tile, rest, radius, 0, 12)!
    // The crop is 3:4 of the picture's height 300: 225 wide, 87.5 off each side.
    expect(start.clipPath).toBe('inset(0px 87.5px 0px 87.5px round 15.79px)')
  })
})
