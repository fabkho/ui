<script setup lang="ts">
import UiComposerChip from './ComposerChip.vue'
import UiIcon from './Icon.vue'
import { useUiText } from '../../composables/useUiText'
import { useVoiceRecorder } from '../../composables/useVoiceRecorder'
import { clock, liveRow, type PreparedVoice } from '../../utils/chat/voice'
import { fillWords } from '../../utils/chat/words'
import type { BubbleQuote } from '../../utils/chat/message'

// The composer (moved into the base unchanged in look and behaviour): a search palette's query
// row — a glass capsule floating over the page where the tab bar
// floats, holding only the field and send (the one lit action: ink on the glass, nothing drawn while
// there is nothing to send). "Photo" (the phone's own picker; with `photoAccept`), "GIF" (the app's
// GIF picker, UiGifPicker; with `gifs` — keyboard GIFs cannot work, Chrome on Android refuses
// inserting images from the keyboard into a web page) and the app's own chips (the `actions` slot,
// UiComposerChip: "Share number", say) float above it as small glass pills, as filter chips float. While the field has the keyboard they fold away: the row's room goes to the thread
// and the capsule stands alone on the keyboard, as in iMessage. They come back when the field is left
// (a drag on the thread closes the keyboard, UiChatThread). Sending never waits: the app shows the
// message at once.
//
// Voice messages (with `voiceMaxMs`, the app's longest recording): while the field is empty the
// microphone stands where send is. Tap to start (a tap to stop would be easy to miss on a hold, and two
// minutes is a long time to hold a thumb: it also works with VoiceOver and Switch Control, and the
// iPhone's long-press callout never gets in the way). The capsule then holds ✕ (throw away), the live
// bars, the timer and send; the floating pills give way to one line, "Recording". Send hands the
// recording over (`voice`), at `voiceMaxMs` it stops by itself and still waits for ✕ or send.
//
// The field grows with what is written up to five lines, then scrolls. Return sends on a desktop
// keyboard only (a fine pointer that can hover); on a phone it is a new line, and the button sends. A
// tap on the button keeps the keyboard up (the field keeps the focus), so the next one can be written.
//
// `compact` (a comment bar: the same component, not a new field): the capsule with the field and send,
// no microphone, and send always drawn. Above it, `note` is a glass pill ("Reply to Sam ×" / "Editing ×",
// its ✕ named by `noteLabel`) beside the chips it is given (`gifs`, `photoAccept`, `actions`); the row
// folds with the keyboard only while there is no note. What it says (`placeholder`, `label`), how much
// it takes (`max`) and what its test ids start with (`testid`) come from the caller.
//
// Answering one message (as in WhatsApp): while it is answered, the quote (`quote`) stands over the
// capsule — the accent stripe, who wrote it ("You" for one's own) and its first words — with the ✕ that
// takes it back. It stays while the keyboard is up (the chips fold away, the quote is what is being
// written about), and the field keeps the focus through both.
const text = defineModel<string>({ required: true })
const props = withDefaults(
  defineProps<{
    /** The GIF chip (the app has a GIF provider). */
    gifs?: boolean
    /** The photo chip, and the types its picker offers (`accept`, e.g. `image/jpeg,image/png`). */
    photoAccept?: string
    /** The microphone, and the longest recording in milliseconds. */
    voiceMaxMs?: number
    /** A comment bar: the field and send, the note and the chips it is given, no microphone. */
    compact?: boolean
    placeholder?: string
    label?: string
    /** The most characters the field takes. */
    max?: number
    /** The test ids' start: `chat` → `chat.input`, `chat.send`, `chat.composer`. */
    testid?: string
    /** A pill over the capsule (a compact bar's reply / edit mode) and what its ✕ says. */
    note?: string | null
    noteLabel?: string
    /** The message being answered, as the quote over the capsule; null when it answers nothing. */
    quote?: Pick<BubbleQuote, 'name' | 'preview'> | null
  }>(),
  {
    gifs: false,
    photoAccept: undefined,
    voiceMaxMs: undefined,
    compact: false,
    placeholder: undefined,
    label: undefined,
    max: undefined,
    testid: 'chat',
    note: null,
    noteLabel: undefined,
    quote: null,
  },
)
const emit = defineEmits<{
  dismissNote: []
  send: []
  photo: [file: File]
  gif: []
  /** A finished recording, to send. */
  voice: [voice: PreparedVoice]
  /** The microphone did not start, or the recording did not come out: the sentence. */
  voiceError: [message: string]
  /** The quote is taken back: the next message answers nothing. */
  cancelQuote: []
}>()
const uiText = useUiText()
const chat = computed(() => uiText.value.chat)

