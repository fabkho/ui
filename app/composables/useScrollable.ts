import type { Ref } from 'vue'

/**
 * Whether `el` scrolls at the moment (its content is taller than the box): the keyboard needs a way in to a
 * region that scrolls, and none to one that does not (WCAG 2.1.1; axe's `scrollable-region-focusable`).
 * Watches the element and its direct children (the content's own size is what changes), and the children that
 * come and go. Client only; `false` on the server.
 */
export function useScrollable(el: Ref<HTMLElement | null | undefined>): Readonly<Ref<boolean>> {
  const scrollable = ref(false)
  if (!import.meta.client || typeof ResizeObserver === 'undefined') return scrollable

  const measure = () => {
    const box = el.value
    scrollable.value = Boolean(box) && box!.scrollHeight > box!.clientHeight + 1
  }
  const resize = new ResizeObserver(measure)
  const mutate = new MutationObserver(() => {
    observe()
    measure()
  })
  function observe() {
    const box = el.value
    resize.disconnect()
    if (!box) return
    resize.observe(box)
    for (const child of Array.from(box.children)) resize.observe(child)
  }

  watch(
    el,
    (box) => {
      mutate.disconnect()
      observe()
      if (box) mutate.observe(box, { childList: true })
      measure()
    },
    { immediate: true, flush: 'post' },
  )
  onBeforeUnmount(() => {
    resize.disconnect()
    mutate.disconnect()
  })
  return scrollable
}
