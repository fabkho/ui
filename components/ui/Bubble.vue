<script setup lang="ts">
import UiIcon from './Icon.vue'
import UiQuote from './Quote.vue'
import UiReactionBar from './ReactionBar.vue'
import UiVoiceBubble from './VoiceBubble.vue'
import { useUiText } from '../../composables/useUiText'
import { tick } from '../../utils/haptics'
import { canStartSwipe, gestureAxis, replyArmed, replyProgress, replyTravel } from '../../utils/chat/reply'
import { clockTime } from '../../utils/chat/timeline'
import { mediaBox, reactionsLabel, type BubbleMessage, type BubbleQuote } from '../../utils/chat/message'

// One message of the thread (moved from Bookretreats' `ChatMessage.vue`, unchanged in look and
// behaviour). Hers is a raised paper card on the left (`surface-raised`, a hairline edge,
// `shadow-raised`, `body` in ink); mine is ink with `on-ink` type on the right; both 78 % wide at
// most, radius `lg`. The corner towards the speaker's side is small (`tail`) on the last message of a
// run only (`endsRun`, the thread decides), the earlier ones stay round. A photo or GIF is the card's
// content: the image fills the same shape (hers keeps the hairline over the picture). A voice message
// is UiVoiceBubble. Any other kind (Bookretreats' shared phone number) is the app's: it draws it in
// the `body` slot (`wide` for a card as wide as a voice message). A system line is not a bubble: the
// app draws it outside. The time shows on a long press only.
//
// Slots over defaults that stand alone: `sender` (the name over the first bubble of a run: `sender`
// when `signed`), `body` (the bubble's content), `quote` (the answered message on top, UiQuote),
// `reactions` (the pill on the corner) and `meta` (the time and the marks under the bubble). Each
// gets what it needs as slot props.
//
// Mine on its way is a touch lighter; held up long enough, "Sending …" shows under it. Mine that did
// not go out sends again on a tap: the bubble, or the reason under it, which is the named button.
// "Read" goes under my last message once she has read it (the thread decides which: `read`).
//
// Reactions: a long press on a stored message opens the reaction bar (UiReactionBar, the app's
// `emojis`) over it (`reacting`, the thread keeps one open at a time and says whether it fits above,
// `placement`); a right click does the same with a mouse. Nothing under the bubble moves for it (the
// time stays the long press's on a message still on its way). Without a long press: the "React"
// button after the bubble, out of sight until it has the focus (VoiceOver, Switch Control, a
// keyboard), and the pill itself. The pill sits on the bubble's inner lower corner: the emoji, a 2
// when both chose the same.
//
// Answering one message (as in WhatsApp): a finger on a bubble that goes clearly right pulls the
// bubble along and shows the reply arrow at the left of the row; past 60 px a light tick says it will
// answer, and letting go there does (utils/chat/reply.ts holds the numbers). Only a clearly
// horizontal finger is looked at, and never one that starts in the left 20 px (the browser's back
// swipe, iOS's edge): the chat's scroll never turns into a reply. The press is the swipe's once it is
// horizontal, so no reaction bar opens under it, and the click that ends a swipe is not a tap on the
// bubble. A mouse never swipes (a drag with one selects text), it uses the "Reply" entry in the bar.
// A clearly horizontal touch move is taken from the browser (`keepSwipe`), so WebKit cannot read the
// drag as a pan and take the gesture back; a vertical one is never touched, and the thread scrolls as
// it always did.
//
// The quote of the message this one answers sits on top of its bubble (UiQuote), and a tap on it
// jumps to the original (`quoteTap`; UiChatThread's `jumpTo`), which lights up for a moment
// (`highlight`).
//
// Double tap (a double click with a mouse) on a bubble puts my like (`like`, ❤️) on it, or takes it
// back when it is there: the same path as the bar's (`react`), on hers and on mine, only on a message
// she may react to. A short heart pops on the bubble (`heart-pop`) with a haptic tick. Taps are
// counted on `click`, so a finger and a mouse go the same way; a single tap on text waits for nothing.
// A photo or GIF opens full screen on a single tap as before, but where it can be liked it waits one
// double-tap window for a second tap first. A link, a button (in the `body` slot) or the pill is never
// a like. A second mouse press does not select a word under the bubble.
const props = withDefaults(
  defineProps<{
    item: BubbleMessage
    read: boolean
    fresh: boolean
    /** The first of a run: the sender's name (`sender`) stands above the bubble. */
    signed?: boolean
    /** Who wrote it, above the first bubble of a run (`signed`); null: no name (1:1, as today). */
    sender?: string | null
    /** The last message of a run from the same person: only it has the small corner. */
    endsRun?: boolean
    /** She may react here (a stored message, not a system line, nobody departed). */
    canReact?: boolean
    /** The emoji of the reaction bar, in its order (the app's set). */
    emojis?: readonly string[]
    /** What a double tap puts on the bubble (and takes back): the like. */
    like?: string
    /** The message this one answers, or null: the quote on top of the bubble. */
    quote?: BubbleQuote | null
    /** The chat just jumped here from this bubble's quote: the bubble lights up for a moment. */
    highlight?: boolean
    reacting?: boolean
    placement?: 'above' | 'below'
    /** The `body` slot draws a card as wide as a voice message (78 %), not as wide as its words. */
    wide?: boolean
    /** The test ids' start: `chat` → `chat.message`, `chat.bubble`, … */
    testid?: string
  }>(),
  {
    signed: false,
    sender: null,
    endsRun: true,
    canReact: false,
    emojis: () => ['❤️', '😂', '😮', '😢', '🔥'],
    like: '❤️',
    reacting: false,
    placement: 'above',
    quote: null,
    highlight: false,
    wide: false,
    testid: 'chat',
  },
)
const emit = defineEmits<{
  retry: [key: string]
  open: [item: BubbleMessage]
  reactOpen: [key: string, element: HTMLElement]
  reactClose: []
  react: [messageId: string, emoji: string]
  /** She answered this message (the swipe, or the bar's entry): the composer quotes it. */
  reply: [key: string]
  /** A tap on the bubble's quote: find that message and light it up. */
  quoteTap: [id: string]
  /** A picture did not load (its signed URL has run out): the thread asks for a new one. */
  mediaFailed: [path: string]
}>()
const uiText = useUiText()
const chat = computed(() => uiText.value.chat)