const recorder = useVoiceRecorder({ maxMs: () => props.voiceMaxMs ?? 0 })
const recording = computed(() => recorder.state.value !== 'idle')
const timer = computed(() => clock(recorder.elapsedMs.value / 1000))
/** The microphone is offered: the app allows recordings and the browser can make them. */
const voiceOffered = computed(() => props.voiceMaxMs !== undefined && recorder.supported.value)
/** The live bars as a fixed row: the newest on the right, older ones scrolling off to the left. */
const liveBars = computed(() => liveRow(recorder.bars.value))

async function startVoice() {
  const problem = await recorder.start()
  if (problem) emit('voiceError', chat.value.voice.problems[problem])
}
async function sendVoice() {
  const voice = await recorder.finish()
  if (voice) emit('voice', voice)
  else emit('voiceError', chat.value.voice.problems.failed)
}
watch(recording, (now) => {
  // The field leaves while recording, and an element that is removed sends no blur.
  if (now) focused.value = false
  else void nextTick(grow)
})

const picker = ref<HTMLInputElement | null>(null)
function picked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // The same photo may be picked again later.
  input.value = ''
  if (file) emit('photo', file)
}

const field = ref<HTMLTextAreaElement | null>(null)
/** The field has the focus (the keyboard is up): the chips fold away. */
const focused = ref(false)
const canSend = computed(() => text.value.trim().length > 0)
const placeholderText = computed(() => props.placeholder ?? chat.value.composer.placeholder)
const labelText = computed(() => props.label ?? chat.value.composer.label)

const MAX_LINES = 5

/** The field as tall as its text, at most five lines. */
function grow() {
  const el = field.value
  if (!el) return
  const style = getComputedStyle(el)
  const line = Number.parseFloat(style.lineHeight) || 24
  const chrome =
    Number.parseFloat(style.paddingTop) +
    Number.parseFloat(style.paddingBottom) +
    Number.parseFloat(style.borderTopWidth) +
    Number.parseFloat(style.borderBottomWidth)
  const max = line * MAX_LINES + chrome
  el.style.height = 'auto'
  const wanted = el.scrollHeight + Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth)
  el.style.height = `${Math.min(wanted, max)}px`
  el.style.overflowY = wanted > max ? 'auto' : 'hidden'
}

watch(text, () => nextTick(grow))
onMounted(grow)

function submit() {
  if (!canSend.value) return
  emit('send')
}

let desktop = false
onMounted(() => {
  desktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches
})

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || !desktop) return
  event.preventDefault()
  submit()
}

/**
 * Closes the keyboard, as a drag on the thread does (iMessage): not while a voice message is being
 * recorded or waits to be sent (the field is not there, and nothing may close under the thumb).
 */
function blur() {
  if (recording.value) return
  if (document.activeElement === field.value) field.value?.blur()
}

/** The ✕ takes the quote back and puts the focus where the text is written. */
function dropQuote() {
  emit('cancelQuote')
  void nextTick(() => field.value?.focus())
}

defineExpose({ focus: () => field.value?.focus(), blur })
</script>

