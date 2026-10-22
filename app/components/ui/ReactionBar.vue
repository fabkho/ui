<script lang="ts">
import type { IconName } from './Icon.vue'

export interface BarAction {
  /** What `action` emits. */
  id: string
  /** The button's accessible name. */
  label: string
  /** The icon drawn (a `UiIcon` name). */
  icon: IconName
}
</script>

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
// focus (on the reader's, or the first, `focusOnOpen`). It is one tab stop (roving tabindex: the reader's
// reaction, or the first button, and then wherever the focus last was), the arrow keys, Home and End move along it, Escape
// closes it and the focus goes back to where it came from (UiBubble). It rises a little and fades in over
// `standard`, leaves over `exit` (the Transition is the caller's); with Reduce Motion it is simply there.
// Each button is a 44 × 44 cell (WCAG 2.5.8, our rule 44); the lit or hovered disc inside it is the 40 it always was.
// The emoji are named for a screen reader by `ui.text.chat.reactions.names` (an emoji without a name is
// read as itself). Moved into the base unchanged.
//
// `actions` (added for group chats): more entries after "Copy", the app's own (`{ id, label, icon }`: "Report",
// "Delete for me"), each an icon button named by `label` that emits `action` with its `id`. The base knows no
// domain word; they are in the same toolbar, so the roving tab stop and the arrow keys cover them.
const props = withDefaults(
  defineProps<{
    /** The emoji on offer, in the bar's order. */
    emojis: readonly string[]
    /** The reader's own reaction: lit, and its button takes it back; null for none. */
    current: string | null
    /** Offer "Copy" after the emoji (a text message, whose long press opened the bar). */
    copyable?: boolean
    /** May this message be answered; a post passes nothing. */
    replyable?: boolean
    /** The app's own entries after "Copy": an icon button each, named by its label. Default: none. */
    actions?: readonly BarAction[]
    /** Take the focus when the bar shows (on the reader's reaction, or the first button). */
    focusOnOpen?: boolean
    /** Names the screen, for the test ids (`chat` → `chat.reactionBar`). */
    testid?: string
  }>(),
  { copyable: false, replyable: false, actions: () => [], focusOnOpen: false, testid: 'chat' },
)
const emit = defineEmits<{
  /** A tap on an emoji, with the emoji (the same one again takes the reaction back; the caller closes the bar). */
  pick: [emoji: string]
  /** A tap on "Copy": the message's text goes to the clipboard. */
  copy: []
  /** A tap on "Reply": the message is answered. */
  reply: []
  /** A tap on one of the app's `actions`, with its id (the caller closes the bar). */
  action: [id: string]
  /** Escape (or the caller's own reason): the bar should close and the focus go back. */
  close: []
}>()
const uiText = useUiText()

const bar = ref<HTMLElement | null>(null)
const buttons = () => [...(bar.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])]

/** The buttons' keys in order (an emoji, `reply`, `copy`, `action:<id>`), and the one that is the toolbar's tab stop (roving tabindex). */
const keys = computed(() => [...props.emojis, ...(props.replyable ? ['reply'] : []), ...(props.copyable ? ['copy'] : []), ...props.actions.map((a) => `action:${a.id}`)])
const remembered = ref<string | null>(null)
watch(() => props.current, () => (remembered.value = null))
const stop = computed(() => {
  const wanted = remembered.value ?? props.current
  return wanted && keys.value.includes(wanted) ? wanted : keys.value[0]
})
function onFocusin(event: FocusEvent) {
  const key = (event.target as HTMLElement).closest<HTMLElement>('button')?.dataset.roving
  if (key) remembered.value = key
}

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
    class="bar glass edge flex items-center rounded-pill px-xxs shadow-float"
    :data-testid="`${testid}.reactionBar`"
    @keydown="onKeydown"
    @focusin="onFocusin"
  >
    <button
      v-for="emoji in emojis"
      :key="emoji"
      type="button"
      class="emoji flex size-(--size-touch) items-center justify-center rounded-pill"
      :class="current === emoji && 'on'"
      :tabindex="stop === emoji ? 0 : -1"
      :data-roving="emoji"
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
        class="emoji flex size-(--size-touch) items-center justify-center rounded-pill text-ink-muted"
        :tabindex="stop === 'reply' ? 0 : -1"
        data-roving="reply"
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
        class="emoji flex size-(--size-touch) items-center justify-center rounded-pill text-ink-muted"
        :tabindex="stop === 'copy' ? 0 : -1"
        data-roving="copy"
        :aria-label="words.copy"
        :data-testid="`${testid}.reactionCopy`"
        @click="emit('copy')"
      >
        <UiIcon name="copy" :size="18" />
      </button>
    </template>
    <template v-if="actions.length">
      <span class="mx-xxs h-md w-(--stroke-hairline) bg-hairline-strong" aria-hidden="true" />
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="emoji flex size-(--size-touch) items-center justify-center rounded-pill text-ink-muted"
        :tabindex="stop === `action:${action.id}` ? 0 : -1"
        :data-roving="`action:${action.id}`"
        :aria-label="action.label"
        :data-testid="`${testid}.reactionAction.${action.id}`"
        @click="emit('action', action.id)"
      >
        <UiIcon :name="action.icon" :size="18" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.bar {
  background-color: var(--color-glass);
}
.emoji {
  position: relative;
  isolation: isolate;
  font-size: var(--text-title);
  line-height: 1;
  transition: transform var(--duration-instant) var(--ease-standard);
}
/* The disc that lights: the 40 the button was drawn at, inside its 44 cell. */
.emoji::before {
  position: absolute;
  z-index: -1;
  inset: calc((var(--size-touch) - var(--size-button-md)) / 2);
  border-radius: var(--radius-pill);
  content: '';
  transition: background-color var(--duration-quick) var(--ease-standard);
}
.emoji.on::before {
  background-color: var(--color-accent-soft);
}
.emoji:active {
  transform: scale(0.9);
}
.emoji:focus-visible {
  outline: var(--stroke-focus) solid var(--color-accent);
  outline-offset: calc(-1 * var(--stroke-focus) - (var(--size-touch) - var(--size-button-md)) / 2);
}
@media (hover: hover) {
  .emoji:not(.on):hover::before {
    background-color: var(--color-fill);
  }
}
</style>
