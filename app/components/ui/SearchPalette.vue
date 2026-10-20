<script setup lang="ts">
import UiIcon from './Icon.vue'
import { useModalLayer } from '../../composables/useModalLayer'
import { usePaletteKeyboard } from '../../composables/usePaletteKeyboard'
import { useSwipeDown } from '../../composables/useSwipeDown'
import { useUiText } from '../../composables/useUiText'
// A search palette (added for Bookretreats; Libellus' search palette, `components/shell/SearchOverlay.vue`,
// without its morph out of the tab bar): over the page, which stays put behind it, blurred and veiled, a raised
// card right above the keyboard. The query row is at its bottom (the search glyph in the lamp colour, the field,
// clear, Cancel); the answers, the default slot, stand above it, the nearest at the bottom. Closed by Cancel, a
// tap on the page behind, a swipe down, Escape or the system Back. A modal layer (useModalLayer): the rest of the
// app is inert, and focus goes back to what opened it.
//
// The query is the app's: `v-model:query`, and everything else given to the component goes to the `<input>`
// (`maxlength`, `name`, `autocapitalize`, the combobox's `aria-expanded` / `aria-controls` /
// `aria-activedescendant`, `@input`, `@keydown`). `cleared` follows a tap on clear.
//
// Opening, as Libellus does it: the palette is laid out and the query focused while the palette is fully there,
// and only then does it rise and fade in (Web Animations). On iOS a field that takes the keyboard inside a
// layer that is transparent at that moment leaves that layer's scrolling list dead under the finger: the pan
// goes to the page behind (r10, measured in the iOS Simulator; a Vue `<Transition>` puts its `enter-from`
// opacity on before the focus could come). Interruptible both ways: a close mid-opening plays back from where
// the opening had got to, and the other way round.
import { durationToken, easingToken, prefersReducedMotion, timeAt } from '../../utils/motion'

defineOptions({ inheritAttrs: false })

/** Whether the palette is open (`v-model:open`); closing it is the caller's to see here. */
const open = defineModel<boolean>('open', { required: true })
/** The query (`v-model:query`): the field's text, and the app filters its answers by it. */
const query = defineModel<string>('query', { required: true })
const props = withDefaults(
  defineProps<{
    /** The dialog's name, also the field's. */
    label: string
    /** The field's placeholder, in the app's words. */
    placeholder: string
    /** The clear button's name. */
    clear: string
    /** Cancel's word; the layer's own (`ui.text.cancel`) by default. */
    cancel?: string
    /** What the polite live region says (how many answers came). */
    status?: string
    /** `data-testid` prefix: `Palette`, `Backdrop`, `Query`, `Clear`, `Cancel`, `Status`. */
    testid: string
  }>(),
  { cancel: undefined, status: '' },
)
const emit = defineEmits<{
  /** A tap on clear emptied the query (the app clears its answers). */
  cleared: []
}>()
/** The answers, drawn above the query row, the nearest at the bottom. */
defineSlots<{ default?: () => unknown }>()

const uiText = useUiText()
const cancelWord = computed(() => props.cancel ?? uiText.value.cancel)
const id = useId()

const veil = useTemplateRef<HTMLElement>('veil')
const palette = useTemplateRef<HTMLElement>('palette')
const input = useTemplateRef<HTMLInputElement>('input')

/** On screen: open, or still on its way out. */
const rendered = ref(false)
/** On its way out: no taps any more. */
const closing = ref(false)

function close() {
  open.value = false
}

