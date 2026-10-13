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
