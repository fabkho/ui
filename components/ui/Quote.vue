<script setup lang="ts">
import { useUiText } from '../../composables/useUiText'
import { fillWords } from '../../utils/chat/words'
import type { BubbleQuote } from '../../utils/chat/message'

// The message a bubble answers (as in WhatsApp): a stripe in the accent, who wrote it ("You" for
// one's own) and what it said, on one or two lines, on top of the bubble it belongs to. The words
// come one-lined from the app (`quotePreview`, utils/chat/reply.ts), so the block never grows with
// what was written.
//
// A tap jumps to the original and lights it up for a moment (UiChatThread's `jumpTo`; UiBubble's
// `quoteTap` also decides that a click ending a long press or a swipe is not a tap on the quote). A
// quote whose message is gone — an answer that survived the message it answered — has nowhere to go
// and says so (`ui.text.chat.reply.deleted`) instead of being a button. `mine`: the bubble it sits on
// is ink (the reader's own), so the type is on-ink. `testid` names the screen (`chat` → `chat.quote`).
// Moved from Bookretreats' `ChatQuote.vue`.
const props = withDefaults(defineProps<{ quote: BubbleQuote; mine?: boolean; testid?: string }>(), {
  mine: false,
  testid: 'chat',
})
const emit = defineEmits<{ tap: [id: string, event: Event] }>()
const uiText = useUiText()

/** The tint: on her ink bubble a lift, on the paper card a quiet fill. */
const ground = computed(() => (props.mine ? 'bg-on-ink/10' : 'bg-fill'))
</script>

<template>
  <button
    v-if="quote.id"
    type="button"
    class="quote flex w-full min-w-0 items-stretch gap-sm rounded-sm px-sm py-xs text-left"
    :class="ground"
    :aria-label="fillWords(uiText.chat.reply.show, { name: quote.name, preview: quote.preview })"
    :data-testid="`${testid}.quote`"
    @click.stop="emit('tap', quote.id, $event)"
  >
    <span class="w-(--stroke-focus) shrink-0 rounded-pill bg-accent" aria-hidden="true" />
    <span class="flex min-w-0 flex-col">
      <span class="truncate text-caption font-medium" :class="mine ? 'text-on-ink' : 'text-ink'" :data-testid="`${testid}.quoteName`">
        {{ quote.name }}
      </span>
      <span class="line-clamp-2 text-caption" :class="mine ? 'text-on-ink opacity-70' : 'text-ink-muted'" :data-testid="`${testid}.quotePreview`">
        {{ quote.preview }}
      </span>
    </span>
  </button>
  <span
    v-else
    class="quote flex w-full min-w-0 items-center gap-sm rounded-sm px-sm py-xs"
    :class="ground"
    :data-testid="`${testid}.quote`"
    data-deleted="true"
  >
    <span class="w-(--stroke-focus) shrink-0 self-stretch rounded-pill bg-accent" aria-hidden="true" />
    <span class="text-caption italic" :class="mine ? 'text-on-ink opacity-70' : 'text-ink-muted'" :data-testid="`${testid}.quotePreview`">
      {{ uiText.chat.reply.deleted }}
    </span>
  </span>
</template>

<style scoped>
/* The name and the preview are two lines of `caption`: the block keeps the height of both,
   whatever they hold, so a short quote does not make its bubble shorter than the next one. Its
   corners are the bubble's own smaller step, so it reads as one block. */
.quote {
  min-height: calc(var(--text-caption--line-height) * 2);
}
.quote:focus-visible {
  outline: var(--stroke-focus) solid var(--color-accent);
  outline-offset: calc(-1 * var(--stroke-focus));
}
</style>
