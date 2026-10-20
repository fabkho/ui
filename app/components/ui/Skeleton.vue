<script setup lang="ts">
// A placeholder where content will be once it has loaded (the `skeleton`
// utility: a quiet block in `fillStrong`), swelling with the loading wave.
// `wave` (0–1) is how far behind the first placeholder this one swells, so a
// row of them reads as one wave travelling across. Size it with classes
// (`h-… w-…`, `rounded-pill` for a face). Always hidden from assistive tech:
// the screen says that it is loading. Added for Bookretreats (Libellus writes
// `skeleton wave` by hand).
withDefaults(
  defineProps<{
    /** How far behind the first placeholder this one swells, 0–1, so a row of them reads as one wave travelling across. */
    wave?: number
    /** The element drawn: a `span` by default, a `div` for a line in a block. */
    as?: 'span' | 'div'
  }>(),
  { wave: 0, as: 'span' },
)
</script>

<template>
  <component :is="as" class="skeleton wave block" :style="{ '--wave': wave }" aria-hidden="true" />
</template>
