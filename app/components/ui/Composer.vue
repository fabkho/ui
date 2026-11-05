<script setup lang="ts">
import UiComposerChip from './ComposerChip.vue'
import UiIcon from './Icon.vue'
import { useRovingToolbar } from '../../composables/useRovingToolbar'
import { useUiText } from '../../composables/useUiText'
import { useVoiceRecorder } from '../../composables/useVoiceRecorder'
import { voiceHaptic } from '../../utils/haptics'
import { prefersReducedMotion } from '../../utils/motion'
import { clock, liveRow, type PreparedVoice } from '../../utils/chat/voice'
import {
  HOLD_CANCEL_PX,
  HOLD_LOCK_PX,
  cancelProgress,
  holdStep,
  initialHold,
  lockProgress,
  type DiscardWhy,
  type HoldEffect,
  type HoldEvent,
  type HoldState,
} from '../../utils/chat/voiceGesture'
import { fillWords } from '../../utils/chat/words'
import type { BubbleQuote } from '../../utils/chat/message'

// The composer (moved into the base unchanged in look and behaviour): a search palette's query
// row — a glass capsule floating over the page where the tab bar
// floats, holding only the field and send (the one lit action: ink on the glass, nothing drawn while
// there is nothing to send). "Photo" (the phone's own picker; with `photoAccept`), "GIF" (the app's
// GIF picker, UiGifPicker; with `gifs` — keyboard GIFs cannot work, Chrome on Android refuses
// inserting images from the keyboard into a web page) and the app's own chips (the `actions` slot,
// UiComposerChip: "Share number", say; a toolbar for assistive tech, one tab stop with the arrow keys along it) float above it as small glass pills, as filter chips float. While the field has the keyboard they fold away: the row's room goes to the thread
// and the capsule stands alone on the keyboard, as in iMessage. They come back when the field is left
// (a drag on the thread closes the keyboard, UiChatThread). Sending never waits: the app shows the
// message at once.
//
// Voice messages (with `voiceMaxMs`, the app's longest recording), as WhatsApp does them: while the field
// is empty the microphone stands where send is.
//  - HOLD it: recording starts at once, with the timer and a pulsing red dot, the live bars and "Slide to
//    cancel" in the capsule, and a lock mark (lock, chevron up) above the microphone. LET GO and the
//    recording is sent (`voice`). Slide towards the start side of the line (left; right in RTL) past
//    `HOLD_CANCEL_PX` and let go, and it is thrown away (the trash shows for a moment); the hint fades as
//    the thumb goes. Slide UP past `HOLD_LOCK_PX` and it is LOCKED: it goes on without the finger and the
//    capsule becomes the recording panel, ✕ (throw away), the live bars, the timer and send.
//  - TAP it (released within `TAP_MS`, or before the microphone is live, when the phone's permission
//    sheet eats the finger's `pointerup`): nothing is sent and nothing is thrown away, the recording
//    goes on in the panel, as it always did. That is the way for VoiceOver and Switch Control (their
//    activation is a tap), the keyboard (Enter, Space) and a mouse that clicks. `voiceHold` off keeps
//    only this. A hold released under `TOO_SHORT_MS` is thrown away (too short to send).
//  - Robustness (utils/chat/voiceGesture.ts holds the rules, tests/chat-voice-gesture.test.ts runs them):
//    pointer events with pointer capture on the button, one pointer only, `touch-action: none` and no
//    selection, callout or context menu so the iPhone's long press has nothing to show. A `pointercancel`
//    (a system gesture took the touch) after the lock distance locks, before it cancels; the page going
//    to the background, or the window losing focus while the microphone is live, cancels. Whatever
//    ends it, the recorder is stopped and the microphone released. Reduced motion: the dot does not
//    pulse, the hint, lock mark and microphone do not move with the thumb (the distances still count).
//  Haptics (`haptics`, default on; Reduce Motion does not silence them, they are not motion): one per
//  transition, from the gesture's effects (voiceGesture.ts), never per move. Android (Vibration API,
//  patterns in utils/haptics.ts `VOICE_HAPTICS`): a firm pulse when the microphone starts, a double pulse
//  at the lock, a buzz when the thumb crosses the cancel distance and a short pulse if it comes back, a
//  medium pulse when it sends, a long pattern when a slid-away recording is thrown away; a tap or key
//  gets only a short pulse at the start. iOS: the switch tick on start and lock where WebKit allows it.
//  In the locked panel nothing changes at `voiceMaxMs`: it stops by itself and waits for ✕ or send. The
//  floating pills give way to one line, "Recording".
// The words (`ui.text.chat.voice`, English defaults in app.config.ts, the app supplies its own):
//  `record` the microphone's name; `recordHint` its description, read after the name (aria-describedby:
//  the gesture and the way without one; say which side "cancel" slides to in the language's direction);
//  `slideToCancel` the hint in the capsule; `recording` / `stopped` / `limit` the status line;
//  `locked`, `discarded`, `tooShort` the polite announcements (a status region that is always there)
//  when it locks, is thrown away, or was too short; `cancel`, `send`, `timer` the panel's own.
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
    /**
     * The microphone is held to record, as in WhatsApp (release sends, slide up locks, slide away cancels);
     * a tap still records hands-free. False keeps tap-only: tap to start, the panel to send.
     */
    voiceHold?: boolean
    /** The haptics of the held microphone (start, lock, cancel armed, send, thrown away); false silences them. Reduce Motion does not. */
    haptics?: boolean
    /** A comment bar: the field and send, the note and the chips it is given, no microphone. */
    compact?: boolean
    /** The field's placeholder; when not given, `ui.text.chat.composer.placeholder`. */
    placeholder?: string
    /** The field's accessible name; when not given, `ui.text.chat.composer.label`. */
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
    voiceHold: true,
    haptics: true,
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
  /** The ✕ on a compact bar's note was tapped: the reply or edit mode is over. */
  dismissNote: []
  /** The send button was tapped with text in the field. */
  send: []
  /** A photo was picked from the phone's own picker. */
  photo: [file: File]
  /** The GIF chip was tapped: open the app's GIF picker. */
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

