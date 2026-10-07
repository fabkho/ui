<script setup lang="ts">
// A quiet toggle pill (the Library's filters, the choices in the filter sheet, Read as): a hairline
// pill that fills with ink when it is on, an optional count in mono beside its words. A button
// with `aria-pressed`; the drawn pill is 32 px, the touch target stays 44 (`size-button-sm`,
// `size-touch`). The caller gives it the `data-testid`.
//
// `radio` (added for Bookretreats): one of a choice of one (a `radiogroup` around it), so it says
// `role=radio` and `aria-checked` instead of `aria-pressed`.
const props = defineProps<{ pressed: boolean; count?: number; radio?: boolean }>()
const state = computed(() =>
  props.radio ? { role: 'radio', 'aria-checked': props.pressed } : { 'aria-pressed': props.pressed },
)
</script>

<template>
  <button
    type="button"
    v-bind="state"
    class="pill relative inline-flex h-(--size-button-sm) max-w-full items-center gap-xs rounded-pill px-md text-subhead whitespace-nowrap"
    :class="pressed ? 'on bg-ink text-on-ink' : 'edge text-ink-muted hover:bg-fill'"
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
