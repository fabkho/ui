<script setup lang="ts" generic="T extends { key: string; createdAt: string; id?: string | null; mine?: boolean }">
import UiDaySeparator from './DaySeparator.vue'
import UiSkeleton from './Skeleton.vue'
import { useKeyboardViewport } from '../../composables/useKeyboardInset'
import { useUiText } from '../../composables/useUiText'
import { durationToken, prefersReducedMotion } from '../../utils/motion'
import { endsRun, follows, timeline } from '../../utils/chat/timeline'

// A conversation's screen (moved from Bookretreats' chat page, `pages/friends/[id].vue`, unchanged in
// look and behaviour): the thread fills the screen and scrolls under the floating chrome — the top
// bar's row (the `top` slot: back, a title, a menu) over an opaque veil, and the composer (the
// `composer` slot, UiComposer) docked at the bottom over an opaque floor, so no message shows through
// the gaps between the glass. What is in the thread is the app's: the conversation's head (`head`), each
// message (`message`: UiBubble, or a system line), the placeholder's head while it loads
// (`loading-head`), the screen for any other `status` (`state`: unavailable, an error). The day
// separators (UiDaySeparator, `day`) come from `timeline` (utils/chat/timeline.ts) with the words of
// `ui.text.chat`, and "Today" turns into "Yesterday" at midnight with the screen open.
//
// The keyboard: the screen is fixed, its bottom on the keyboard (`--keyboard-inset`, the base's
// `useKeyboardViewport`; Chrome on Android resizes the page itself and the inset reads 0), so when the
// keyboard comes up the screen is as tall as what is left above it, the composer sits right on the
// keyboard and the thread keeps its newest message in view; with the keyboard up, the composer drops the
// home indicator's room. Only the keyboard moves the screen, never a scroll: the thread is the one thing
// that scrolls, the window is held still (`pin`: iOS would pan it to the composer, or with a drag on the
// chrome, and a screen following that pan trails behind it), and the chrome that does not scroll takes no
// pan gestures (`touch-action`). iOS 26's form accessory bar is counted as keyboard and draws a snapshot of
// the page under it: the screen's colour goes on under its bottom edge, so it shows calm paper.
//
// Dragging or wheeling the thread closes the keyboard, as in iMessage (the field in the dock gives up the
// focus; while a recording runs there is no field, so nothing closes under the thumb), and closes an open
// reaction bar. Scrolled near the top it loads earlier messages (`loadOlder`) and keeps what was being read
// where it was; at the newest it stays at the newest as messages come, as the keyboard comes and goes, as
// the composer grows and as a late head grows.
//
// One reaction bar at a time (UiBubble draws it; the `message` slot hands over `reacting`, `placement`,
// `openReactions`, `closeReactions`): opened by a long press, the bubble's "React" button or its pill;
// closed by a pick, a tap anywhere else (the catcher takes that tap, so it opens nothing under it),
// Escape, or scrolling the thread. It opens under the bubble when it would run under the top bar.
//
// `jumpTo(id)` (a quote's tap) finds a message — paging earlier ones in when it is further back than what
// is loaded — scrolls it to the middle and lights it up for a moment (`highlight` in the `message` slot).
const props = withDefaults(
  defineProps<{
    /** The messages, oldest first. */
    items: readonly T[]
    /** `loading` and `ready` are the thread's own; anything else draws the `state` slot. */
    status: string
    /** Whether two messages in a row are one run (they sit closer, only the last has the tail). */
    sameRun?: (before: T, item: T) => boolean
    /** There are earlier messages to load. */
    hasMore?: boolean
    olderStatus?: 'idle' | 'loading' | 'error'
    /** Loads the earlier page; resolves true when one came in. */
    loadOlder?: () => Promise<boolean>
    /** The thread's name for a screen reader (the conversation's title). */
    label: string
    /** The device is offline: a quiet line under the top bar. */
    offline?: boolean
    /** A sentence over the composer (a photo that could not be sent, a reaction that did not arrive). */
    error?: string | null
    /** A quiet line in the composer's place (a conversation that has become read-only). */
    notice?: string | null
    /** The conversation's head (the `head` slot) stands above the first message. */
    headShown?: boolean
    /** The test ids' start: `chat` → `chat.screen`, `chat.list`, `chat.thread`, … */
    testid?: string
  }>(),
  {
    sameRun: (before: T, item: T) => before.mine === item.mine,
    hasMore: false,
    olderStatus: 'idle',
    loadOlder: () => Promise.resolve(false),
    offline: false,
    error: null,
    notice: null,
    headShown: true,
    testid: 'chat',
  },
)

