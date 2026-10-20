<script setup lang="ts" generic="T extends string | number">
// A choice of a few (Pages | Scroll, the margins, the line spacing): one group
// on a quiet fill with a hairline edge, the options side by side at equal
// widths, and the chosen one lit by a raised surface that slides from option
// to option over `standard` (positioned absolutely, moved by `transform` only;
// Reduce Motion: it is simply there). Its corners are concentric with the
// group's: the group's `md` less the `xxs` gap around it.
//
// A radiogroup: each option is a radio, arrow keys move the choice (and the
// focus) as the platform's own segmented controls do. Each option's face comes
// from the `option` slot ({ option, selected }); without it, its label.
// `testid` names the group; each option is `<testid>.<value>`, or its own `testid`.
//
// `compact` (ported from Libellus, where it is the Profile's Glass setting): the small
// one that sits at the right of a row: a pill's height (32), the footnote size, `sm`
// corners, as wide as its longest option times the count (still equal widths), each
// option's touch target 44 high.
// `disabled` (added for Bookretreats): the whole group is dimmed and takes no taps, while
// something it started is under way.
// A `v-model` that matches no option (added for Bookretreats) lights none: a choice not made yet.
export interface SegmentedOption<V> {
  value: V
  /** What assistive tech says, and the face without a slot. */
  label: string
  /** The option's own `data-testid` (added for Bookretreats), instead of `<testid>.<value>`. */
  testid?: string
}

const model = defineModel<T>({ required: true })
const props = defineProps<{
  /** The options, in order; each one is a radio. */
  options: readonly SegmentedOption<T>[]
  /** The group's name for assistive tech (the radiogroup's `aria-label`). */
  label: string
  /** Names the group in `data-testid`; each option is `<testid>.<value>` unless it has its own. */
  testid?: string
  /** The small one for the right of a row: a pill's height (32), the footnote size, `sm` corners. */
  compact?: boolean
  /** Dims the whole group and takes no taps, while something it started is under way. */
  disabled?: boolean
}>()
defineSlots<{
  /** The face of an option (`{ option, selected }`); without it, the option's label. */
  option?: (props: { option: SegmentedOption<T>; selected: boolean }) => unknown
}>()

/** The chosen option, -1 when `model` matches none (a choice not made yet: nothing is lit). */
const chosen = computed(() => props.options.findIndex((o) => o.value === model.value))
const index = computed(() => Math.max(0, chosen.value))
const buttons = useTemplateRef<HTMLButtonElement[]>('buttons')

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
  if (!step) return
  event.preventDefault()
  const next = (index.value + step + props.options.length) % props.options.length
  model.value = props.options[next]!.value
  buttons.value?.[next]?.focus()
}
</script>

<template>
  <div
    class="segmented relative bg-fill p-xxs edge-faint"
    :class="[
      compact ? 'compact inline-grid h-(--size-button-sm) shrink-0 auto-cols-fr grid-flow-col rounded-sm' : 'flex h-(--size-row) rounded-md',
      disabled && 'opacity-50',
    ]"
    role="radiogroup"
    :aria-label="label"
    :aria-disabled="disabled || undefined"
    :data-testid="testid"
    :style="{ '--count': options.length, '--index': index }"
    @keydown="onKeydown"
  >
    <span v-show="chosen >= 0" class="indicator pointer-events-none absolute" aria-hidden="true" />
    <button
      v-for="(option, i) in options"
      :key="String(option.value)"
      ref="buttons"
      type="button"
      role="radio"
      :aria-checked="i === chosen"
      :aria-label="$slots.option ? option.label : undefined"
      :tabindex="i === index ? 0 : -1"
      :disabled="disabled"
      class="option relative flex flex-1 items-center justify-center gap-sm"
      :class="[compact ? 'px-ms text-footnote' : 'text-caption', i === chosen ? 'text-ink' : 'text-ink-muted']"
      :data-testid="option.testid ?? (testid ? `${testid}.${option.value}` : undefined)"
      @click="model = option.value"
    >
      <slot name="option" :option="option" :selected="i === chosen">{{ option.label }}</slot>
    </button>
  </div>
</template>

<style scoped>
/* Concentric with the group: md (14) less the xxs (2) gap around it (compact: sm, 8). */
.option,
.indicator {
  border-radius: calc(var(--radius-md) - var(--spacing-xxs));
}
.compact .option,
.compact .indicator {
  border-radius: calc(var(--radius-sm) - var(--spacing-xxs));
}
/* The compact one is drawn 32 high; each option's touch target stays 44. */
.compact .option::after {
  position: absolute;
  inset: 50% 0 auto;
  height: var(--size-touch);
  content: '';
  transform: translateY(-50%);
}
.option {
  transition: color var(--duration-quick) var(--ease-standard);
}
.option:focus-visible {
  outline: var(--stroke-focus) solid var(--color-accent);
  outline-offset: calc(-1 * var(--stroke-focus));
}
/* The lit surface: one option wide, moved to the chosen one by transform alone. */
.indicator {
  top: var(--spacing-xxs);
  bottom: var(--spacing-xxs);
  left: var(--spacing-xxs);
  width: calc((100% - 2 * var(--spacing-xxs)) / var(--count));
  transform: translateX(calc(var(--index) * 100%));
  background: var(--color-surface-raised);
  box-shadow:
    0 0 0 var(--stroke-hairline) var(--color-hairline),
    0 var(--stroke-rule) var(--spacing-xxs) color-mix(in srgb, var(--color-ink) 12%, transparent);
  transition: transform var(--duration-standard) var(--ease-standard);
}
</style>