<template>
  <div class="flex flex-col">
    <!-- The ways of sending something that is not words, floating above the field. -->
    <div
      v-if="compact && (note || photoAccept || gifs || $slots.actions)"
      class="actions"
      :data-folded="(!note && focused) || undefined"
      :inert="(!note && focused) || undefined"
      :data-testid="`${testid}.actions`"
    >
      <div class="actions-row flex gap-sm">
        <p v-if="note" class="pill glass edge" role="status" :data-testid="`${testid}.note`">
          <span>{{ note }}</span>
          <button type="button" class="note-close" :aria-label="noteLabel" :data-testid="`${testid}.noteClose`" @click="emit('dismissNote')">
            <UiIcon name="close" :size="14" />
          </button>
        </p>
        <!-- The chips it is given (a comment bar: GIF only, left off while a comment is changed). -->
        <UiComposerChip v-if="photoAccept" :label="chat.composer.photoLabel" icon="camera" :data-testid="`${testid}.photo`" @click="picker?.click()">
          {{ chat.composer.photo }}
        </UiComposerChip>
        <UiComposerChip v-if="gifs" :label="chat.composer.gifLabel" mono :data-testid="`${testid}.gifButton`" @click="emit('gif')">
          {{ chat.composer.gif }}
        </UiComposerChip>
        <slot name="actions" />
      </div>
    </div>
    <div v-else-if="compact" />
    <div v-else-if="recording" class="status flex" :data-testid="`${testid}.recordingStatus`">
      <p class="pill glass edge" role="status">
        <span class="dot" aria-hidden="true" />
        <span>{{ recorder.limitReached.value ? chat.voice.limit : recorder.state.value === 'stopped' ? chat.voice.stopped : chat.voice.recording }}</span>
      </p>
    </div>
    <!-- The row folds (its room goes to 0) while the field has the keyboard. -->
    <div v-else-if="photoAccept || gifs || $slots.actions" class="actions" :data-folded="focused || undefined" :inert="focused || undefined" :data-testid="`${testid}.actions`">
      <div class="actions-row flex gap-sm">
        <UiComposerChip v-if="photoAccept" :label="chat.composer.photoLabel" icon="camera" :data-testid="`${testid}.photo`" @click="picker?.click()">
          {{ chat.composer.photo }}
        </UiComposerChip>
        <UiComposerChip v-if="gifs" :label="chat.composer.gifLabel" mono :data-testid="`${testid}.gifButton`" @click="emit('gif')">
          {{ chat.composer.gif }}
        </UiComposerChip>
        <!-- The app's own chips (UiComposerChip). -->
        <slot name="actions" />
      </div>
    </div>

    <!-- The message being answered: the accent stripe, who wrote it and its first words. -->
    <div v-if="quote" class="quote glass edge" :data-testid="`${testid}.quoteBar`">
      <span class="stripe" aria-hidden="true" />
      <span class="flex min-w-0 flex-col">
        <span class="name truncate" :data-testid="`${testid}.quoteBarName`">{{ quote.name }}</span>
        <span class="preview line-clamp-1" :data-testid="`${testid}.quoteBarPreview`">{{ quote.preview }}</span>
      </span>
      <button
        type="button"
        class="cancel flex size-(--size-button-md) shrink-0 items-center justify-center rounded-pill text-ink-muted"
        :aria-label="chat.reply.cancel"
        :data-testid="`${testid}.quoteCancel`"
        @click="dropQuote"
      >
        <UiIcon name="close" :size="20" />
      </button>
    </div>

    <form class="capsule glass edge relative flex items-end gap-xs pl-md shadow-palette" :data-testid="`${testid}.composer`" @submit.prevent="submit">
      <input
        v-if="photoAccept"
        ref="picker"
        type="file"
        :accept="photoAccept"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        :data-testid="`${testid}.photoInput`"
        @change="picked"
      />
      <!-- Recording: ✕, the live bars, the timer, send. -->
      <div v-if="recording" class="flex min-w-0 flex-1 items-center gap-sm" role="group" :aria-label="chat.voice.recording" :data-testid="`${testid}.recorder`">
        <button
          type="button"
          class="send -ml-sm flex size-(--size-button-md) shrink-0 items-center justify-center rounded-pill text-ink-muted"
          :aria-label="chat.voice.cancel"
          :data-testid="`${testid}.voiceCancel`"
          @click="recorder.cancel()"
        >
          <UiIcon name="close" :size="20" />
        </button>
        <div class="live flex h-(--size-button-md) min-w-0 flex-1 items-center gap-xxs text-ink" aria-hidden="true" :data-testid="`${testid}.voiceLevels`">
          <span
            v-for="(level, i) in liveBars"
            :key="i"
            class="flex-1 rounded-pill bg-current"
            :class="level > 0 ? '' : 'opacity-35'"
            :style="{ height: `${Math.max(8, Math.round(level * 100))}%` }"
          />
        </div>
        <time class="figures shrink-0 text-body text-ink tabular-nums" role="timer" :aria-label="fillWords(chat.voice.timer, { elapsed: timer, max: clock((voiceMaxMs ?? 0) / 1000) })" :data-testid="`${testid}.voiceTimer`" :data-ms="Math.round(recorder.elapsedMs.value)">
          {{ timer }}
        </time>
        <button
          type="button"
          class="send flex size-(--size-button-md) shrink-0 items-center justify-center rounded-pill bg-ink text-on-ink shadow-button"
          :aria-label="chat.voice.send"
          :disabled="recorder.state.value === 'starting' || undefined"
          :data-testid="`${testid}.voiceSend`"
          @click="sendVoice"
        >
          <UiIcon name="send" :size="18" class="send-icon" />
        </button>
      </div>
      <label v-if="!recording" :for="`${testid}-input`" class="sr-only">{{ labelText }}</label>
      <textarea
        v-if="!recording"
        :id="`${testid}-input`"
        ref="field"
        v-model="text"
        rows="1"
        :maxlength="max"
        :placeholder="placeholderText"
        enterkeyhint="send"
        autocomplete="off"
        class="field min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-body text-ink caret-accent outline-none placeholder:text-ink-faint"
        :data-testid="`${testid}.input`"
        @keydown="onKey"
        @focus="focused = true"
        @blur="focused = false"
      />
      <button
        v-if="!recording && (canSend || compact || !voiceOffered)"
        type="submit"
        class="send flex size-(--size-button-md) shrink-0 items-center justify-center rounded-pill"
        :class="canSend ? 'bg-ink text-on-ink shadow-button' : 'text-ink-ghost'"
        :aria-label="chat.composer.send"
        :aria-disabled="!canSend || undefined"
        :data-testid="`${testid}.send`"
        @pointerdown.prevent
      >
        <UiIcon name="send" :size="18" class="send-icon" />
      </button>
      <!-- Nothing to send yet: the microphone takes its place. -->
      <button
        v-else-if="!recording && !compact && voiceOffered"
        type="button"
        class="send flex size-(--size-button-md) shrink-0 items-center justify-center rounded-pill text-ink-muted"
        :aria-label="chat.voice.record"
        :data-testid="`${testid}.record`"
        @click="startVoice"
      >
        <UiIcon name="mic" :size="20" />
      </button>
    </form>
  </div>