defineSlots<{
  /** The top bar's row: back, a title, a menu. */
  top?: () => unknown
  /** The beginning of the conversation, above the first message. */
  head?: () => unknown
  /** One message (or system line). */
  message: (props: {
    item: T
    index: number
    /** The message right before it is in the same run. */
    follows: boolean
    /** The first of its run: a name may stand over it. */
    signed: boolean
    /** The last of its run: only it has the tail. */
    endsRun: boolean
    reacting: boolean
    placement: 'above' | 'below'
    highlight: boolean
    openReactions: (key: string, element: HTMLElement) => void
    closeReactions: () => void
  }) => unknown
  /** A day separator (UiDaySeparator by default). */
  day?: (props: { label: string }) => unknown
  /** The head's placeholder while the thread loads, above the bubbles' placeholders. */
  'loading-head'?: () => unknown
  /** Any `status` other than `loading` and `ready`. */
  state?: () => unknown
  /** The dock's content: the composer. */
  composer?: () => unknown
  /** Overlays of the screen (sheets, the media viewer). */
  default?: () => unknown
}>()

const uiText = useUiText()
const chat = computed(() => uiText.value.chat)

// "Today" turns into "Yesterday" at midnight with the screen open.
const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => (clock = setInterval(() => (now.value = new Date()), 60_000)))
onBeforeUnmount(() => clearInterval(clock))

const rows = computed(() => timeline(props.items, now.value, (item) => item.key, chat.value))
const followsAt = (index: number) => follows(rows.value, index, props.sameRun)

// ---------------------------------------------------------------- scroll

const scroller = ref<HTMLElement | null>(null)
/** The thread is at its newest: new messages keep it there. */
let stick = true

function atBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 64
}
function toBottom() {
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
}

/**
 * Scrolls the thread a little further up (it keeps what was being read where it was); resolves true
 * when a page came in, so a quote's jump can page until its message is there.
 */
async function older(): Promise<boolean> {
  const el = scroller.value
  if (!el) return false
  const fromBottom = el.scrollHeight - el.scrollTop
  const added = await props.loadOlder()
  if (!added) return false
  await nextTick()
  // The page above came in; what was being read stays where it was.
  el.scrollTop = el.scrollHeight - fromBottom
  return true
}

/** The thread's height as last seen: a scroll that comes with a new height is the browser's, not hers. */
let listHeight = 0

function onScroll() {
  const el = scroller.value
  if (!el) return
  // The keyboard changed the thread's height and the browser moved it along (Chrome's scroll
  // anchoring fires this before the resize is observed): the reader stays where she was, at the
  // newest if she was there.
  if (el.clientHeight !== listHeight) {
    listHeight = el.clientHeight
    if (stick) return toBottom()
  }
  stick = atBottom(el)
  if (el.scrollTop < 160 && props.hasMore && props.olderStatus === 'idle') void older()
}

// New at the bottom: stay at the newest if she was there, or if it is hers.
watch(
  () => [props.items.length, props.items.at(-1)?.key, props.status] as const,
  (_, previous) => {
    const last = props.items.at(-1)
    const first = previous?.[2] !== 'ready' && props.status === 'ready'
    if (first || stick || (last?.mine && last.key !== previous?.[1])) {
      stick = true
      toBottom()
    }
  },
  { flush: 'post' },
)

// The head grows a little later than the rest (an app fetches what it shows): as long as she is at
// the newest message, the thread stays there while that happens, so a late card never pushes the
// newest away.
const threadEl = ref<HTMLElement | null>(null)
let threadWatcher: ResizeObserver | null = null
let threadHeight = 0
watch(threadEl, (el) => {
  threadWatcher?.disconnect()
  threadWatcher = null
  threadHeight = 0
  if (!el || typeof ResizeObserver === 'undefined') return
  threadWatcher = new ResizeObserver(() => {
    const list = scroller.value
    if (!list) return
    const height = list.scrollHeight
    const grew = Math.max(0, height - threadHeight)
    threadHeight = height
    if (!stick && height - list.scrollTop - list.clientHeight - grew >= 64) return
    stick = true
    toBottom()
  })
  threadWatcher.observe(el)
})
onBeforeUnmount(() => threadWatcher?.disconnect())