/** The chips over the field are a toolbar (APG): one tab stop, the arrow keys move along them. */
const chips = useTemplateRef<HTMLElement>('chips')
const chipKeys = useRovingToolbar(chips)

const recorder = useVoiceRecorder({ maxMs: () => props.voiceMaxMs ?? 0 })
const recording = computed(() => recorder.state.value !== 'idle')
const timer = computed(() => clock(recorder.elapsedMs.value / 1000))
/** The microphone is offered: the app allows recordings and the browser can make them. */
const voiceOffered = computed(() => props.voiceMaxMs !== undefined && recorder.supported.value)
/** The live bars as a fixed row: the newest on the right, older ones scrolling off to the left. */
const liveBars = computed(() => liveRow(recorder.bars.value))

async function startVoice() {
  const problem = await recorder.start()
  if (problem) {
    hold.value = initialHold()
    emit('voiceError', chat.value.voice.problems[problem])
  }
  return problem
}
async function sendVoice() {
  const voice = await recorder.finish()
  if (voice) emit('voice', voice)
  else emit('voiceError', chat.value.voice.problems.failed)
}
watch(recording, (now) => {
  // The field leaves while recording, and an element that is removed sends no blur.
  if (now) focused.value = false
  else {
    hold.value = initialHold()
    void nextTick(grow)
  }
})

// ---------------------------------------------------------------- the held microphone
// The rules are utils/chat/voiceGesture.ts (pure); this feeds them the pointer and the page, and does
// what they say. The microphone button stays in the DOM while it is held (it owns the pointer), and
// leaves for the panel when the recording is locked.

const DISCARD_MS = 700
/** How far (px) the thumb's hint, lock mark and the microphone follow it at most. */
const FOLLOW_PX = HOLD_CANCEL_PX * 1.2