// A picture keeps its shape before it loads (`mediaBox`).
const mediaStyle = computed(() => (props.item.media ? mediaBox(props.item.media) : undefined))
const mediaLabel = computed(() => {
  const media = chat.value.media
  const mine = props.item.mine
  return props.item.media?.kind === 'gif' ? (mine ? media.gifMine : media.gif) : mine ? media.photoMine : media.photo
})
// The small corner towards the speaker's side, on the last message of a run.
const tail = computed(() => (props.endsRun ? (props.item.mine ? 'rounded-br-tail' : 'rounded-bl-tail') : ''))
const broken = ref(false)
watch(() => props.item.media?.url, () => (broken.value = false))

/**
 * „Bild gerade nicht verfügbar“: this picture is not on the screen. Either the browser just refused the URL
 * it had (`broken`, until a new URL arrives) or the thread could not sign another one — the file is gone, or
 * signing failed (`media.unavailable`, the app's store). The second one must not fall back to the loading
 * placeholder: nothing is coming.
 */
const unavailable = computed(() => broken.value || props.item.media?.unavailable === true)

/**
 * A picture did not load: the URL it was signed from has run out (they live fifteen minutes; 14 chat
 * photos came back as 400 in the audit of 2026-10-14). The bubble says „nicht verfügbar“ and the thread
 * asks for a new URL — `item.media.url` changes when it is there, and the watch above takes the sentence
 * away again. When the thread does not bring one back, the store keeps the picture unavailable and the
 * sentence stays, which is the truth.
 */
function mediaFailed() {
  broken.value = true
  const path = props.item.media?.path
  if (path) emit('mediaFailed', path)
}

function tapMedia(event: Event) {
  if (swallowAfterPress(event)) return
  if (failed.value) return emit('retry', props.item.key)
  if (!props.item.media?.url || unavailable.value) return
  if (!reactable.value) return emit('open', props.item)
  // A second tap inside the window is a like; without one the picture opens.
  if (registerTap()) return clearTimeout(openTimer)
  clearTimeout(openTimer)
  openTimer = setTimeout(() => emit('open', props.item), DOUBLE_TAP_MS)
}

/** A voice message that is still there (one whose sender left is the "entfernt" line instead). */
const isVoice = computed(() => props.item.kind === 'media' && props.item.media?.kind === 'voice' && !props.item.media.removed)
const voiceBubble = ref<{ toggle: () => void } | null>(null)