// The floating composer is as tall as it is (it grows with the text): the thread keeps that much room
// below its last message, so nothing ever hides under the glass.
const dock = ref<HTMLElement | null>(null)
const dockHeight = ref(0)
let dockWatcher: ResizeObserver | null = null
watch(dock, (el) => {
  dockWatcher?.disconnect()
  dockWatcher = null
  if (!el || typeof ResizeObserver === 'undefined') return
  dockWatcher = new ResizeObserver(() => {
    dockHeight.value = el.offsetHeight
    if (stick) void nextTick(toBottom)
  })
  dockWatcher.observe(el)
  dockHeight.value = el.offsetHeight
})
onBeforeUnmount(() => dockWatcher?.disconnect())

// ------------------------------------------------------------- keyboard

const keyboard = useKeyboardViewport(() => true, { pin: true })

/** The field in the dock gives up the focus (the keyboard closes); nothing else does. */
function blurComposer() {
  const active = document.activeElement
  if ((active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) && dock.value?.contains(active)) active.blur()
}

// Dragging or wheeling the thread closes the keyboard, as in iMessage: the thread gets the room back
// and the newest message stays where it is. Only a finger or a wheel does it — the thread moving itself
// to the newest (`toBottom`, the keyboard resizing it) raises neither event — and a tap, or a finger
// that wobbles, is no drag (`DRAG_PX`). Closing the reaction bar rides on the same events.
const DRAG_PX = 10
let touchStartY: number | null = null
function onThreadTouchStart(event: TouchEvent) {
  touchStartY = event.touches[0]?.clientY ?? null
}
function onThreadTouchMove(event: TouchEvent) {
  if (reactingKey.value) closeReactions()
  const y = event.touches[0]?.clientY
  if (touchStartY === null || y === undefined || Math.abs(y - touchStartY) < DRAG_PX) return
  blurComposer()
}
function onThreadWheel() {
  if (reactingKey.value) closeReactions()
  blurComposer()
}

/** A field of the screen has the keyboard: the composer drops the home indicator's room. */
const typing = ref(false)
const keyboardUp = computed(() => typing.value && keyboard.shown.value)

function onFocusChange() {
  const active = document.activeElement
  typing.value = active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement
}

// The thread got shorter or taller (the keyboard came or went: on iOS the inset above, on Android the
// page itself): the newest message stays in view if she was there.
let listWatcher: ResizeObserver | null = null
watch(scroller, (el) => {
  listWatcher?.disconnect()
  listWatcher = null
  if (!el || typeof ResizeObserver === 'undefined') return
  listWatcher = new ResizeObserver(() => {
    listHeight = el.clientHeight
    if (stick) toBottom()
  })
  listWatcher.observe(el)
})
onBeforeUnmount(() => listWatcher?.disconnect())

const frame = computed(() => (dockHeight.value ? { '--chat-dock': `${dockHeight.value}px` } : {}))

onMounted(() => {
  onFocusChange()
  document.addEventListener('focusin', onFocusChange)
  document.addEventListener('focusout', onFocusChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('focusin', onFocusChange)
  document.removeEventListener('focusout', onFocusChange)
})

// ------------------------------------------------------------- reactions

const header = ref<HTMLElement | null>(null)
const reactingKey = ref<string | null>(null)
const placement = ref<'above' | 'below'>('above')

function openReactions(key: string, element: HTMLElement) {
  // Under the bubble when the bar would run under the top bar.
  const chrome = header.value?.getBoundingClientRect().bottom ?? 0
  const bar = Number.parseFloat(getComputedStyle(element).getPropertyValue('--size-button-md')) || 40
  placement.value = element.getBoundingClientRect().top - bar * 1.5 < chrome ? 'below' : 'above'
  reactingKey.value = key
}
function closeReactions() {
  reactingKey.value = null
}
function onReactionKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closeReactions()
}
watch(reactingKey, (key) => {
  if (key) window.addEventListener('keydown', onReactionKey)
  else window.removeEventListener('keydown', onReactionKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onReactionKey))

// ------------------------------------------------------------- jumping

/** The bubble of a message, once it is in the thread (`data-row-id` is the message's own id). */
function messageElement(id: string): HTMLElement | null {
  const row = scroller.value?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id)}"]`)
  return (row?.firstElementChild as HTMLElement | null) ?? row ?? null
}

