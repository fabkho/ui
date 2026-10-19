<script setup lang="ts">
import UiIcon from './Icon.vue'
import type { IconName } from './Icon.vue'

// A floating action over UiComposer's capsule (Libellus' filter chip on glass, 34 px drawn, the
// finger's 44 around it): "Photo", "GIF", and the app's own in the composer's `actions` slot
// (Bookretreats' "Share number"). `label` is its name for a screen reader; the visible words (the
// default slot) are hidden from it, so it is named once. `icon` draws one of the base's glyphs before
// the words, the `icon` slot any other; `mono` sets the words in the mono label type (the "GIF" mark).
// The caller gives it its `data-testid`. Moved out of Bookretreats' `ChatComposer.vue` (`.pill`).
withDefaults(defineProps<{ label: string; icon?: IconName; mono?: boolean }>(), { icon: undefined, mono: false })
</script>

<template>
  <button type="button" class="chip glass edge" :aria-label="label">
    <slot name="icon">
      <UiIcon v-if="icon" :name="icon" :size="16" />
    </slot>
    <span :class="mono && 'mono'" aria-hidden="true"><slot /></span>
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
.chip::after {
  position: absolute;
  inset: -5px 0;
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
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
}
</style>