/**
 * The play button's tap: counted like a tap on a picture. A failed message sends again; a second tap
 * inside the double-tap window likes (the sound goes on); anything else plays or pauses.
 */
function tapVoice(event: Event) {
  if (swallowAfterPress(event)) return
  if (failed.value) return emit('retry', props.item.key)
  if (registerTap()) return
  voiceBubble.value?.toggle()
}

const at = computed(() => new Date(props.item.createdAt))
const time = computed(() => clockTime(at.value))

const failed = computed(() => props.item.delivery === 'failed')
const failedText = computed(() => (props.item.error ? `${props.item.error} ${chat.value.retryHint}` : chat.value.failed))

// "Wird gesendet …" only once a send is taking a while, so a quick one never flickers.
const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.item.delivery,
  (delivery) => {
    clearTimeout(slowTimer)
    slow.value = false
    if (delivery === 'sending') slowTimer = setTimeout(() => (slow.value = true), 1_500)
  },
  { immediate: true },
)

// Long press: the reaction bar over a stored message; on one still on its way,
// the time under the bubble until the next long press.
const showTime = ref(false)
const reactable = computed(() => props.canReact && !!props.item.id && props.item.delivery === 'sent')
const holder = ref<HTMLElement | null>(null)
let pressTimer: ReturnType<typeof setTimeout> | undefined
/** When the last long press fired: the click that ends it is not a tap on the bubble. */
let pressedAt = 0
function pressStart(event: PointerEvent) {
  if (event.button > 0) return
  clearTimeout(pressTimer)
  pressedAt = 0
  swipeStart(event)
  pressTimer = setTimeout(() => {
    pressedAt = Date.now()
    if (reactable.value) openBar('press')
    else showTime.value = !showTime.value
  }, 450)
}

/** Where the finger is, and whether it has decided which way it is going. */
let swipe: { id: number; x: number; y: number; axis: 'none' | 'horizontal' | 'vertical'; ticked: boolean } | null = null

/**
 * Locks the gesture's direction the first time either handler sees enough of it, and takes a
 * clearly rightward one for the swipe: the long press is off (no bar under a finger that is
 * answering) and the moves stay the bubble's (a captured pointer is not cancelled with the
 * gesture). Answers whether this gesture is the swipe's. One place decides, so the touch handler
 * (`keepSwipe`) and the pointer handler cannot disagree about it.
 */
function takeGesture(gesture: NonNullable<typeof swipe>, dx: number, dy: number): boolean {
  if (gesture.axis === 'none') {
    gesture.axis = gestureAxis(dx, dy)
    if (gesture.axis !== 'horizontal') return false
    clearTimeout(pressTimer)
    try {
      holder.value?.setPointerCapture(gesture.id)
    } catch {
      // No capture (a browser that refuses it): the bubble follows the finger as far as it is one.
    }
  }
  return gesture.axis === 'horizontal'
}
/** How far the bubble has been pulled right (px) and how far the arrow has come (0 - 1). */
const dragX = ref(0)
const arrowAt = ref(0)
/** Past the threshold: the arrow says so in the accent, and letting go answers. */
const arrowArmed = ref(false)
/** When the last swipe ended: the click that ends it is not a tap on the bubble. */
let swipedAt = 0

function swipeStart(event: PointerEvent) {
  // A mouse drag selects text, it never answers; and the left edge belongs to the back swipe.
  if (event.pointerType === 'mouse' || !reactable.value || !canStartSwipe(event.clientX)) return
  swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: 'none', ticked: false }
}

/**
 * The touch move under a clearly horizontal finger is the swipe's, not the browser's: without
 * this, WebKit reads the drag as a pan, stops sending moves and cancels the pointer
 * (`pointercancel`), and the gesture would only work where the browser happens to let it. Only a
 * horizontal move is taken (a vertical one scrolls the thread, as before), and only while a
 * finger that may answer is down. The listener is not passive on purpose (a passive one may not
 * prevent anything); it does no work at all outside a swipe.
 */
function keepSwipe(event: TouchEvent) {
  const gesture = swipe
  const touch = event.touches[0]
  if (!gesture || !touch || !event.cancelable) return
  if (!takeGesture(gesture, touch.clientX - gesture.x, touch.clientY - gesture.y)) return
  event.preventDefault()
}

