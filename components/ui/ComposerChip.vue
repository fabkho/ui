<script setup lang="ts">
import UiIcon from './Icon.vue'
import type { IconName } from './Icon.vue'

// A floating action over UiComposer's capsule (a filter chip on glass, 34 px drawn, the finger's 44
// around it): "Photo", "GIF", and an app's own in the composer's `actions` slot ("Share number", say).
// The visible words (the default slot) name it; `label` gives it a longer name for a screen reader
// instead, which has to contain the visible words (WCAG 2.5.3, Label in Name: a voice-control user says
// what they see) — in development a `label` that does not is warned about. `icon` draws one of the
// base's glyphs before the words, the `icon` slot any other; `mono` sets the words in the mono label
// type (the "GIF" mark). The caller gives it its `data-testid`.
const props = withDefaults(defineProps<{ label?: string; icon?: IconName; mono?: boolean }>(), {
  label: undefined,
  icon: undefined,
  mono: false,
})

const words = ref<HTMLElement | null>(null)
if (import.meta.dev) {
  onMounted(() => {
    const visible = words.value?.textContent?.trim().toLowerCase() ?? ''
    if (props.label && visible && !props.label.toLowerCase().includes(visible)) {
      console.warn(`[UiComposerChip] label "${props.label}" does not contain the visible words "${visible}" (WCAG 2.5.3)`)
    }
  })
}
</script>

<template>
  <button type="button" class="chip glass edge" :aria-label="label">
    <slot name="icon">
      <UiIcon v-if="icon" :name="icon" :size="16" />
    </slot>
    <span ref="words" :class="mono && 'mono'" :aria-hidden="label ? 'true' : undefined"><slot /></span>
  </button>
</template>

<style scoped>
.chip {
  position: relative;
  transition: transform var(--duration-instant) var(--ease-standard);
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 var(--spacing-ms);
  border: 0;
  border-radius: var(--radius-pill);
  background-color: var(--color-glass);
  box-shadow: var(--shadow-button);
  color: var(--color-ink-muted);
  font-size: var(--text-caption);
  line-height: 1;
  white-space: nowrap;
}
/* The finger's 44 around the 34 drawn. */
.chip::after {
  position: absolute;
  inset: calc((34px - var(--size-touch)) / 2) 0;
  content: '';
}
.chip:active {
  color: var(--color-ink);
  transform: scale(0.97);
}
.chip:focus-visible {
  outline: var(--stroke-focus) solid var(--color-accent);
  outline-offset: 2px;
}
.mono {
  font-family: var(--font-mono);
  font-size: var(--text-meta);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.08em;
}
</style>