function clearQuery() {
  query.value = ''
  emit('cleared')
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

const { afterLeave } = useModalLayer(open, {
  elements: () => [veil.value, palette.value],
  initialFocus: () => input.value,
  close,
})

// ------------------------------------------------------------- motion

type Direction = 'open' | 'close'
let animations: Animation[] = []
let running: Direction | null = null

/** Where the running animations have got to, as a share of the opening; null with none running. */
function shown(): number | null {
  const first = animations[0]
  if (!first || !running) return null
  const progress = first.effect?.getComputedTiming().progress ?? 0
  return running === 'open' ? progress : 1 - progress
}

/** Keyframes are written for the opening; the close plays them back to front. */
function oriented(frames: Keyframe[], direction: Direction): Keyframe[] {
  if (direction === 'open') return frames
  return frames.map((frame) => ({ ...frame, offset: 1 - (frame.offset ?? 0) })).reverse()
}

/** docs/MOTION.md, Search palette: it rises `lg` and fades in with its veil; Reduce Motion, a cross-fade in place. */
function frames(reduced: boolean): [HTMLElement | null, Keyframe[]][] {
  const fade: Keyframe[] = [
    { opacity: 0, offset: 0 },
    { opacity: 1, offset: 1 },
  ]
  const rise = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spacing-lg')) || 0
  const card: Keyframe[] = reduced
    ? fade
    : [
        { opacity: 0, translate: `0 ${rise}px`, offset: 0 },
        { opacity: 1, translate: '0 0', offset: 1 },
      ]
  return [
    [veil.value, fade],
    [palette.value, card],
  ]
}

/** Plays the opening or the close from wherever the screen is now (the other one's point, if it was running). */
function play(direction: Direction) {
  const reduced = prefersReducedMotion()
  const at = shown() ?? (direction === 'open' ? 0 : 1)
  for (const animation of animations) animation.cancel()
  running = direction
  const duration = reduced ? durationToken('standard') : durationToken(direction === 'open' ? 'sheet' : 'sheet-exit')
  const easing = reduced ? easingToken('standard') : easingToken(direction === 'open' ? 'sheet' : 'exit')
  const elapsed = duration * timeAt(easing, direction === 'open' ? at : 1 - at)
  const started: Animation[] = []
  for (const [element, keyframes] of frames(reduced)) {
    if (!element) continue
    const animation = element.animate(oriented(keyframes, direction), { duration, easing, fill: 'both' })
    animation.currentTime = elapsed
    started.push(animation)
  }
  animations = started
  const first = started[0]
  if (!first) return settle(direction)
  first.onfinish = () => {
    if (animations === started) settle(direction)
  }
}

/** The motion is over: let go of the animations (the palette stands as its style says), or of the palette. */
function settle(direction: Direction) {
  for (const animation of animations) animation.cancel()
  animations = []
  running = null
  if (direction === 'close') {
    rendered.value = false
    closing.value = false
    afterLeave()
  }
}

watch(
  open,
  async (isOpen) => {
    if (!import.meta.client) return
    if (isOpen) {
      window.addEventListener('keydown', onWindowKeydown)
      closing.value = false
      rendered.value = true
      await nextTick()
      if (!open.value) return
      // Opened from a tap: focus in the same task, so the keyboard comes up with the palette — and before
      // anything of it is transparent (see the top of this file). Then the opening plays, before the next frame.
      input.value?.focus({ preventScroll: true })
      play('open')
    } else {
      window.removeEventListener('keydown', onWindowKeydown)
      if (!rendered.value) return
      closing.value = true
      input.value?.blur()
      play('close')
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('keydown', onWindowKeydown)
  for (const animation of animations) animation.cancel()
})

// ------------------------------------------------------------- keyboard and drag

// While the query has the keyboard the palette sits `sm` above it and the page holds still behind it, on the one
// keyboard reading UiSheet stands on (usePaletteKeyboard).
const { handlers, offset, dragging } = useSwipeDown(close)
const { style: paletteStyle } = usePaletteKeyboard(() => open.value, palette, { offset, dragging })
</script>

<template>
  <Teleport to="body">
    <button
      v-if="rendered"
      ref="veil"
      type="button"
      tabindex="-1"
      :aria-label="cancelWord"
      class="palette-veil fixed inset-0 z-40 bg-veil"
      :class="closing && 'pointer-events-none'"
      :data-testid="`${testid}Backdrop`"
      @click="close"
    />
    <section
      v-if="rendered"
      ref="palette"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      class="palette float-bottom fixed inset-x-ms z-50 mx-auto flex max-w-(--size-max-content) flex-col overflow-hidden rounded-xl bg-surface-raised shadow-palette edge"
      :class="closing && 'pointer-events-none'"
      :style="paletteStyle"
      :data-testid="`${testid}Palette`"
      v-on="handlers"
    >
      <!-- The answers, nearest the query at the bottom; the app's list scrolls in here. -->
      <div class="flex min-h-0 flex-1 flex-col justify-end" data-no-swipe>
        <slot />
        <div class="h-(--stroke-hairline) shrink-0 bg-hairline" aria-hidden="true" />
      </div>

      <!-- The query row: glyph, field, clear, Cancel. -->
      <div class="flex h-(--size-query) shrink-0 items-center gap-sm pr-inset pl-md">
        <span class="flex shrink-0 text-accent" aria-hidden="true"><UiIcon name="search" :size="19" /></span>
        <input
          :id="`${id}-search`"
          ref="input"
          v-model="query"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          :aria-label="label"
          :placeholder="placeholder"
          inputmode="search"
          enterkeyhint="search"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          class="min-w-0 flex-1 self-stretch bg-transparent text-callout text-ink caret-accent outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          :data-testid="`${testid}Query`"
          v-bind="$attrs"
        />
        <button
          v-if="query"
          type="button"
          :aria-label="clear"
          class="relative flex size-ml shrink-0 items-center justify-center rounded-pill bg-fill-strong text-ink-muted after:absolute after:-inset-ms after:content-['']"
          :data-testid="`${testid}Clear`"
          @pointerdown.prevent
          @click="clearQuery"
        >
          <UiIcon name="close" :size="13" bold />
        </button>
        <span class="ml-xs h-ml w-(--stroke-hairline) shrink-0 bg-hairline-strong" aria-hidden="true" />
        <button
          type="button"
          class="min-h-(--size-touch) shrink-0 pl-xs text-body text-ink-muted"
          :data-testid="`${testid}Cancel`"
          @pointerdown.prevent
          @click="close"
        >
          {{ cancelWord }}
        </button>
      </div>
      <p class="sr-only" role="status" aria-live="polite" :data-testid="`${testid}Status`">{{ status }}</p>
    </section>
  </Teleport>
</template>

<style scoped>
/* The page stays put behind the palette, blurred and veiled (Libellus' veil). */
.palette-veil {
  -webkit-backdrop-filter: blur(var(--blur-veil));
  backdrop-filter: blur(var(--blur-veil));
}

/* Rides up and down with the keyboard on its curve; follows a drag 1:1 (the style turns it off). */
.palette {
  transition: transform var(--duration-keyboard) var(--ease-keyboard);
}

/* The drag that moves the palette belongs to everything but the answers. */
.palette > :not([data-no-swipe]) {
  touch-action: none;
}
</style>