function swipeMove(event: PointerEvent) {
  const gesture = swipe
  if (!gesture || gesture.id !== event.pointerId) return
  const dx = event.clientX - gesture.x
  const dy = event.clientY - gesture.y
  if (!takeGesture(gesture, dx, dy)) {
    // The thread's gesture after all (a scroll, or a finger that went left): the swipe is over.
    if (gesture.axis === 'vertical') swipeEnd()
    return
  }
  dragX.value = replyTravel(dx)
  arrowAt.value = replyProgress(dx)
  arrowArmed.value = replyArmed(dx)
  if (!gesture.ticked && arrowArmed.value) {
    gesture.ticked = true
    tick()
  }
}

/** The finger let go, was cancelled or left the bubble: the press and the swipe both end. */
function endPointer(event: PointerEvent) {
  pressEnd()
  swipeEnd(event)
}

/** The finger let go, or the browser took the gesture: past the threshold it answers. */
function swipeEnd(event?: PointerEvent) {
  const gesture = swipe
  if (!gesture || (event && gesture.id !== event.pointerId)) return
  const armed = gesture.axis === 'horizontal' && arrowArmed.value
  swipe = null
  // Only the swipe's own gesture swallows the click that follows it; a scroll that started on the
  // bubble is the thread's, and the tap that ends it (or the next one) is a tap.
  if (gesture.axis === 'horizontal') swipedAt = Date.now()
  dragX.value = 0
  arrowAt.value = 0
  arrowArmed.value = false
  if (armed) {
    emit('reactClose')
    emit('reply', props.item.key)
  }
}
function pressEnd() {
  clearTimeout(pressTimer)
}

// Double tap: a second tap within the window likes (or un-likes) with ❤️.
const DOUBLE_TAP_MS = 300
let lastTapAt = 0
let openTimer: ReturnType<typeof setTimeout> | undefined
const pop = ref(0)
/** Counts a tap; true when it was the second of a double tap (and has liked). */
function registerTap(): boolean {
  const now = Date.now()
  if (!reactable.value || now - lastTapAt > DOUBLE_TAP_MS) {
    lastTapAt = now
    return false
  }
  lastTapAt = 0
  const adding = props.item.myReaction !== props.like
  if (props.item.id) emit('react', props.item.id, props.like)
  if (adding) {
    tick()
    pop.value++
  }
  return true
}
function onHolderClick(event: MouseEvent) {
  if (swallowAfterPress(event)) return
  if (failed.value && (props.item.kind === 'text' || isVoice.value)) return emit('retry', props.item.key)
  // Links and buttons (the phone card's) keep their own tap.
  if ((event.target as HTMLElement | null)?.closest('a, button')) return
  registerTap()
}
function onMouseDown(event: MouseEvent) {
  // The second press of a double click would select the word under it.
  if (event.detail > 1 && reactable.value) event.preventDefault()
}
function swallowAfterPress(event: Event) {
  const after = (pressedAt > 0 && Date.now() - pressedAt < 1_000) || (swipedAt > 0 && Date.now() - swipedAt < 1_000)
  pressedAt = 0
  swipedAt = 0
  if (!after) return false
  event.stopPropagation()
  event.preventDefault()
  return true
}

/** How the bar was opened: by a press (focus goes nowhere after), or a button (focus comes back to it). */
const openedBy = ref<'press' | 'button'>('press')
const reactButton = ref<HTMLButtonElement | null>(null)
function openBar(by: 'press' | 'button') {
  if (!reactable.value || !holder.value) return
  openedBy.value = by
  if (by === 'press') tick()
  emit('reactOpen', props.item.key, holder.value)
}
function onContextMenu() {
  // A right click (or Android's long press, which fires it too).
  if (reactable.value && !props.reacting) openBar('press')
}
watch(
  () => props.reacting,
  (open, was) => {
    if (open || !was) return
    if (openedBy.value === 'button') void nextTick(() => reactButton.value?.focus({ preventScroll: true }))
  },
)
function pick(emoji: string) {
  if (props.item.id) emit('react', props.item.id, emoji)
  emit('reactClose')
}

/** The bar's "Reply": the way without a swipe (a keyboard, VoiceOver, a mouse). */
function answer() {
  // Opened by its button, the bar hands the focus back to it (the watcher on `reacting`); the
  // answer takes it to the field instead, so the bar counts as one opened by a press.
  openedBy.value = 'press'
  emit('reactClose')
  emit('reply', props.item.key)
}

/**
 * A tap on the quote inside a bubble: the chat jumps to the message it names. A click that ends a
 * long press (the bar opened over the bubble) or a swipe is not that tap.
 */