</template>

<style scoped>
/* The chips' row, `sm` above the capsule. Folding takes its room to 0 (grid rows, so it needs no
   measured height) and fades it, on the standard motion. */
.actions {
  display: grid;
  grid-template-rows: 1fr;
  padding-bottom: var(--spacing-sm);
  transition:
    grid-template-rows var(--duration-standard) var(--ease-standard),
    padding-bottom var(--duration-standard) var(--ease-standard),
    opacity var(--duration-standard) var(--ease-standard),
    visibility var(--duration-standard);
}
.actions[data-folded] {
  grid-template-rows: 0fr;
  padding-bottom: 0;
  opacity: 0;
  visibility: hidden;
}
.actions-row {
  min-height: 0;
  overflow: hidden;
}
/* Open, the pills' shadows are not clipped; folding (and fading out) clips the row. */
.actions:not([data-folded]) .actions-row {
  overflow: visible;
}
.status {
  padding-bottom: var(--spacing-sm);
}

/* The quote bar over the capsule: the same glass as the composer (it floats over the thread),
   one step narrower than it, so it reads as belonging to the field under it. */
.quote {
  display: flex;
  min-height: var(--size-touch);
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-xxs) var(--spacing-xs) var(--spacing-xxs) var(--spacing-sm);
  border-radius: var(--radius-xl);
  background-color: var(--color-glass);
  box-shadow: var(--shadow-palette);
}
.stripe {
  width: var(--stroke-focus);
  align-self: stretch;
  flex-shrink: 0;
  margin: var(--spacing-sm) 0;
  border-radius: var(--radius-pill);
  background-color: var(--color-accent);
}
.name {
  font-size: var(--text-caption);
  line-height: var(--text-caption--line-height);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent-ink);
}
.preview {
  font-size: var(--text-caption);
  line-height: var(--text-caption--line-height);
  color: var(--color-ink-muted);
}
.cancel:focus-visible {
  outline: var(--stroke-focus) solid var(--color-accent);
}

