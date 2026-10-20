<script setup lang="ts">
// Inset grouped rows, iOS style: a quiet fill with a hairline edge; the rows
// inside draw their own inset dividers (Row.vue). Forms in sheets, the avatar
// menu, settings-like lists. `as` (added for Bookretreats): `ul` for a list of
// rows that are list items.
withDefaults(
  defineProps<{
    /** The element around the rows: `ul` when its rows are list items. */
    as?: 'div' | 'ul'
  }>(),
  { as: 'div' },
)
/** The rows (`Row`s), which draw their own dividers. */
defineSlots<{ default?: () => unknown }>()
</script>

<template>
  <component :is="as" class="overflow-hidden rounded-md bg-fill edge-faint">
    <slot />
  </component>
</template>