function tapQuote(id: string, event: Event) {
  if (swallowAfterPress(event)) return
  emit('quoteTap', id)
}

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copyText() {
  emit('reactClose')
  try {
    await navigator.clipboard.writeText(props.item.body)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 1_500)
  } catch {
    // Nothing to say: the text stays selectable with a mouse.
  }
}

function openFromPill(event: Event) {
  if (!swallowAfterPress(event)) openBar('button')
}
const pillEmoji = computed(() => props.item.reactions.map((r) => r.emoji).join(''))

/** What the pill says to VoiceOver: each emoji and whose it is. */
const pillLabel = computed(() => reactionsLabel(props.item.reactions, chat.value.reactions))

onBeforeUnmount(() => {
  clearTimeout(slowTimer)
  clearTimeout(pressTimer)
  clearTimeout(copiedTimer)
  clearTimeout(openTimer)
})

const entrance = computed(() => (props.fresh ? (props.item.mine ? 'chat-arrive-own' : 'chat-arrive') : ''))
</script>

<template>
  <div
    class="flex flex-col"
    :class="[item.mine ? 'items-end' : 'items-start', entrance]"
    :data-testid="`${testid}.message`"
    :data-mine="item.mine || undefined"
    :data-delivery="item.delivery"
    :data-kind="item.kind"
    :data-key="item.key"
    :data-id="item.id || undefined"
    :data-highlight="highlight || undefined"
  >
    <!-- Who wrote it, over the first bubble of a run. -->
    <slot name="sender" :signed="signed" :sender="sender">
      <p v-if="signed && sender" class="px-xs pb-xs text-caption text-ink-faint" :data-testid="`${testid}.sender`">
        {{ sender }}
      </p>
    </slot>
    <div class="relative flex w-full" :class="item.mine ? 'justify-end' : 'justify-start'">
      <!-- The reply arrow, at the left of the row: it comes with the finger and lights in the
           accent once letting go would answer. It only ever shows during a gesture. -->
      <span
        class="reply-arrow pointer-events-none absolute left-0 top-1/2 flex size-(--size-button-md) items-center justify-center"
        :class="arrowArmed ? 'text-accent' : 'text-ink-faint'"
        :style="{ opacity: arrowAt, scale: `${(0.7 + 0.3 * arrowAt).toFixed(2)}` }"
        aria-hidden="true"
        :data-testid="`${testid}.replyArrow`"
      >
        <UiIcon name="reply" :size="20" />
      </span>
      <div
        ref="holder"
        class="holder relative max-w-[78%]"
        :class="[
          wide || isVoice ? 'w-[78%]' : '',
          item.delivery === 'sending' ? 'opacity-70' : '',
          failed ? 'cursor-pointer' : '',
          item.reactions.length ? 'mb-ms' : '',
          highlight ? 'quote-flash rounded-lg' : '',
        ]"
        :style="dragX ? { translate: `${dragX}px 0` } : undefined"
        :data-dragging="dragX || undefined"
        :data-reacting="reacting || undefined"
        @click="onHolderClick"
        @mousedown="onMouseDown"
        @pointerdown="pressStart"
        @pointermove="swipeMove"
        @touchmove="keepSwipe"
        @pointerup="endPointer"
        @pointercancel="endPointer"
        @pointerleave="endPointer"
        @contextmenu.prevent="onContextMenu"
      >
        <!-- The reaction bar, over the bubble (under it when the bubble is near the top). -->
        <Transition name="chat-react">
          <UiReactionBar
            v-if="reacting"
            class="absolute z-10"
            :class="[
              placement === 'above' ? 'bottom-full mb-xs origin-bottom' : 'top-full mt-xs origin-top',
              item.mine ? 'right-0' : 'left-0',
            ]"
            :emojis="emojis"
            :testid="testid"
            :current="item.myReaction"
            :focus-on-open="openedBy === 'button'"
            :copyable="item.kind === 'text'"
            :replyable="reactable"
            @pick="pick"
            @copy="copyText"
            @reply="answer"
            @close="emit('reactClose')"
            @click.stop
            @pointerdown.stop
          />
        </Transition>
        <!-- The app's own kinds (Bookretreats' phone card): the slot draws the whole card, the quote
             in it with `tapQuote`. -->
        <slot name="body" :item="item" :tail="tail" :quote="quote" :tap-quote="tapQuote">
          <!-- A picture: gone with its sender, or the image (tap: full screen). -->
          <div
            v-if="item.kind === 'media' && item.media?.removed"
            class="rounded-lg bg-fill px-md py-sm text-caption text-ink-faint italic"
            :class="tail"
            :data-testid="`${testid}.mediaRemoved`"
          >
            <!-- A quiet `fill` ground, hers and mine alike: no on-ink type here either. -->
            <slot name="quote" :quote="quote" :mine="false" :tap="tapQuote">
              <UiQuote v-if="quote" class="mb-xs not-italic" :quote="quote" :testid="testid" @tap="tapQuote" />
            </slot>
            {{ item.media.kind === 'voice' ? chat.voice.bubble.removed : item.media.kind === 'gif' ? chat.media.gifRemoved : chat.media.photoRemoved }}
          </div>
          <!-- A voice message: play, waveform, time (tap: plays; a second tap within the window likes). -->
          <UiVoiceBubble v-else-if="isVoice" ref="voiceBubble" :item="item" :tail="tail" :testid="testid" @press="tapVoice">
            <template #quote>
              <slot name="quote" :quote="quote" :mine="item.mine" :tap="tapQuote">
                <UiQuote v-if="quote" class="m-xs" :quote="quote" :mine="item.mine" :testid="testid" @tap="tapQuote" />
              </slot>
            </template>
          </UiVoiceBubble>
          <div
            v-else-if="item.kind === 'media' && item.media"
            class="relative w-fit overflow-hidden rounded-lg bg-fill"
            :class="[tail, item.mine ? 'bg-ink' : 'media-hers shadow-raised']"
          >
            <slot name="quote" :quote="quote" :mine="item.mine" :tap="tapQuote">
              <UiQuote v-if="quote" class="m-xs" :quote="quote" :mine="item.mine" :testid="testid" @tap="tapQuote" />
            </slot>
            <button
              type="button"
              class="relative block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              :style="mediaStyle"
              :aria-label="`${mediaLabel}. ${chat.media.open}`"
              :data-testid="`${testid}.media`"
              :data-media-kind="item.media.kind"
              :data-loaded="(!!item.media.url && !unavailable) || undefined"
              @click.stop="tapMedia"
            >
              <img
                v-if="item.media.url && !unavailable"
                :src="item.media.url"
                :alt="mediaLabel"
                class="size-full object-cover"
                draggable="false"
                loading="lazy"
                decoding="async"
                :data-testid="`${testid}.mediaImage`"
                @error="mediaFailed"
              />
              <span v-else-if="unavailable" class="flex size-full items-center justify-center px-sm text-center text-caption text-ink-faint">
                {{ chat.media.unavailable }}
              </span>
              <span v-else class="sr-only" role="status">{{ chat.media.loading }}</span>
            </button>
          </div>
          <div
            v-else
            class="rounded-lg px-inset py-sm text-body"
            :class="[tail, item.mine ? 'bg-ink text-on-ink' : 'edge bg-surface-raised text-ink shadow-raised']"
            :data-testid="`${testid}.bubble`"
          >
            <slot name="quote" :quote="quote" :mine="item.mine" :tap="tapQuote">
              <UiQuote v-if="quote" class="mb-xs" :quote="quote" :mine="item.mine" :testid="testid" @tap="tapQuote" />
            </slot>
            <span class="block break-words whitespace-pre-wrap">{{ item.body }}</span>
          </div>
        </slot>

        <!-- A double tap: a heart pops over the bubble and is gone. -->
        <span
          v-if="pop"
          :key="pop"
          class="heart-pop pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-large-title"
          aria-hidden="true"
          :data-testid="`${testid}.heartPop`"
          @animationend="pop = 0"
        >
          {{ like }}
        </span>

        <!-- Who reacted with what, on the bubble's inner lower corner. A tap opens the bar. -->
        <slot name="reactions" :reactions="item.reactions" :label="pillLabel" :open="openFromPill">
        <Transition name="chat-pill">
          <button
            v-if="item.reactions.length && reactable"
            type="button"
            class="pill edge absolute bottom-0 flex items-center gap-xxs rounded-pill bg-surface-raised px-xs shadow-raised"
            :class="item.mine ? 'left-sm' : 'right-sm'"
            :aria-label="pillLabel"
            :data-testid="`${testid}.reactions`"
            :data-emoji="pillEmoji"
            @click.stop="openFromPill"
            @pointerdown.stop
          >
            <span v-for="r in item.reactions" :key="r.emoji" class="flex items-center" aria-hidden="true">
              <span class="pill-emoji">{{ r.emoji }}</span>
              <span v-if="r.count > 1" class="figures pl-xxs text-meta text-ink-muted">{{ r.count }}</span>
            </span>
          </button>
          <span
            v-else-if="item.reactions.length"
            role="img"
            class="pill edge absolute bottom-0 flex items-center gap-xxs rounded-pill bg-surface-raised px-xs shadow-raised"
            :class="item.mine ? 'left-sm' : 'right-sm'"
            :aria-label="pillLabel"
            :data-testid="`${testid}.reactions`"
            :data-emoji="pillEmoji"
          >
            <span v-for="r in item.reactions" :key="r.emoji" class="flex items-center" aria-hidden="true">
              <span class="pill-emoji">{{ r.emoji }}</span>
              <span v-if="r.count > 1" class="figures pl-xxs text-meta text-ink-muted">{{ r.count }}</span>
            </span>
          </span>
        </Transition>
        </slot>

        <!-- "React" without a long press: out of sight until it has the focus, then a
             small raised pill under the bubble (over what is there, so nothing moves). -->
        <button
          v-if="reactable"
          ref="reactButton"
          type="button"
          class="react-button sr-only"
          :class="item.mine ? 'right-0' : 'left-0'"
          :data-testid="`${testid}.react`"
          :aria-expanded="reacting"
          @click.stop="openBar('button')"
          @pointerdown.stop
        >
          {{ chat.reactions.open }}
        </button>
      </div>
    </div>

    <!-- The marks under the bubble: the time (a long press), "Copied", why it failed (the named retry
         button), "Sending …", "Read". -->
    <slot name="meta" :item="item" :time="time" :show-time="showTime" :failed="failed" :sending="item.delivery === 'sending' && slow" :read="read">
      <p v-if="copied" class="px-xs pt-xs text-caption text-ink-faint" role="status" :data-testid="`${testid}.copied`">
        {{ chat.reactions.copied }}
      </p>

      <time
        :datetime="item.createdAt"
        class="mark px-xs pt-xs text-caption text-ink-faint tabular-nums"
        :class="showTime ? '' : 'sr-only'"
        :data-testid="`${testid}.time`"
      >
        {{ time }}
      </time>
      <!-- The bubble takes the tap too; this is the named button (and the only one under a card). -->
      <button
        v-if="failed"
        type="button"
        class="min-h-(--size-touch) max-w-[78%] px-xs text-right text-caption text-error focus-visible:outline-2 focus-visible:outline-accent"
        :data-testid="`${testid}.retry`"
        @click="emit('retry', item.key)"
      >
        <span role="status" :data-testid="`${testid}.failed`">{{ failedText }}</span>
      </button>
      <p v-else-if="item.delivery === 'sending' && slow" class="mark px-xs pt-xs text-caption text-ink-faint" :data-testid="`${testid}.sending`">
        {{ chat.sending }}
      </p>
      <p v-else-if="read" class="mark px-xs pt-xs text-caption text-ink-faint" :data-testid="`${testid}.read`">
        {{ chat.read }}
      </p>
    </slot>
  </div>
