<script setup lang="ts">
import { flipTransform } from '../../utils/flip'

// A picture full screen: dark veil, the picture as large as the screen allows, a close
// button in the corner. Esc, a tap beside the picture and a swipe down
// close it (no system-Back entry, see below). With `origin` (the element it was opened from) the picture grows out of it and
// shrinks back (FLIP); Reduce Motion makes both a cross-fade. Copy comes in through props.
// Added for Bookretreats (no Libellus counterpart).
const props = defineProps<{
  open: boolean
  url: string | null
  /** The picture's alt text. */
  label: string
  /** The dialog's name for assistive tech. */
  dialogLabel: string
  closeLabel: string
  /** The small thing it grows out of; read when it opens and again when it closes. */
  origin?: HTMLElement | null
  testid?: string
}>()
const emit = defineEmits<{ close: [] }>()

const id = computed(() => props.testid ?? 'viewer')
const root = ref<HTMLElement | null>(null)
const image = ref<HTMLImageElement | null>(null)
const closer = ref<HTMLButtonElement | null>(null)
const visible = computed(() => props.open && Boolean(props.url))

function close() {
  emit('close')
}

const { handlers, dragStyle } = useSwipeDown(close)
// The viewer's pointerdown and focusin stop here: a vaul sheet under it (Bookretreats' member
// sheet) takes either one outside itself for a tap beside it and would close.
// No useModalLayer / system-Back entry on purpose: the viewer also opens over Bookretreats'
// member sheet (vaul, query-driven), which the layer's history entry would close with it.
// Focus goes to the close button and back to where it came from, as the chat's viewer does.
let trigger: HTMLElement | null = null
watch(visible, async (isOpen) => {
  if (isOpen) {
    trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    closer.value?.focus({ preventScroll: true })
  }
})
function afterLeave() {
  if (trigger?.isConnected) trigger.focus({ preventScroll: true })
  trigger = null
}

function onKey(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !visible.value) return
  // Captured first and stopped: Esc closes the picture, not the sheet under it.
  event.stopPropagation()
  close()
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))

const FINAL_RADIUS = 'var(--radius-lg, 16px)'

function play(direction: 'in' | 'out', done?: () => void) {
  const img = image.value
  const from = props.origin?.isConnected ? props.origin.getBoundingClientRect() : null
  if (!img || !from || prefersReducedMotion() || !img.animate) return done?.()
  const to = img.getBoundingClientRect()
  const invert = flipTransform(from, to)
  if (invert === 'none') return done?.()
  const frames = [
    { transform: invert, borderRadius: '50%', transformOrigin: '0 0' },
    { transform: 'none', borderRadius: FINAL_RADIUS, transformOrigin: '0 0' },
  ]
  const animation = img.animate(direction === 'in' ? frames : [...frames].reverse(), {
    duration: durationToken(direction === 'in' ? 'overlay' : 'overlay-exit'),
    easing: easingToken('standard'),
    fill: 'both',
  })
  if (done) animation.onfinish = () => done()
}

function onEnter(_el: Element, done: () => void) {
  // The veil fades by CSS over `standard`; the picture flies on top of it.
  requestAnimationFrame(() => {
    play('in')
    setTimeout(done, durationToken('standard'))
  })
}
function onLeave(_el: Element, done: () => void) {
  play('out')
  setTimeout(done, durationToken('overlay-exit'))
}
</script>

<template>
  <Teleport to="body">
    <Transition name="media-viewer" @enter="onEnter" @leave="onLeave" @after-leave="afterLeave">
      <div
        v-if="visible"
        ref="root"
        class="media-viewer fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        :aria-label="dialogLabel"
        :data-testid="id"
        @click.self="close"
        @pointerdown.stop
        @focusin.stop
        v-on="handlers"
      >
        <div class="media-veil absolute inset-0 bg-ink" aria-hidden="true" @click="close" />
        <img
          ref="image"
          :src="url!"
          :alt="label"
          class="media-image relative aspect-square object-cover"
          :style="dragStyle"
          draggable="false"
          :data-testid="`${id}Image`"
          @click="close"
        />
        <button
          ref="closer"
          type="button"
          class="media-close absolute right-0 top-0 flex size-(--size-touch) items-center justify-center rounded-pill bg-ink/60 text-on-ink focus-visible:outline-2 focus-visible:outline-on-ink"
          :aria-label="closeLabel"
          :data-testid="`${id}Close`"
          @click="close"
        >
          <UiIcon name="close" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.media-viewer {
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  touch-action: none;
  /* Over a vaul sheet, which turns the body's pointer events off while it is open. */
  pointer-events: auto;
}
.media-image {
  width: min(100%, 100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  max-width: 100%;
  border-radius: var(--radius-lg, 16px);
}
.media-close {
  margin-top: calc(env(safe-area-inset-top) + var(--spacing-sm));
  margin-right: calc(env(safe-area-inset-right) + var(--spacing-sm));
}
/* The veil is the overlay's own fade: `standard` in, `exit` out (docs/MOTION.md). */
.media-veil {
  transition: opacity var(--duration-standard) var(--ease-standard);
}
.media-viewer-enter-from .media-veil,
.media-viewer-leave-to .media-veil {
  opacity: 0;
}
</style>
