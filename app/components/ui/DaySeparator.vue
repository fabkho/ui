<script setup lang="ts">
// A day in a thread ("Today", "Yesterday", "Monday", "March 4"): centred, quiet, in the mono
// eyebrow type. The label comes from `dayLabel` (utils/chat/timeline.ts; UiChatThread draws one per
// `day` row of `timeline`). A list item by default (`tag`), since a thread is a list.
// Moved into the base with the thread.
//
// A heading (WCAG 1.3.1, 2.4.6): the day is what the messages after it belong to, and it looks like a section
// label, so it is one for assistive tech too: a screen reader's reader jumps from day to day (the H key, the
// rotor) instead of through every bubble. A `role="separator"` would only say "a line here" and, as an item
// of the thread's list, break its list semantics. The heading sits inside the list item, so the list keeps
// counting messages and days. `level` (added for Bookretreats) is its level; 2 under a page's title.
withDefaults(defineProps<{ label: string; tag?: string; testid?: string; level?: 2 | 3 | 4 | 5 | 6 }>(), {
  tag: 'li',
  testid: 'chat',
  level: 2,
})
</script>

<template>
  <component :is="tag" class="day" :data-testid="`${testid}.day`">
    <component :is="`h${level}`" class="heading">{{ label }}</component>
  </component>
</template>

<style scoped>
.day {
  position: relative;
  padding: var(--spacing-md) 0 var(--spacing-xs);
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  line-height: var(--text-eyebrow--line-height);
  letter-spacing: var(--text-eyebrow--letter-spacing);
  font-weight: var(--text-eyebrow--font-weight);
  text-transform: uppercase;
  color: var(--color-ink-faint);
}
/* A heading in meaning only: it keeps the eyebrow type of the item around it. */
.heading {
  margin: 0;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
}
</style>