</template>

<style scoped>
/* The marks under a bubble (the time, "Read", "Sending …") are mono, as every figure is. */
.mark {
  font-family: var(--font-mono);
  font-size: var(--text-meta);
  line-height: var(--text-meta--line-height);
}
/* A long press opens the reaction bar on a phone: no text selection, no callout
   in its way (the bar has "Copy"). A mouse still selects. */
.holder {
  touch-action: manipulation;
  /* The swipe's own translation: the bubble follows the finger (no transition then, it
     is the finger's) and settles back on the standard motion when it is let go. */
  translate: 0;
  transition: translate var(--duration-quick) var(--ease-standard);
}
.holder[data-dragging] {
  transition: none;
}
/* The reply arrow: it comes with the finger and fades out with the bubble. */
.reply-arrow {
  transition:
    opacity var(--duration-quick) var(--ease-standard),
    scale var(--duration-quick) var(--ease-standard);
}
/* docs/MOTION.md, "Quote": the message a quote jumped to is ringed in the accent, the ring
   widening and fading away over `gentle`, once (the chat's page takes the class off again). */
@keyframes quote-flash {
  0%,
  55% {
    outline-color: var(--color-accent);
    outline-offset: var(--spacing-xxs);
  }
  100% {
    outline-color: transparent;
    outline-offset: var(--spacing-sm);
  }
}
.quote-flash {
  outline: var(--stroke-focus) solid transparent;
  outline-offset: var(--spacing-xxs);
  animation: quote-flash var(--duration-gentle) var(--ease-standard) both;
}
/* Reduce Motion: the animation is 1 ms with `both`, i.e. it ends on its transparent end and the
   ring is never seen. There it simply stands in the accent while the message is marked. */