const hold = ref<HoldState>(initialHold())
/** The microphone is held (or just let go to send): the capsule shows the hold, not the panel. */
const holding = computed(() => hold.value.phase === 'holding' || hold.value.phase === 'sent')
/** Today's recording panel: ✕, bars, timer, send. */
const panel = computed(() => recording.value && !holding.value)
/** The polite live region's sentence: locked, thrown away, too short. */
const announcement = ref('')
/** The trash, shown for a moment where the field will come back. */
const discarding = ref(false)
const motion = ref(true)
let discardTimer: ReturnType<typeof setTimeout> | undefined
let clickTimer: ReturnType<typeof setTimeout> | undefined
/** The pointer's own click (after a hold or a slide) is not a tap. */
let swallowClick = false
let captured = false

/** The microphone is recording: before that the permission sheet may be up. */
const live = () => recorder.state.value === 'recording' || recorder.state.value === 'stopped'

function dispatch(event: HoldEvent) {
  const step = holdStep(hold.value, event)
  hold.value = step.state
  for (const effect of step.effects) perform(effect)
}

function perform(effect: HoldEffect) {
  if (effect.type === 'start') void begin()
  else if (effect.type === 'send') void sendVoice()
  else if (effect.type === 'lock') {
    // A tap is today's behaviour, and the status line says it. The others say what happened.
    if (effect.how === 'tap') return
    announcement.value = chat.value.voice.locked
  } else if (effect.type === 'haptic') {
    if (props.haptics) voiceHaptic(effect.kind)
  } else {
    recorder.cancel()
    discarded(effect.why)
  }
}

/** Starts the recorder in the press's own turn; if the finger is gone by the time the microphone is there, it is a tap. */
async function begin() {
  const problem = await startVoice()
  if (problem || hold.value.phase !== 'holding') return
  const id = hold.value.pointerId
  if (captured && id !== null && !mic.value?.hasPointerCapture(id)) dispatch({ type: 'pointercancel', pointerId: id, live: false })
}

function discarded(why: DiscardWhy) {
  announcement.value = why === 'short' ? chat.value.voice.tooShort : chat.value.voice.discarded
  if (why === 'hidden') return
  discarding.value = true
  clearTimeout(discardTimer)
  discardTimer = setTimeout(() => {
    discarding.value = false
    void nextTick(grow)
  }, DISCARD_MS)
}

const mic = ref<HTMLButtonElement | null>(null)

function onPointerDown(event: PointerEvent) {
  if (!props.voiceHold || recording.value || !event.isPrimary) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const el = event.currentTarget as HTMLButtonElement
  swallowClick = true
  clearTimeout(clickTimer)
  announcement.value = ''
  discarding.value = false
  motion.value = !prefersReducedMotion()
  try {
    el.setPointerCapture(event.pointerId)
    captured = true
  } catch {
    captured = false
  }
  dispatch({
    type: 'press',
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    at: performance.now(),
    rtl: getComputedStyle(el).direction === 'rtl',
  })
}

function onPointerMove(event: PointerEvent) {
  if (hold.value.phase !== 'holding') return
  dispatch({ type: 'move', pointerId: event.pointerId, x: event.clientX, y: event.clientY })
}

function pointerOver(event: PointerEvent) {
  captured = false
  try {
    mic.value?.releasePointerCapture(event.pointerId)
  } catch {
    // Not captured (or already gone).
  }
  // The click that follows a pointerup comes at once; a stale flag must not eat a later keyboard activation.
  clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    swallowClick = false
  }, 400)
}

function onPointerUp(event: PointerEvent) {
  if (hold.value.phase !== 'holding') return
  dispatch({ type: 'release', pointerId: event.pointerId, at: performance.now(), live: live() })
  pointerOver(event)
}

function onPointerCancel(event: PointerEvent) {
  if (hold.value.phase !== 'holding') return
  dispatch({ type: 'pointercancel', pointerId: event.pointerId, live: live() })
  pointerOver(event)
}

/** The capture was taken away without a `pointerup` (the permission sheet, the element going): the same as a cancel. */
function onLostCapture(event: PointerEvent) {
  if (hold.value.phase !== 'holding') return
  dispatch({ type: 'pointercancel', pointerId: event.pointerId, live: live() })
  pointerOver(event)
}