/** How long the ring stays on the message a quote jumped to: the animation's own length (`gentle`),
 *  held for a moment longer so it is still there when the smooth scroll lands. */
const HIGHLIGHT_MS = durationToken('gentle') * 3
/** The message a quote just jumped to: it wears the accent ring for a moment. */
const highlightId = ref<string | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(highlightTimer))

/** Finds the message `id` (paging earlier ones in, five pages at most), scrolls to it and lights it up. */
async function jumpTo(id: string) {
  let element = messageElement(id)
  // An old answer may quote a message that is further back than the loaded page.
  for (let page = 0; !element && props.hasMore && page < 5; page++) {
    if (!(await older())) break
    element = messageElement(id)
  }
  if (!element) return
  closeReactions()
  element.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  clearTimeout(highlightTimer)
  highlightId.value = null
  // The class comes off first, so a second tap on the same quote plays the ring again.
  await nextTick()
  highlightId.value = id
  highlightTimer = setTimeout(() => (highlightId.value = null), HIGHLIGHT_MS)
}

defineExpose({
  /** The thread's scroller (an app's IntersectionObserver root). */
  scroller,
  /** Keep the thread at the newest from now on (a message was just sent). */
  stick: () => {
    stick = true
  },
  /** Go to the newest message and stay there. */
  toNewest: () => {
    stick = true
    void nextTick(toBottom)
  },
  jumpTo,
  openReactions,
  closeReactions,
})
</script>

<template>
  <div class="chat-screen" :style="frame" :data-keyboard="keyboardUp || undefined" :data-testid="`${testid}.screen`" :data-status="status">
    <!-- The thread: the whole screen, scrolling under the glass. -->
    <div
      ref="scroller"
      class="list"
      :data-testid="`${testid}.list`"
      @scroll.passive="onScroll"
      @touchstart.passive="onThreadTouchStart"
      @touchmove.passive="onThreadTouchMove"
      @wheel.passive="onThreadWheel"
    >
      <div v-if="status === 'loading'" class="loading" role="status" :aria-label="chat.loading" :data-testid="`${testid}.loading`">
        <!-- The head's placeholder takes exactly the head's place, so nothing moves when the chat is there. -->
        <div v-if="$slots['loading-head']" class="head-row">
          <slot name="loading-head" />
        </div>
        <UiSkeleton class="bubble-skeleton w-3/5" />
        <UiSkeleton class="bubble-skeleton w-1/2 self-end" :wave="1" />
        <UiSkeleton class="bubble-skeleton w-2/3" :wave="2" />
      </div>

      <div v-else-if="status !== 'ready'" class="state">
        <slot name="state" />
      </div>

      <ol v-else ref="threadEl" class="thread" :aria-label="label" :data-testid="`${testid}.thread`">
        <!-- The head: the conversation begins with her, as a book page begins with its cover. -->
        <li v-if="headShown && $slots.head" class="head-row">
          <slot name="head" />
        </li>

        <li v-if="hasMore || olderStatus !== 'idle'" class="older" :data-testid="`${testid}.older`">
          <button v-if="olderStatus === 'error'" type="button" class="olderRetry" :data-testid="`${testid}.olderRetry`" @click="older">
            {{ chat.olderFailed }} {{ chat.olderRetry }}
          </button>
          <span v-else class="eyebrow" role="status">{{ chat.olderLoading }}</span>
        </li>

        <template v-for="(row, index) in rows" :key="row.key">
          <template v-if="row.type === 'day'">
            <slot name="day" :label="row.label">
              <UiDaySeparator :label="row.label" :testid="testid" />
            </slot>
          </template>
          <li
            v-else
            class="msg"
            :class="{ follows: followsAt(index), reacting: reactingKey === row.key }"
            :data-row-id="row.item.id || undefined"
          >
            <slot
              name="message"
              :item="row.item"
              :index="index"
              :follows="followsAt(index)"
              :signed="!followsAt(index)"
              :ends-run="endsRun(rows, index, sameRun)"
              :reacting="reactingKey === row.key"
              :placement="placement"
              :highlight="!!row.item.id && highlightId === row.item.id"
              :open-reactions="openReactions"
              :close-reactions="closeReactions"
            />
          </li>
        </template>
      </ol>
    </div>

    <!-- While a reaction bar is open, a tap anywhere else only closes it. -->
    <div v-if="reactingKey" class="catcher" aria-hidden="true" :data-testid="`${testid}.reactionCatcher`" @pointerdown.prevent @click="closeReactions" />

    <!-- Libellus' top bar over the page: the app's back, title and menu. -->
    <div class="veil" aria-hidden="true" />
    <header ref="header" class="top bar-top safe-x pointer-events-none" :data-testid="`${testid}.head`">
      <div class="relative flex h-(--size-touch) items-center justify-between px-inset">
        <slot name="top" />
      </div>
    </header>

    <!-- No connection: one quiet line under the buttons. -->
    <Transition name="chat-offline">
      <p v-if="offline" class="offline glass edge" role="status" :data-testid="`${testid}.offline`">{{ chat.offline }}</p>
    </Transition>

    <!-- Under the composer the thread disappears: the glass blurs what is behind it, this takes the rest
         (the gaps between the chips, the strip down to the keyboard). -->
    <div class="floor" aria-hidden="true" :data-testid="`${testid}.floor`" />

    <!-- The composer floats where Libellus floats its palette and its tab bar. -->
    <div ref="dock" class="dock float-bottom">
      <div class="mx-auto max-w-(--size-max-content)">
        <p v-if="error && status === 'ready'" class="dockError" role="alert" :data-testid="`${testid}.mediaError`">
          {{ error }}
        </p>
        <p v-if="status === 'ready' && notice" class="notice glass edge" role="status" :data-testid="`${testid}.readOnly`">
          {{ notice }}
        </p>
        <slot v-else-if="status === 'ready'" name="composer" />
      </div>
    </div>

    <slot />
  </div>
