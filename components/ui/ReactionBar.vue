<script setup lang="ts">
import UiIcon from './Icon.vue'
import { useUiText } from '../../composables/useUiText'
import { reactionName } from '../../utils/chat/message'
import { fillWords } from '../../utils/chat/words'

// The reaction bar (a chat bubble's, or a post's; `testid` names the screen): a small glass capsule
// over what it belongs to, as iMessage and WhatsApp float theirs — not a sheet. The app's emoji
// (`emojis`, in the bar's order), the reader's own lit (`current`); a tap picks one (the same again takes
// it back) and closes the bar. A text message also offers "Copy" here (`copyable`), since the long press
// that opens the bar is the press that used to select the text. A message that may be answered also
// offers "Reply" (`replyable`; the swipe right on the bubble is the fast way, this is the one without a
// gesture and the one a screen reader and a keyboard reach).
//
// A toolbar for assistive tech (APG "Toolbar"): opened by a button (VoiceOver, a keyboard) it takes the
// focus (on the reader's, or the first, `focusOnOpen`), the arrow keys, Home and End move along it, Escape
// closes it and the focus goes back to where it came from (UiBubble). It rises a little and fades in over
// `standard`, leaves over `exit` (the Transition is the caller's); with Reduce Motion it is simply there.
// The emoji are named for a screen reader by `ui.text.chat.reactions.names` (an emoji without a name is
// read as itself). Moved into the base unchanged.
const props = withDefaults(
  defineProps<{
    /** The emoji on offer, in the bar's order. */
    emojis: readonly string[]
    current: string | null
    copyable?: boolean
    /** May this message be answered; a post passes nothing. */
    replyable?: boolean
    focusOnOpen?: boolean
    testid?: string
  }>(),
  { copyable: false, replyable: false, focusOnOpen: false, testid: 'chat' },
)
const emit = defineEmits<{ pick: [emoji: string]; copy: []; reply: []; close: [] }>()
const uiText = useUiText()

const bar = ref<HTMLElement | null>(null)
const buttons = () => [...(bar.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])]

onMounted(() => {
  if (!props.focusOnOpen) return
  const list = buttons()
  const start = props.current ? list[props.emojis.indexOf(props.current)] : list[0]
  start?.focus({ preventScroll: true })
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const list = buttons()
  const at = list.indexOf(document.activeElement as HTMLButtonElement)
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? list.length - 1
        : (at + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length
  list[next]?.focus()
}

const words = computed(() => uiText.value.chat.reactions)
const nameOf = (emoji: string) => reactionName(emoji, words.value.names)
</script>

<template>
  <div
    ref="bar"
    role="toolbar"
    :aria-label="words.bar"
    class="bar glass edge flex items-center rounded-pill p-xxs shadow-float"
    :data-testid="`${testid}.reactionBar`"
    @keydown="onKeydown"
  >
    <button
      v-for="emoji in emojis"
      :key="emoji"
      type="button"
      class="emoji flex size-(--size-button-md) items-center justify-center rounded-pill"
      :class="current === emoji && 'on bg-accent-soft'"
      :aria-label="fillWords(current === emoji ? words.takeBack : words.pick, { name: nameOf(emoji) })"
      :aria-pressed="current === emoji"
      :data-testid="`${testid}.reactionPick`"
      :data-emoji="emoji"
      @click="emit('pick', emoji)"
    >
      <span aria-hidden="true">{{ emoji }}</span>
    </button>
    <template v-if="replyable || copyable">
      <span class="mx-xxs h-md w-(--stroke-hairline) bg-hairline-strong" aria-hidden="true" />
      <button
        v-if="replyable"
        type="button"
        class="emoji flex size-(--size-button-md) items-center justify-center rounded-pill text-ink-muted"
        :aria-label="uiText.chat.reply.bar"
        :data-testid="`${testid}.reactionReply`"
        @click="emit('reply')"
      >
        <UiIcon name="reply" :size="18" />
      </button>
    </template>
    <template v-if="copyable">
      <button
        type="button"
        class="emoji flex size-(--size-button-md) items-center justify-center rounded-pill text-ink-muted"
        :aria-label="words.copy"
        :data-testid="`${testid}.reactionCopy`"
        @click="emit('copy')"
      >
        <UiIcon name="copy" :size="18" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.bar {
  background-color: var(--color-glass);
}
.emoji {
  font-size: var(--text-title);
  line-height: 1;
  transition:
    background-color var(--duration-quick) var(--ease-standard),
    transform var(--duration-instant) var(--ease-standard);
}
.emoji:active {
  transform: scale(0.9);
}
.emoji:focus-visible {
  outline: var(--stroke-focus) solid var(--color-accent);
  outline-offset: calc(-1 * var(--stroke-focus));
}
@media (hover: hover) {
  .emoji:not(.on):hover {
    background-color: var(--color-fill);
  }
}
</style>
