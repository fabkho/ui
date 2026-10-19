import type { Ref } from 'vue'

/**
 * The keyboard of a horizontal toolbar (WAI-ARIA APG "Toolbar", with a roving tabindex): the toolbar is one
 * tab stop (the last item that had the focus, or the first); Left and Right move between the items and wrap,
 * Home and End go to the ends. `items` is a selector, matched in the `container` (`:scope > button` by
 * default); disabled ones are skipped. Items may come and go: the tab stop is kept in line as they do.
 *
 * Bind `onKeydown` and `onFocusin` on the container (and give it `role="toolbar"` and a name).
 */
export function useRovingToolbar(container: Ref<HTMLElement | null | undefined>, items = ':scope > button') {
  let remembered: HTMLElement | null = null
  const all = () => Array.from(container.value?.querySelectorAll<HTMLElement>(items) ?? []).filter((el) => !(el as HTMLButtonElement).disabled)

  /** One item has `tabindex` 0, the others -1. */
  function sync() {
    const list = all()
    const stop = remembered && list.includes(remembered) ? remembered : list[0]
    for (const el of list) el.tabIndex = el === stop ? 0 : -1
  }

  let observer: MutationObserver | undefined
  watch(
    container,
    (el) => {
      observer?.disconnect()
      if (!el || !import.meta.client) return
      observer = new MutationObserver(sync)
      observer.observe(el, { childList: true, subtree: true })
      sync()
    },
    { immediate: true, flush: 'post' },
  )
  onBeforeUnmount(() => observer?.disconnect())

  function onFocusin(event: FocusEvent) {
    const item = all().find((el) => el === event.target || el.contains(event.target as Node))
    if (!item) return
    remembered = item
    sync()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const list = all()
    const at = list.findIndex((el) => el === event.target)
    if (at === -1 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const to =
      event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length
    list[to]?.focus()
  }

  return { onKeydown, onFocusin }
}
