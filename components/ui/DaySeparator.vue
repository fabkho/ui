<script setup lang="ts">
// A day in a thread ("Today", "Yesterday", "Monday", "March 4"): centred, quiet, in the mono
// eyebrow type. The label comes from `dayLabel` (utils/chat/timeline.ts; UiChatThread draws one per
// `day` row of `timeline`). A list item by default (`tag`), since a thread is a list.
// Moved into the base with the thread.
withDefaults(defineProps<{ label: string; tag?: string; testid?: string }>(), { tag: 'li', testid: 'chat' })
</script>

<template>
  <component :is="tag" class="day" :data-testid="`${testid}.day`">{{ label }}</component>
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
</style>