</template>

<style scoped>
.chat-screen {
  /* The composer's height until it is measured: the field and the actions above it. */
  --chat-dock: calc(var(--size-touch) * 2 + var(--spacing-sm));
  position: fixed;
  top: 0;
  right: 0;
  bottom: var(--keyboard-inset, 0px);
  left: 0;
  background: var(--color-surface);
}
/* The keyboard takes the home indicator's room: the capsule sits right on it. */
.chat-screen[data-keyboard] {
  --float-bottom: var(--spacing-sm);
}
/* iOS 26's form accessory bar (‹ › ✓) is outside the visual viewport, i.e. counted as keyboard, and draws a
   snapshot of the page under it that no CSS reaches. The screen ends on the keyboard; under it the page colour
   goes on (the floor's continuation), so the pill shows calm paper and not a bubble or the page behind. */
.chat-screen[data-keyboard]::after {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  height: calc(var(--size-touch) * 3);
  background: var(--color-surface);
  content: '';
  pointer-events: none;
}

/* ------------------------------------------------------------------ thread */

.list {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  /* A bubble pulled right (the swipe to answer) sits past the thread's edge: clipped, never a
     sideways scroll of the thread. */
  overflow-x: clip;
  overscroll-behavior: contain;
  /* A double tap likes a message (UiBubble), it does not zoom the page on iOS. */
  touch-action: manipulation;
}
/* The room the floating chrome needs belongs to the thread itself, not to the
   scroller: a scroller's own bottom padding is not always scrollable (WebKit). */
.thread,
.loading,
.state {
  padding-top: calc(var(--bar-top) + var(--size-touch));
  padding-bottom: calc(var(--float-bottom) + var(--chat-dock) + var(--spacing-md));
}
.thread {
  display: flex;
  /* A pixel taller than the scroller, so it always scrolls: a drag on a short
     thread is the thread's (and stops there, overscroll-behavior), never a
     pan of the window behind the keyboard. */
  min-height: calc(100% + 1px);
  max-width: var(--size-max-content);
  flex-direction: column;
  justify-content: flex-end;
  margin: 0 auto;
  padding-right: var(--spacing-md);
  padding-left: var(--spacing-md);
  list-style: none;
}
/* The head stands at the top of the thread, the messages at its foot: while the conversation is
   shorter than the screen, the room between them is what gives, so the head never moves (not when
   the chat opens, not when a message comes). */