/* The glass is the page's chrome, not a card: it blurs what scrolls under it. A pill while it
   holds one line, rounder corners than a card once it grows.
   The send button keeps the same room of glass above, below and beside it (`--composer-inset`),
   so it is centred while the field holds one line and, as the field grows, stays in the capsule's
   lower round end, concentric with it (its radius plus the inset is the capsule's), level with
   the last line (test round 2: it sat 2 px low before). */
.capsule {
  --composer-inset: calc((var(--size-composer) - var(--size-button-md)) / 2);
  min-height: var(--size-composer);
  padding-top: var(--composer-inset);
  padding-right: var(--composer-inset);
  padding-bottom: var(--composer-inset);
  border-radius: calc(var(--size-composer) / 2);
  background-color: var(--color-glass);
}

/* The note and the recording line: the chips' glass pill (UiComposerChip), 34 drawn. */
.pill {
  position: relative;
  transition: transform var(--duration-instant) var(--ease-standard);
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 var(--spacing-ms);
  border: 0;
  border-radius: var(--radius-pill);
  background-color: var(--color-glass);
  box-shadow: var(--shadow-button);
  color: var(--color-ink-muted);
  font-size: var(--text-caption);
  line-height: 1;
  white-space: nowrap;
}
.pill::after {
  position: absolute;
  inset: -5px 0;
  content: '';
}
.pill:active {
  color: var(--color-ink);
  transform: scale(0.97);
}
/* The ✕ of the note: a finger's 44 around the small mark. */
.note-close {
  position: relative;
  /* Over the pill's own ::after (its finger-sized hit area), or that would take the tap. */
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: calc(var(--spacing-xs) * -1);
  color: var(--color-ink-faint);
}
.note-close::after {
  position: absolute;
  inset: -12px;
  content: '';
}
.note-close:focus-visible {
  outline: var(--stroke-focus) solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-pill);
}
/* The red dot of the recording line. */
.dot {
  width: var(--spacing-sm);
  height: var(--spacing-sm);
  border-radius: var(--radius-pill);
  background-color: var(--color-error);
}
.pill:focus-visible,
.send:focus-visible {
  outline: var(--stroke-focus) solid var(--color-accent);
  outline-offset: 2px;
}

/* The paper plane's weight sits up and to the right of its box (its strokes' centre is 0.6 px
   right of and 0.8 px above the box's at 18 px): drawn that much back, it reads centred. */
.send-icon {
  translate: -3.5% 4.5%;
}
.send {
  transition:
    background-color var(--duration-quick) var(--ease-standard),
    color var(--duration-quick) var(--ease-standard);
}

/* Centred on the send button while it holds one line (as high as the button). */
.field {
  padding-block: calc((var(--size-button-md) - var(--text-body--line-height)) / 2);
  line-height: var(--text-body--line-height);
}
</style>
