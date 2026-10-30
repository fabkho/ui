import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * A focus trap the base does not own, as an app's own sheet can have one: Bookretreats' member sheet is vaul, whose
 * content is Reka UI's `FocusScope` with `trapped`. This is Reka's logic, line for line: it remembers the last focus
 * inside it and pulls focus back when focus lands outside it (`focusin`) or leaves for an element outside it (`focusout`
 * with a `relatedTarget`); a focus that goes nowhere (`relatedTarget` null) it lets go. `data-pulls` counts the pulls.
 */
export const ForeignTrap = defineComponent({
  setup(_, { slots }) {
    const box = ref<HTMLElement | null>(null)
    const pulls = ref(0)
    let last: HTMLElement | null = null
    function pull() {
      pulls.value++
      last?.focus({ preventScroll: true })
    }
    function onFocusIn(event: FocusEvent) {
      if (!box.value) return
      if (box.value.contains(event.target as Node)) last = event.target as HTMLElement
      else pull()
    }
    function onFocusOut(event: FocusEvent) {
      if (!box.value || event.relatedTarget === null) return
      if (!box.value.contains(event.relatedTarget as Node)) pull()
    }
    onMounted(() => {
      document.addEventListener('focusin', onFocusIn)
      document.addEventListener('focusout', onFocusOut)
    })
    onBeforeUnmount(() => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    })
    return () =>
      h('div', { ref: box, tabindex: -1, role: 'dialog', 'aria-label': 'Member', 'data-pulls': pulls.value, class: 'rounded-lg bg-surface-sheet p-lg' }, slots.default?.())
  },
})
