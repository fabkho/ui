<script setup lang="ts">
import UiRoundButton from './RoundButton.vue'
// The top of a pushed screen (book detail, a collection): round glass buttons
// that float over the cover's light — back on the left, actions on the right
// (slot `trailing`, use UiRoundButton) — and an optional small centred title.
// The bar is pinned under the status bar (`bar-top`: at least `barTop` off the
// top edge in a browser tab) while the page scrolls under it (an
// installed app has no edge swipe back, so back must stay in reach), centred on
// the column on a wide screen; the root keeps its place in the page, so content
// starts below it. Only the buttons take taps: the page under the rest of the
// row stays reachable.
defineProps<{
  /** A small title in the middle of the bar; it is the screen's own heading (an `h1`). */
  title?: string
  /** The back button's name for assistive tech. */
  backLabel: string
  /** The back button's `data-testid`. */
  backTestid: string
}>()
defineEmits<{
  /** The back button was pressed. */
  back: []
}>()
defineSlots<{
  /** The actions at the right, as `UiRoundButton`s. */
  trailing?: () => unknown
}>()
</script>

<template>
  <div class="bar-top">
    <div class="h-(--size-touch)" />
    <header class="bar-top safe-x pointer-events-none fixed inset-x-0 top-0 z-30 mx-auto max-w-(--size-max-content)" data-top-bar>
      <div class="relative flex h-(--size-touch) items-center justify-between px-inset">
        <UiRoundButton class="pointer-events-auto" icon="back" :label="backLabel" :data-testid="backTestid" @click="$emit('back')" />
        <!-- A title in the bar is the screen's own (Your shelf): its heading. -->
        <!-- It is centred on the bar and stays clear of the buttons: a long one wraps (WCAG 1.4.4, 1.4.10) rather
             than running under them or out of the screen. Room kept on each side: the inset, one button (two when
             the bar has actions) and a gap. -->
        <h1
          v-if="title"
          class="absolute left-1/2 w-max -translate-x-1/2 text-center text-body font-medium wrap-anywhere"
          :style="{ maxWidth: `calc(100% - 2 * (var(--spacing-inset) + var(--size-touch) * ${$slots.trailing ? 2 : 1} + var(--spacing-sm) * ${$slots.trailing ? 2 : 1}))` }"
        >
          {{ title }}
        </h1>
        <span class="pointer-events-auto flex gap-sm"><slot name="trailing" /></span>
      </div>
    </header>
  </div>
</template>
