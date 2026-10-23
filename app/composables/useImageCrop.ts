import { reactive, shallowRef } from 'vue'
import {
  clampPan,
  coverScale,
  cropRect,
  initialCrop,
  panBy,
  pinch,
  zoomAround,
  type CropRect,
  type CropState,
  type Point,
  type Size,
} from '../utils/imageCrop'

/**
 * Pan with one finger or the mouse, pinch with two, the wheel and a slider for
 * the zoom. `viewport()` is read on every gesture, so a rotated phone keeps
 * working; `image` is set when a picture is opened.
 */
export function useImageCrop(viewport: () => number) {
  const state = reactive<CropState>({ zoom: 1, x: 0, y: 0 })
  const image = shallowRef<Size | null>(null)
  const pointers = new Map<number, Point>()
  let lastPinch: { distance: number; middle: Point } | null = null

  function set(next: CropState) {
    state.zoom = next.zoom
    state.x = next.x
    state.y = next.y
  }

  function open(size: Size) {
    image.value = size
    pointers.clear()
    lastPinch = null
    set(initialCrop(size, viewport()))
  }

  function local(event: PointerEvent | WheelEvent): Point {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  function onPointerDown(event: PointerEvent) {
    ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
    pointers.set(event.pointerId, local(event))
    lastPinch = null
  }

  function onPointerMove(event: PointerEvent) {
    if (!image.value || !pointers.has(event.pointerId)) return
    const picture = image.value
    const previous = pointers.get(event.pointerId)!
    const point = local(event)
    pointers.set(event.pointerId, point)
    const size = viewport()

    if (pointers.size === 1) {
      set(panBy(state, point.x - previous.x, point.y - previous.y, picture, size))
      return
    }
    const [a, b] = [...pointers.values()]
    const now = pinch(a!, b!)
    if (lastPinch && lastPinch.distance > 0) {
      const factor = now.distance / lastPinch.distance
      const zoomed = zoomAround(state, state.zoom * factor, now.middle, picture, size)
      const dx = now.middle.x - lastPinch.middle.x
      const dy = now.middle.y - lastPinch.middle.y
      set(panBy(zoomed, dx, dy, picture, size))
    }
    lastPinch = now
  }

  function onPointerUp(event: PointerEvent) {
    pointers.delete(event.pointerId)
    lastPinch = null
  }

  function onWheel(event: WheelEvent) {
    if (!image.value) return
    event.preventDefault()
    const factor = Math.exp(-event.deltaY / 400)
    set(zoomAround(state, state.zoom * factor, local(event), image.value, viewport()))
  }

  /** The square changed size (rotation, a resized window): the same crop, scaled along. */
  function resize(from: number, to: number) {
    if (!image.value || from <= 0 || to <= 0 || from === to) return
    const ratio = to / from
    set(clampPan({ zoom: state.zoom, x: state.x * ratio, y: state.y * ratio }, image.value, to))
  }

  /** The slider: zooms around the square's centre. */
  function setZoom(zoom: number) {
    if (!image.value) return
    const size = viewport()
    set(zoomAround(state, zoom, { x: size / 2, y: size / 2 }, image.value, size))
  }

  /** Keyboard pan: moves the picture by `dx`/`dy` CSS pixels, never past the square's edges. */
  function nudge(dx: number, dy: number) {
    if (!image.value) return
    set(panBy(state, dx, dy, image.value, viewport()))
  }

  function rect(): CropRect | null {
    return image.value ? cropRect(state, image.value, viewport()) : null
  }

  /** Where and how large to draw the picture in the square, in CSS pixels. */
  function placement() {
    const picture = image.value
    if (!picture) return null
    const scale = coverScale(picture, viewport()) * state.zoom
    return { x: state.x, y: state.y, width: picture.width * scale, height: picture.height * scale }
  }

  return {
    state,
    open,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    resize,
    setZoom,
    nudge,
    rect,
    placement,
  }
}
