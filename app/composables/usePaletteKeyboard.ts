import type { Ref } from 'vue'
import { paletteLift } from '../utils/keyboard'
import { useKeyboardViewport } from './useKeyboardInset'
import { useKeyboardInset } from './useKeyboardInset'

/**
 * A search palette on the keyboard (added for Bookretreats; the book, Serien & Filme and author palettes share it):
 * while the query has the keyboard the palette sits `sm` above it (Libellus' paletteLift) and the page holds still
 * behind it (`pin`). The keyboard is the one reading UiSheet and the chat stand on (useKeyboardViewport,
 * utils/keyboard.ts `readViewport`), so the palette cannot disagree with them about where the keyboard is.
 *
 * Returns the palette's inline style: its lift (with a swipe's `offset`), and its height, never more than the room
 * between the status bar and the keyboard (`room`: what the visual viewport shows, wherever iOS has panned to), so
 * its far end stays on the screen and the list in it scrolls to every row.
 */
export function usePaletteKeyboard(
  open: () => boolean,
  palette: Readonly<Ref<HTMLElement | null>>,
  drag: { offset: Readonly<Ref<number>>; dragging: Readonly<Ref<boolean>> },
) {
  const { inset: keyboard, room } = useKeyboardViewport(open, { pin: true })
  const lift = computed(() => {
    if (!keyboard.value || !palette.value) return 0
    const resting = Number.parseFloat(getComputedStyle(palette.value).bottom) || 0
    const gap = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spacing-sm')) || 0
    return paletteLift(keyboard.value, gap, resting)
  })
  const style = computed(() => ({
    // As tall as the room between the status bar and the keyboard allows, its bottom on the keyboard;
    // never taller than what the keyboard leaves in view (`room`), wherever the browser has panned to.
    maxHeight:
      room.value === null
        ? `calc(100dvh - var(--safe-area-top) - var(--spacing-xxxl) - var(--float-bottom) - ${lift.value}px)`
        : `min(calc(100dvh - var(--safe-area-top) - var(--spacing-xxxl) - var(--float-bottom) - ${lift.value}px), calc(${room.value}px - var(--safe-area-top) - var(--spacing-xxxl) - var(--spacing-sm)))`,
    transform: drag.offset.value || lift.value ? `translateY(${drag.offset.value - lift.value}px)` : undefined,
    transition: drag.dragging.value ? 'none' : undefined,
  }))
  return { keyboard, lift, style }
}
