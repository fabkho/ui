<script setup lang="ts">
import UiIcon from './Icon.vue'
// A consent or a choice that is ticked (added for Bookretreats; the check of Libellus' import
// shelves as a component): a hairline ring, ticked a lamp-lit disc with the tick in it, the words
// beside it (slot; it may hold a link). The whole row is the label, at least 44 high. The box is
// the native checkbox lying over the drawn one, so assistive technology and a test tick it as
// usual; attributes (data-testid, required, …) go to it.
defineOptions({ inheritAttrs: false })

/** Whether it is ticked (a two-way `modelValue`); the words beside it are the default slot. */
const checked = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="flex min-h-(--size-touch) cursor-pointer items-start gap-ms py-xs">
    <span class="relative mt-px flex size-(--size-checkbox) shrink-0">
      <input
        v-model="checked"
        type="checkbox"
        v-bind="$attrs"
        class="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-pill opacity-0"
      />
      <span
        class="check pointer-events-none flex size-full items-center justify-center rounded-pill peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-ink"
        :class="checked && 'on'"
        aria-hidden="true"
      >
        <UiIcon v-if="checked" name="check" :size="14" bold />
      </span>
    </span>
    <span class="min-w-0 flex-1 pt-xxs text-subhead text-ink-muted"><slot /></span>
  </label>
</template>

<style scoped>
/* Libellus' check: a hairline ring; on, a lamp-lit disc with the tick in it. */
.check {
  box-shadow: inset 0 0 0 var(--stroke-rule) var(--color-ink-faint);
  color: var(--color-on-ink);
  transition:
    background-color var(--duration-quick) var(--ease-standard),
    box-shadow var(--duration-quick) var(--ease-standard);
}

.check.on {
  background: var(--color-accent);
  box-shadow: 0 0 var(--spacing-ms) var(--color-accent-soft);
}
</style>