@media (prefers-reduced-motion: reduce) {
  .quote-flash {
    animation: none;
    outline-color: var(--color-accent);
  }
}
@media (pointer: coarse) {
  .holder {
    -webkit-touch-callout: none;
    user-select: none;
  }
}
/* Hers: the card's hairline over the picture too (an inset shadow on the button itself
   would sit under the image). */
.media-hers::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 var(--stroke-hairline) var(--color-hairline-strong);
  pointer-events: none;
}
/* docs/MOTION.md, "Reactions": the double tap's heart grows from 0.6 to full size and
   fades in, rests, then fades away a little larger, all over `gentle`. Reduce Motion
   (every animation 1 ms): it is not seen. */
@keyframes heart-pop {
  0% {
    opacity: 0;
    scale: 0.6;
  }
  35%,
  65% {
    opacity: 1;
    scale: 1;
  }
  100% {
    opacity: 0;
    scale: 1.15;
  }
}
.heart-pop {
  animation: heart-pop var(--duration-gentle) var(--ease-standard) both;
}
.pill {
  height: var(--size-reaction);
  translate: 0 60%;
  font-size: var(--text-caption);
  line-height: 1;
}
.pill-emoji {
  font-size: var(--text-subhead);
}
.react-button:focus-visible {
  position: absolute;
  top: 100%;
  z-index: 10;
  width: auto;
  height: auto;
  margin: var(--spacing-xs) 0 0;
  padding: var(--spacing-xxs) var(--spacing-sm);
  overflow: visible;
  clip: auto;
  white-space: nowrap;
  border-radius: var(--radius-pill);
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-raised);
  font-size: var(--text-caption);
  color: var(--color-ink-muted);
  outline: var(--stroke-focus) solid var(--color-accent);
}

