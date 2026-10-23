/**
 * The square crop, split in two:
 * pure geometry that Vitest checks (`tests/image-crop.test.ts`) and a native port
 * can copy line by line (this file), and `useImageCrop()`, the pointer handling on top of it.
 *
 * The model: a square viewport of `viewport` CSS pixels. The image is drawn at
 * `coverScale × zoom`, so at zoom 1 its short side exactly fills the square.
 * `x`/`y` are where the image's top-left corner sits relative to the
 * viewport's; the image always covers the whole square, so both are ≤ 0.
 */

export type Size = { width: number; height: number }
export type CropState = { zoom: number; x: number; y: number }
export type CropRect = { x: number; y: number; size: number }
export type Point = { x: number; y: number }

/** How far in the picture may zoom: four times the cover size. */
export const MAX_ZOOM = 4
/** The longest side the uploaded photo may have. */
export const OUTPUT_MAX = 1024
/** JPEG quality of the upload: 1024² lands around 150–300 kB. */
export const OUTPUT_QUALITY = 0.86

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** The scale at which the image's short side fills the square. */
export function coverScale(image: Size, viewport: number): number {
  return viewport / Math.min(image.width, image.height)
}

export function clampZoom(zoom: number): number {
  return clamp(zoom, 1, MAX_ZOOM)
}

/** Moves the image back so it covers the square again; the zoom is clamped too. */
export function clampPan(state: CropState, image: Size, viewport: number): CropState {
  const zoom = clampZoom(state.zoom)
  const scale = coverScale(image, viewport) * zoom
  const width = image.width * scale
  const height = image.height * scale
  return {
    zoom,
    x: clamp(state.x, viewport - width, 0),
    y: clamp(state.y, viewport - height, 0),
  }
}

/** Zoom 1, centred: the largest square in the middle of the picture. */
export function initialCrop(image: Size, viewport: number): CropState {
  const scale = coverScale(image, viewport)
  return {
    zoom: 1,
    x: (viewport - image.width * scale) / 2,
    y: (viewport - image.height * scale) / 2,
  }
}

export function panBy(
  state: CropState,
  dx: number,
  dy: number,
  image: Size,
  viewport: number,
): CropState {
  return clampPan({ ...state, x: state.x + dx, y: state.y + dy }, image, viewport)
}

/**
 * Zooms while the point under `focus` (viewport coordinates: a pinch's middle,
 * the mouse, the square's centre for the slider) stays where it is.
 */
export function zoomAround(
  state: CropState,
  zoom: number,
  focus: Point,
  image: Size,
  viewport: number,
): CropState {
  const next = clampZoom(zoom)
  const ratio = next / state.zoom
  return clampPan(
    {
      zoom: next,
      x: focus.x - (focus.x - state.x) * ratio,
      y: focus.y - (focus.y - state.y) * ratio,
    },
    image,
    viewport,
  )
}

/** The square to cut out of the original picture, in its own pixels. */
export function cropRect(state: CropState, image: Size, viewport: number): CropRect {
  const { zoom, x, y } = clampPan(state, image, viewport)
  const scale = coverScale(image, viewport) * zoom
  const size = Math.min(viewport / scale, image.width, image.height)
  return {
    x: clamp(-x / scale, 0, image.width - size),
    y: clamp(-y / scale, 0, image.height - size),
    size,
  }
}

/** The side of the uploaded square: the cut-out's own pixels, at most `OUTPUT_MAX`. Never upscaled. */
export function outputSide(cropSize: number, max = OUTPUT_MAX): number {
  return Math.max(1, Math.min(max, Math.floor(cropSize)))
}

/** The distance and middle of two touches, for the pinch. */
export function pinch(a: Point, b: Point): { distance: number; middle: Point } {
  return {
    distance: Math.hypot(a.x - b.x, a.y - b.y),
    middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  }
}

// ------------------------------------------------------------- the browser half

/** Decodes a picked file into an image the canvas can draw (EXIF orientation applied by the browser). */
export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('unreadable image'))
    }
    image.src = url
  })
}

/** Cuts the square out, scales it to ≤ `max` px and encodes it as JPEG. */
export function renderCrop(image: CanvasImageSource, rect: CropRect, max = OUTPUT_MAX): Promise<Blob> {
  const side = outputSide(rect.size, max)
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('no canvas'))
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, rect.x, rect.y, rect.size, rect.size, 0, 0, side, side)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encoding failed'))),
      'image/jpeg',
      OUTPUT_QUALITY,
    ),
  )
}

