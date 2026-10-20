<script setup lang="ts">
// A quiet toggle pill (the Library's filters, the choices in the filter sheet, Read as): a hairline
// pill that fills with ink when it is on, an optional count in mono beside its words. A button
// with `aria-pressed`; the drawn pill is 32 px, the touch target stays 44 (`size-button-sm`,
// `size-touch`). The caller gives it the `data-testid`.
//
// `radio` (added for Bookretreats): one of a choice of one (a `radiogroup` around it), so it says
// `role=radio` and `aria-checked` instead of `aria-pressed`. And it moves like one (APG radio group): the
// chosen one is the group's one tab stop (the first, while none is chosen), the arrow keys move the choice
// and the focus to the next or previous radio and wrap, disabled ones are skipped. The move is a click on
// that radio, so the caller's `@click` is how the choice changes, as for a tap. The group is the nearest
// `[role=radiogroup]` (or the pill's parent).
const props = defineProps<{
  /** Whether the pill is on: pressed, or the chosen one of its radio group. */
  pressed: boolean
  /** A count shown in mono beside the words; `undefined` hides it, 0 still shows. */
  count?: number
  /** One of a choice of one (`role=radio`, `aria-checked`, the arrow keys move the choice) instead of a toggle. */
  radio?: boolean
}>()
/** The words of the pill (the count is passed, not slotted). */
defineSlots<{ default?: () => unknown }>()
const state = computed(() =>
  props.radio ? { role: 'radio', 'aria-checked': props.pressed, tabindex: props.pressed ? 0 : -1 } : { 'aria-pressed': props.pressed },
)

const button = useTemplateRef<HTMLButtonElement>('button')
const groupOf = (el: HTMLElement) => el.closest<HTMLElement>('[role="radiogroup"]') ?? el.parentElement
const radiosOf = (group: HTMLElement | null) =>
  Array.from(group?.querySelectorAll<HTMLButtonElement>('button[role="radio"]') ?? []).filter((el) => !el.disabled)

/** One tab stop for the group: the chosen radio, or the first while none is chosen. */
function rove() {
  const radios = radiosOf(button.value && groupOf(button.value))
  const chosen = radios.find((el) => el.getAttribute('aria-checked') === 'true') ?? radios[0]
  for (const el of radios) el.tabIndex = el === chosen ? 0 : -1
}
onMounted(() => props.radio && rove())
onUpdated(() => props.radio && rove())

const STEPS: Record<string, 1 | -1> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
function onKeydown(event: KeyboardEvent) {
  const step = STEPS[event.key]
  if (!props.radio || !step || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  const self = event.currentTarget as HTMLButtonElement
  const radios = radiosOf(groupOf(self))
  const next = radios[(radios.indexOf(self) + step + radios.length) % radios.length]
  if (!next || next === self) return
  event.preventDefault()
  next.focus()
  next.click()
}
</script>

<template>
  <button
    ref="button"
    type="button"
    v-bind="state"
    class="pill relative inline-flex h-(--size-button-sm) max-w-full items-center gap-xs rounded-pill px-md text-subhead whitespace-nowrap"
    :class="pressed ? 'on bg-ink text-on-ink' : 'edge text-ink-muted hover:bg-fill'"
    @keydown="onKeydown"
  >
    <span class="truncate"><slot /></span>
    <span v-if="count !== undefined" class="count figures text-caption" :class="!pressed && 'text-ink-faint'">{{ count }}</span>
  </button>
</template>

<style scoped>
.pill {
  transition:
    background-color var(--duration-quick) var(--ease-standard),
    color var(--duration-quick) var(--ease-standard),
    transform var(--duration-instant) var(--ease-standard);
}

.pill:active:not(:disabled) {
  transform: scale(0.97);
}

/* Reduce Motion: no press scale (the colours still change). */
@media (prefers-reduced-motion: reduce) {
  .pill:active:not(:disabled) {
    transform: none;
  }
}

.pill::after {
  position: absolute;
  inset: 50% 0 auto;
  height: var(--size-touch);
  content: '';
  transform: translateY(-50%);
}

/* The chosen pill's count is quieter than its name, 4.5:1 on the ink pill in both themes. */
.pill.on .count {
  opacity: 0.68;
}
</style>