/* docs/MOTION.md, "Reactions": the bar rises a little and grows out of its side
   over `standard`, leaves over `exit`; a pill grows in over `standard` and
   shrinks away over `exit`. With Reduce Motion they are simply there. */
.chat-react-enter-active {
  transition:
    opacity var(--duration-standard) var(--ease-standard),
    scale var(--duration-standard) var(--ease-standard),
    translate var(--duration-standard) var(--ease-standard);
}
.chat-react-leave-active {
  transition:
    opacity var(--duration-exit) var(--ease-exit),
    scale var(--duration-exit) var(--ease-exit);
}
.chat-react-enter-from,
.chat-react-leave-to {
  opacity: 0;
  scale: 0.92;
}
.chat-react-enter-from.origin-bottom {
  translate: 0 var(--spacing-xs);
}
.chat-react-enter-from.origin-top {
  translate: 0 calc(-1 * var(--spacing-xs));
}
.chat-pill-enter-active {
  transition:
    opacity var(--duration-standard) var(--ease-standard),
    scale var(--duration-standard) var(--ease-standard);
}
.chat-pill-leave-active {
  transition:
    opacity var(--duration-exit) var(--ease-exit),
    scale var(--duration-exit) var(--ease-exit);
}
.chat-pill-enter-from,
.chat-pill-leave-to {
  opacity: 0;
  scale: 0.6;
}
</style>

<style>
/* docs/MOTION.md, "A message arrives": a new message rises `sm` and fades in over
   `standard` on the `standard` curve; mine also grow from 0.96, out of the corner
   they come from. With Reduce Motion it is simply there. */
@keyframes chat-arrive {
  from {
    opacity: 0;
    transform: translateY(var(--spacing-sm));
  }
}
@keyframes chat-arrive-own {
  from {
    opacity: 0;
    transform: translateY(var(--spacing-sm)) scale(0.96);
  }
}
.chat-arrive {
  animation: chat-arrive var(--duration-standard) var(--ease-standard) both;
}
.chat-arrive-own {
  transform-origin: bottom right;
  animation: chat-arrive-own var(--duration-standard) var(--ease-standard) both;
}
</style>
