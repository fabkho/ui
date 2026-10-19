import type { Ref } from 'vue'
import { dismisses } from '../utils/sheetDrag'
import { useSheetTouch } from './useSheetTouch'

/**
 * Swipe down to dismiss, for anything that rises from the bottom (UiSheet, the
 * search palette). Follows the finger while dragging (`offset`, px, only
 * downwards) and calls `dismiss` when the drag went far or fast enough;
 * otherwise the element springs back. Bind `handlers` on the element that
 * starts the drag.
 *
 * A finger (touch events, `useSheetTouch`) does it the iOS way: a drag that starts
 * in scrolling content scrolls it while it is not at the top, and moves the
 * element once it is — the same gesture can pass from one to the other. `dismiss` gets how far it was pulled (px), for a leave that starts from there. A mouse or
 * a pen (pointer events) drags from anywhere that is not scrolled down. Drags that
 * start in a field are left alone, so typing still works; a mouse's on a button too.
 */
export function useSwipeDown(dismiss: (distance: number) => void) {
  const offset = ref(0)
  const dragging = ref(false)
  let start: { y: number; time: number; id: number } | null = null

  function onPointerdown(event: PointerEvent) {
    // A finger is `useSheetTouch`'s: the browser would cancel its pointer as soon as it pans.
    if (event.pointerType === 'touch') return
    const target = event.target as HTMLElement | null
    if (target?.closest('input, textarea, button, a, [data-no-swipe]')) return
    // Content scrolled down inside the element (a tall sheet): a downward drag
    // scrolls it back first, as on iOS, and never dismisses mid-scroll.
    for (let el = target; el && el !== event.currentTarget; el = el.parentElement) {
      if (el.scrollTop > 0) return
    }
    start = { y: event.clientY, time: event.timeStamp, id: event.pointerId }
    dragging.value = true
    ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  }

  function onPointermove(event: PointerEvent) {
    if (!start || event.pointerId !== start.id) return
    offset.value = Math.max(0, event.clientY - start.y)
  }

  function end(event: PointerEvent) {
    if (!start || event.pointerId !== start.id) return
    const distance = Math.max(0, event.clientY - start.y)
    const velocity = distance / Math.max(1, event.timeStamp - start.time)
    start = null
    dragging.value = false
    offset.value = 0
    if (dismisses(distance, velocity)) dismiss(distance)
  }

  // The finger: the offset is the position, and a release is the same decision as the mouse's.
  const touch = useSheetTouch({
    position: () => offset.value,
    move: (position) => (offset.value = position),
    claim: () => (dragging.value = true),
    release: (position, velocity) => {
      dragging.value = false
      offset.value = 0
      if (dismisses(position, velocity)) dismiss(position)
    },
  })

  const handlers = {
    pointerdown: onPointerdown,
    pointermove: onPointermove,
    pointerup: end,
    pointercancel: end,
    ...touch.handlers,
  }

  /** Inline style for the dragged element: follows the finger, no transition while dragging. */
  const dragStyle = computed(() =>
    offset.value ? { transform: `translateY(${offset.value}px)`, transition: dragging.value ? 'none' : undefined } : {},
  )

  return { offset: offset as Readonly<Ref<number>>, dragging: dragging as Readonly<Ref<boolean>>, handlers, dragStyle }
}