.head-row {
  position: relative;
  margin-bottom: auto;
}
/* Everything under the head is positioned, so the head's light stays behind it
   (as Libellus' book page keeps its content above UiAmbient). */
.msg,
.older {
  position: relative;
}
.msg {
  padding-top: var(--spacing-sm);
}
/* The message whose reaction bar is open stands over the catcher. */
.msg.reacting {
  z-index: 21;
}
.catcher {
  position: absolute;
  inset: 0;
  z-index: 20;
}
.msg.follows {
  padding-top: var(--spacing-xs);
}
.older {
  display: flex;
  justify-content: center;
  padding: var(--spacing-sm) 0;
}
.olderRetry {
  min-height: var(--size-touch);
  font-size: var(--text-caption);
  color: var(--color-accent-ink);
}

/* ------------------------------------------------------- floating chrome */

/* Solid room colour behind the status bar, fading out under the buttons. */
.veil {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 20;
  /* The bar's row, then `md` of fade. Opaque all the way down to the buttons' lower edge: the thread
     is gone behind the status bar and the round buttons (a bubble showing through the row beside
     the title read as clutter), and fades out only below them. */
  height: calc(var(--bar-top) + var(--size-touch) + var(--spacing-md));
  background: linear-gradient(
    to bottom,
    var(--color-surface) calc(var(--bar-top) + var(--size-touch)),
    transparent
  );
  pointer-events: none;
}
.top {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 30;
  /* Chrome that does not scroll takes no pan (a drag on it would pan the window with the keyboard up). */
  touch-action: none;
  margin: 0 auto;
  max-width: var(--size-max-content);
}

.offline {
  position: absolute;
  top: calc(var(--bar-top) + var(--size-touch) + var(--spacing-xs));
  right: 0;
  left: 0;
  z-index: 25;
  margin: 0 auto;
  width: fit-content;
  max-width: 84%;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-pill);
  text-align: center;
  font-size: var(--text-caption);
  line-height: var(--text-caption--line-height);
  color: var(--color-ink-muted);
  box-shadow: var(--shadow-float);
}
.chat-offline-enter-active {
  transition: opacity var(--duration-standard) var(--ease-standard);
}
.chat-offline-leave-active {
  transition: opacity var(--duration-exit) var(--ease-exit);
}
.chat-offline-enter-from,
.chat-offline-leave-to {
  opacity: 0;
}

/* ---------------------------------------------------------------- composer */

/* The thread ends at the composer: from just above the dock (its height is measured, `--chat-dock`)
   down to the keyboard the page is opaque, with `md` of fade above it, so no bubble shows between
   the chips or under the capsule's rim. */
.floor {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 25;
  height: calc(var(--float-bottom) + var(--chat-dock) + var(--spacing-md));
  background: linear-gradient(to top, var(--color-surface) calc(100% - var(--spacing-md)), transparent);
  pointer-events: none;
}

.dock {
  position: absolute;
  right: calc(var(--safe-area-right) + var(--spacing-ms));
  left: calc(var(--safe-area-left) + var(--spacing-ms));
  z-index: 30;
  /* As the top bar. The field still scrolls its own text past five lines (a
     scroller inside takes its pan; measured in the iOS Simulator). */
  touch-action: none;
}
.dockError {
  margin: 0 0 var(--spacing-sm);
  text-align: center;
  font-size: var(--text-caption);
  line-height: var(--text-caption--line-height);
  color: var(--color-error);
}
.notice {
  margin: 0;
  padding: var(--spacing-ms) var(--spacing-md);
  border-radius: var(--radius-xl);
  text-align: center;
  font-size: var(--text-caption);
  line-height: var(--text-caption--line-height);
  color: var(--color-ink-muted);
  box-shadow: var(--shadow-palette);
}

/* ------------------------------------------------------- loading and state */

.loading {
  display: flex;
  min-height: 100%;
  max-width: var(--size-max-content);
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin: 0 auto;
  padding-right: var(--spacing-md);
  padding-left: var(--spacing-md);
}
.bubble-skeleton {
  height: var(--spacing-xxl);
  border-radius: var(--radius-lg);
}
.state {
  max-width: var(--size-max-content);
  margin: 0 auto;
}
</style>
