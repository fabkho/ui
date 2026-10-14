/** A box on screen, as `getBoundingClientRect` gives it. */
export interface FlipBox {
  left: number
  top: number
  width: number
  height: number
}

/**
 * The transform that draws `to` where `from` is: scale first, then move (`transform-origin: 0 0`).
 * FLIP's "invert" step: an element laid out at `to` plays from this to `none`, and looks as if it
 * grew out of `from`. A box with no size (hidden, not laid out) gives the identity.
 */
export function flipTransform(from: FlipBox, to: FlipBox): string {
  if (!from.width || !from.height || !to.width || !to.height) return 'none'
  const x = from.left - to.left
  const y = from.top - to.top
  return `translate(${x}px, ${y}px) scale(${from.width / to.width}, ${from.height / to.height})`
}

/** What a picture looks like at one end of the morph: where it sits and how it is cut. */
export interface MorphFrame {
  transform: string
  clipPath: string
}

/**
 * The part of `photo` (the picture's full frame, as laid out) that an element of the aspect of
 * `target` shows when it fills itself with it, `object-fit: cover`: the middle of the picture,
 * as much of it as the target's shape takes. Boxes are in the picture's own space (origin 0,0 =
 * its top-left corner). The avatar (a square) of a 4:3 photo shows the middle 3:3.
 */
export function coverCrop(photo: { width: number; height: number }, target: { width: number; height: number }): FlipBox {
  const aspect = target.width / target.height
  if (!photo.width || !photo.height || !Number.isFinite(aspect) || aspect <= 0) {
    return { left: 0, top: 0, width: photo.width, height: photo.height }
  }
  const width = Math.min(photo.width, photo.height * aspect)
  const height = width / aspect
  return { left: (photo.width - width) / 2, top: (photo.height - height) / 2, width, height }
}

const px = (value: number) => `${Math.round(value * 100) / 100}px`

/**
 * The picture grown out of a small round face (the morph's first frame; its last frame is the
 * picture resting: `transform: none`, `inset(0 round radius)`). `rest` is the picture's box on
 * screen, laid out at its full size, with the photo's own aspect (the viewer sizes the image to
 * its photo, so contain and the frame are the same box); `from` is the face it grows out of,
 * `radius` the viewer's own corner radius (any CSS length), `lift` how far a swipe has already
 * pulled the picture down (px) when it starts from there, not from rest.
 *
 * Both frames are the same kind of `transform` (translate, scale) and the same kind of
 * `clip-path` (an `inset()` that rounds), so they interpolate part by part: the cover crop opens
 * up to the whole frame while the circle (rounding half the crop's side) opens to the corner
 * radius, the picture itself only ever scaled evenly: no stretch, no jump at the end.
 * A box with no size gives `null` (nothing to morph, the caller cross-fades).
 *
 * `faceRadius` is the face's own corner radius on screen (px). Without it the start frame is the circle (half the
 * crop's short side), the avatar's; with it a rounded tile (a photo in a card, 12 px) starts as that tile: the radius
 * counted in the picture's own scale, never more than the circle.
 */
export function morphFrames(
  from: FlipBox,
  rest: FlipBox,
  radius: string,
  lift = 0,
  faceRadius?: number,
): { start: MorphFrame; end: MorphFrame; lifted: MorphFrame } | null {
  if (!from.width || !from.height || !rest.width || !rest.height) return null
  const crop = coverCrop({ width: rest.width, height: rest.height }, from)
  const scale = from.width / crop.width
  // The crop's middle lands on the face's middle.
  const x = from.left + from.width / 2 - (rest.left + (crop.left + crop.width / 2) * scale)
  const y = from.top + from.height / 2 - (rest.top + (crop.top + crop.height / 2) * scale)
  const circle = Math.min(crop.width, crop.height) / 2
  const round = faceRadius === undefined ? circle : Math.min(circle, Math.max(0, faceRadius) / scale)
  const insetRight = rest.width - crop.left - crop.width
  const insetBottom = rest.height - crop.top - crop.height
  const full = `inset(0px 0px 0px 0px round ${radius})`
  return {
    start: {
      transform: `translate(${px(x)}, ${px(y)}) scale(${Math.round(scale * 10000) / 10000})`,
      clipPath: `inset(${px(crop.top)} ${px(insetRight)} ${px(insetBottom)} ${px(crop.left)} round ${px(round)})`,
    },
    end: { transform: 'none', clipPath: full },
    lifted: { transform: `translate(0px, ${px(lift)}) scale(1)`, clipPath: full },
  }
}
