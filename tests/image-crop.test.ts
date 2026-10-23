import { describe, expect, it } from 'vitest'
import {
  clampPan,
  coverScale,
  cropRect,
  initialCrop,
  MAX_ZOOM,
  outputSide,
  panBy,
  pinch,
  zoomAround,
} from '../app/utils/imageCrop'

// The square crop: what is cut out of the
// picture for a given pan and zoom. Pure geometry, so a native port can run the
// same cases against its own copy.

const landscape = { width: 4000, height: 3000 }
const portrait = { width: 1200, height: 1600 }
const viewport = 300

describe('crop geometry', () => {
  it('fills the square with the short side at zoom 1', () => {
    expect(coverScale(landscape, viewport)).toBe(0.1)
    expect(coverScale(portrait, viewport)).toBe(0.25)
  })

  it('starts on the largest square in the middle of the picture', () => {
    const start = initialCrop(landscape, viewport)
    expect(start).toEqual({ zoom: 1, x: -50, y: 0 })
    expect(cropRect(start, landscape, viewport)).toEqual({ x: 500, y: 0, size: 3000 })

    const upright = initialCrop(portrait, viewport)
    expect(cropRect(upright, portrait, viewport)).toEqual({ x: 0, y: 200, size: 1200 })
  })

  it('never lets the picture leave a gap in the square', () => {
    const start = initialCrop(landscape, viewport)
    // Dragged far to the right: the left edge stops at the square's left edge.
    expect(panBy(start, 500, 0, landscape, viewport).x).toBe(0)
    // Far to the left: the right edge stops at the square's right edge.
    expect(panBy(start, -500, 0, landscape, viewport).x).toBe(-100)
    // At zoom 1 the short side has no room to move at all.
    expect(panBy(start, 0, 80, landscape, viewport).y).toBe(0)
  })

  it('keeps the zoom between 1 and the maximum', () => {
    const start = initialCrop(landscape, viewport)
    expect(clampPan({ ...start, zoom: 0.2 }, landscape, viewport).zoom).toBe(1)
    expect(clampPan({ ...start, zoom: 99 }, landscape, viewport).zoom).toBe(MAX_ZOOM)
  })

  it('zooms around the point under the fingers', () => {
    const start = initialCrop(landscape, viewport)
    const centre = { x: viewport / 2, y: viewport / 2 }
    const zoomed = zoomAround(start, 2, centre, landscape, viewport)
    expect(zoomed.zoom).toBe(2)
    // The source pixel under the centre stays the picture's centre.
    const rect = cropRect(zoomed, landscape, viewport)
    expect(rect.size).toBe(1500)
    expect(rect.x + rect.size / 2).toBeCloseTo(2000)
    expect(rect.y + rect.size / 2).toBeCloseTo(1500)
  })

  it('cuts a corner when zoomed into it', () => {
    const start = initialCrop(landscape, viewport)
    const zoomed = zoomAround(start, 4, { x: 0, y: 0 }, landscape, viewport)
    const rect = cropRect(panBy(zoomed, 10_000, 10_000, landscape, viewport), landscape, viewport)
    expect(rect).toEqual({ x: 0, y: 0, size: 750 })
  })

  it('uploads at most 1024 px and never scales a small picture up', () => {
    expect(outputSide(3000)).toBe(1024)
    expect(outputSide(750)).toBe(750)
    expect(outputSide(512.7)).toBe(512)
    expect(outputSide(0.3)).toBe(1)
  })

  it('reads a pinch as distance and middle', () => {
    expect(pinch({ x: 0, y: 0 }, { x: 30, y: 40 })).toEqual({
      distance: 50,
      middle: { x: 15, y: 20 },
    })
  })
})