/** A plain activation: Enter or Space, VoiceOver's double tap, a click with `voiceHold` off. It records hands-free. */
function onRecordClick() {
  if (swallowClick) {
    swallowClick = false
    return
  }
  if (recording.value) return
  announcement.value = ''
  dispatch({ type: 'tap' })
}

function onRecordKey() {
  swallowClick = false
}

function onHidden() {
  if (document.visibilityState === 'hidden') dispatch({ type: 'hidden' })
}
function onBlur() {
  dispatch({ type: 'blur', live: live() })
}
function watchPage(on: boolean) {
  const toggle = on ? 'addEventListener' : 'removeEventListener'
  document[toggle]('visibilitychange', onHidden)
  window[toggle]('pagehide', onHidden)
  window[toggle]('blur', onBlur)
}
watch(
  () => hold.value.phase === 'holding',
  (now) => {
    watchPage(now)
    // Locked by the slide, the microphone leaves the page with the pointer's own click unsent: do not keep the flag.
    if (!now) {
      clearTimeout(clickTimer)
      clickTimer = setTimeout(() => {
        swallowClick = false
      }, 400)
    }
  },
)
onBeforeUnmount(() => {
  watchPage(false)
  clearTimeout(discardTimer)
  clearTimeout(clickTimer)
})

