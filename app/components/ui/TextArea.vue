<script setup lang="ts">
// A few lines of the member's own words (D's review box in the finish sheet):
// a quiet filled box with the label and its hint on top, the text in the
// serif italic, a lamp ring while it has the focus. It grows with the text up
// to a few lines, then scrolls. Attributes (maxlength, data-testid, …) go to
// the <textarea>.
//
// The label names the field; the hint (and the error) describe it (`aria-describedby`, as UiField's do), so a
// screen reader says them after the name and the name stays short. A click anywhere in the box focuses the field.
// `error` (added for Bookretreats, as UiField's): the message under the text, in the error colour; it sets
// `aria-invalid` and takes the first place in the description. `errorTestid` is its `data-testid`.
// `footer` slot (BetterReads' review box): a line under the text for a control that belongs to it (such as
// "Contains spoilers"). It opens (UiReveal) once there is text and closes when the text is gone. It sits outside
// the <label> and outside the textarea's description, so it is not part of the field's name.
import UiReveal from './Reveal.vue'
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** The field's id: what the label points at, and the base of the hint's and the error's ids. */
  id: string
  /** The field's name, on the label above the text. */
  label: string
  /** A short hint after the label ("optional"), part of the field's description. */
  hint?: string
  /** The message under the text, in the error colour; it sets `aria-invalid` and comes first in the description. */
  error?: string | null
  /** The error message's `data-testid`. */
  errorTestid?: string
}>()
defineSlots<{
  /** A line under the text for a control that belongs to it, shown once there is text. */
  footer?: () => unknown
}>()
const attrs = useAttrs()
const described = computed(
  () =>
    [props.error ? `${props.id}-error` : null, props.hint ? `${props.id}-hint` : null, attrs['aria-describedby'] as string | undefined]
      .filter(Boolean)
      .join(' ') || undefined,
)
const model = defineModel<string>({ required: true })

const focused = ref(false)
const area = useTemplateRef<HTMLTextAreaElement>('area')

// Grows with the text (`field-sizing` where the browser has it, this elsewhere).
function fit() {
  const el = area.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
watch(model, () => nextTick(fit))
onMounted(fit)
</script>

<template>
  <div
    class="box flex flex-col gap-sm rounded-md bg-fill px-inset pt-ms pb-inset"
    :class="error ? 'invalid' : focused ? 'focused' : 'edge-faint'"
    @click.self="area?.focus()"
  >
    <span class="text-footnote text-ink-muted">
      <label :for="id">{{ label }}</label><template v-if="hint"><span :id="`${id}-hint`" class="text-ink-faint"> · {{ hint }}</span></template>
    </span>
    <textarea
      :id="id"
      ref="area"
      v-model="model"
      v-bind="$attrs"
      rows="2"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="described"
      class="area w-full resize-none bg-transparent font-serif text-callout text-ink italic caret-accent outline-none placeholder:text-ink-faint"
      @focus="focused = true"
      @blur="focused = false"
    />
    <p v-if="error" :id="`${id}-error`" class="text-footnote text-error" :data-testid="errorTestid">{{ error }}</p>
    <UiReveal v-if="$slots.footer" :show="model.trim().length > 0" class="-mb-xs">
      <div class="mt-xs flex flex-col border-t border-hairline pt-xs">
        <slot name="footer" />
      </div>
    </UiReveal>
  </div>
</template>

<style scoped>
.box {
  transition: box-shadow var(--duration-quick) var(--ease-standard);
}

.box.invalid {
  box-shadow: inset 0 0 0 var(--stroke-rule) var(--color-error);
}

.box.focused {
  box-shadow: inset 0 0 0 var(--stroke-rule) var(--color-accent);
}

.area {
  max-height: calc(6 * var(--text-callout--line-height));
  field-sizing: content;
}
</style>