/** The hint fades as the thumb goes towards the start side, and (with motion) shifts a little with it (22 px at most). */
const hintStyle = computed(() => {
  const state = hold.value
  const along = motion.value ? Math.min(state.cancel, HOLD_CANCEL_PX) * 0.25 * (state.rtl ? 1 : -1) : 0
  return { opacity: 1 - cancelProgress(state), transform: `translateX(${along}px)` }
})
/** The lock mark rises with the thumb. */
const lockStyle = computed(() => {
  const progress = lockProgress(hold.value)
  return { opacity: 0.55 + progress * 0.45, transform: `translateY(${motion.value ? -progress * 24 : 0}px)` }
})
/** The microphone, a little larger while it is held, goes with the thumb (not with reduced motion). */
const micStyle = computed(() => {
  if (!holding.value) return undefined
  const state = hold.value
  const x = motion.value ? Math.min(state.cancel, FOLLOW_PX) * (state.rtl ? 1 : -1) : 0
  const y = motion.value ? -Math.min(state.lift, HOLD_LOCK_PX) : 0
  return { transform: `translate(${x}px, ${y}px) scale(1.3)` }
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
    <!-- Locked, thrown away, too short: said politely, by a region that is always there (one that appears with its words is often missed). -->
    <p v-if="voiceOffered" class="sr-only" role="status" aria-live="polite" :data-testid="`${testid}.voiceAnnounce`">{{ announcement }}</p>
    <!-- The ways of sending something that is not words, floating above the field. -->
    <div
      v-if="compact && (note || photoAccept || gifs || $slots.actions)"
      class="actions"
      :data-folded="(!note && focused) || undefined"
      :inert="(!note && focused) || undefined"
      :data-testid="`${testid}.actions`"
    >
      <div ref="chips" class="actions-row flex flex-wrap gap-sm" role="toolbar" :aria-label="chat.composer.actions" @keydown="chipKeys.onKeydown" @focusin="chipKeys.onFocusin">
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
      <div ref="chips" class="actions-row flex flex-wrap gap-sm" role="toolbar" :aria-label="chat.composer.actions" @keydown="chipKeys.onKeydown" @focusin="chipKeys.onFocusin">
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
      <!-- Recording. Held: the timer with its dot, the live bars, "Slide to cancel". Locked, or by a tap: ✕, the live bars, the timer, send. -->
      <div
        v-if="recording"
        class="flex min-w-0 flex-1 items-center gap-sm"
        :class="holding ? 'hold-row' : ''"
        role="group"
        :aria-label="chat.voice.recording"
        :data-testid="`${testid}.recorder`"
        :data-hold="holding || undefined"
      >
        <button
          v-if="panel"
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
        <span class="flex shrink-0 items-center gap-xs" :class="holding ? 'order-first' : ''">
          <span v-if="holding" class="dot pulse" aria-hidden="true" :data-testid="`${testid}.holdDot`" />
          <time class="figures shrink-0 text-body text-ink tabular-nums" role="timer" :aria-label="fillWords(chat.voice.timer, { elapsed: timer, max: clock((voiceMaxMs ?? 0) / 1000) })" :data-testid="`${testid}.voiceTimer`" :data-ms="Math.round(recorder.elapsedMs.value)">
            {{ timer }}
          </time>
        </span>
        <span
          v-if="holding"
          class="hint me-xs flex shrink-0 items-center gap-xxs text-caption text-ink-muted"
          aria-hidden="true"
          :style="hintStyle"
          :data-testid="`${testid}.holdHint`"
        >
          <UiIcon name="chevron" :size="14" :class="hold.rtl ? '' : 'rotate-180'" />
          {{ chat.voice.slideToCancel }}
        </span>
        <button
          v-if="panel"
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
      <!-- A recording thrown away: the trash, for a moment, where the field comes back. -->
      <div v-if="discarding && !recording" class="trash flex h-(--size-button-md) min-w-0 flex-1 items-center text-error" aria-hidden="true" :data-testid="`${testid}.holdTrash`">
        <UiIcon name="trash" :size="20" />
      </div>
      <label v-if="!recording && !discarding" :for="`${testid}-input`" class="sr-only">{{ labelText }}</label>
      <textarea
        v-if="!recording && !discarding"
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
      <!-- Nothing to send yet: the microphone takes its place. Held, it stays (it owns the pointer) and the
           lock mark stands over it; locked, the panel takes its place. -->
      <span v-else-if="(!recording || holding) && !compact && voiceOffered" class="mic relative flex size-(--size-button-md) shrink-0">
        <span
          v-if="hold.phase === 'holding'"
          class="lock glass edge pointer-events-none absolute flex flex-col items-center gap-xxs rounded-pill py-xs text-ink-muted"
          aria-hidden="true"
          :style="lockStyle"
          :data-testid="`${testid}.holdLock`"
        >
          <UiIcon name="lock" :size="16" />
          <UiIcon name="chevron" :size="14" class="-rotate-90" />
        </span>
        <span v-if="voiceHold" :id="`${testid}-recordHint`" class="sr-only">{{ chat.voice.recordHint }}</span>
        <button
          ref="mic"
          type="button"
          class="send flex size-full items-center justify-center rounded-pill text-ink-muted"
          :class="voiceHold ? 'holdable' : ''"
          :style="micStyle"
          :aria-label="chat.voice.record"
          :aria-describedby="voiceHold ? `${testid}-recordHint` : undefined"
          :data-testid="`${testid}.record`"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
          @lostpointercapture="onLostCapture"
          @contextmenu.prevent
          @keydown="onRecordKey"
          @click="onRecordClick"
        >
          <UiIcon name="mic" :size="20" />
        </button>
      </span>
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
  inset: calc((14px - var(--size-touch)) / 2);
  content: '';
}
.note-close:focus-visible {
  outline: var(--stroke-focus) solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-pill);
}
/* The held microphone: the pointer is the button's, so the page's own gestures (scroll, zoom, text
   selection, the iPhone's long-press callout and context menu) must have nothing to do on it. */
.holdable {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
.hold-row {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.mic > .send {
  /* Over the lock mark and the hint while it goes with the thumb. */
  position: relative;
  z-index: 1;
}
.mic > .send[style] {
  background-color: var(--color-glass);
  box-shadow: var(--shadow-button);
  color: var(--color-ink);
}
.lock {
  inset-inline-end: 0;
  bottom: calc(100% + var(--spacing-sm));
  width: var(--size-button-md);
  background-color: var(--color-glass);
  box-shadow: var(--shadow-palette);
}
@media (prefers-reduced-motion: no-preference) {
  .mic > .send[style],
  .lock,
  .hint {
    transition: opacity 80ms linear;
  }
  .pulse {
    animation: pulse 1.1s var(--ease-standard) infinite;
  }
  .trash {
    animation: trash-in var(--duration-quick) var(--ease-standard) both;
  }
}
@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}
@keyframes trash-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
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
