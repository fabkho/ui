<script setup lang="ts">
import { morphFrames } from '../../utils/flip'

// A picture full screen: dark veil, the picture as large as the screen allows, a close
// button in the corner. Esc, a tap beside the picture and a swipe down close it (no system-Back
// entry, see below). With `origin` (the round face it was opened from) the face itself grows
// until it fills the screen: the circle opens up into the whole picture while the veil fades in
// behind, and on close (or after a swipe, from where the finger let go) it shrinks back into the
// circle where the face is *now* (measured again on close, so a sheet or page that scrolled meanwhile
// is no problem). Played on the real image with `clip-path` and a transform, see `utils/flip.ts`
// and the README for why not the View Transitions API. Reduce Motion, or no face to
// grow from (gone, off screen), makes both a cross-fade. Copy comes in through props.
// Added for Bookretreats (no Libellus counterpart).
const props = defineProps<{
  open: boolean
  url: string | null
  /** The picture's alt text. */
  label: string
  /** The dialog's name for assistive tech. */
  dialogLabel: string
  closeLabel: string
  /** The round face it grows out of; read when it opens and again when it closes. */
  origin?: HTMLElement | null
  testid?: string
}>()
const emit = defineEmits<{ close: [] }>()

const id = computed(() => props.testid ?? 'viewer')
const root = ref<HTMLElement | null>(null)
const closer = ref<HTMLButtonElement | null>(null)
const visible = computed(() => props.open && Boolean(props.url))

/** How far a swipe pulled the picture down when it let go; 0 for every other way to close. */
let lift = 0
function close() {
  lift = 0
  emit('close')
}
function release(distance: number) {
  lift = distance
  emit('close')
}

const { offset, dragging, handlers } = useSwipeDown(release)
/** The veil thins as the picture is pulled away, down to a third. */
function veilAt(distance: number) {
  return Math.max(0.35, 1 - distance / 480)
}
const dragStyle = computed(() =>
  offset.value ? { transform: `translateY(${offset.value}px)`, transition: dragging.value ? 'none' : undefined } : {},
)
const veilStyle = computed(() =>
  offset.value ? { opacity: veilAt(offset.value), transition: dragging.value ? 'none' : undefined } : {},
)

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

/** The face on screen now, or null when it is gone, not laid out or entirely off screen. */
function faceBox(): DOMRect | null {
  const el = props.origin
  if (!el?.isConnected) return null
  const box = el.getBoundingClientRect()
  if (!box.width || !box.height) return null
  const inside = box.bottom > 0 && box.right > 0 && box.top < window.innerHeight && box.left < window.innerWidth
  return inside ? box : null
}

/** The enter animations still running: a close that comes in the middle plays them backwards. */
let entering: Animation[] = []
/** A close that came while the picture was still decoding. */
let leaving = false

/** The picture's own decode, so that the morph starts from its pixels (it is the face's, cached). */
async function decoded(img: HTMLImageElement) {
  if (img.complete && img.naturalWidth) return
  await Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 400))])
}

/** The fade of the veil and the close button, with the picture's own timing for `fade`. */
function fadeChrome(host: Element, direction: 'in' | 'out', from = 1): Animation[] {
  // Found from the dialog's own element: a leaving element's refs are already cleared.
  const targets = [host.querySelector<HTMLElement>('.media-veil'), host.querySelector<HTMLElement>('.media-close')].filter((el): el is HTMLElement => Boolean(el?.animate))
  const frames = direction === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: from }, { opacity: 0 }]
  return targets.map((el) =>
    el.animate(frames, {
      duration: durationToken(direction === 'in' ? 'standard' : 'exit'),
      easing: easingToken(direction === 'in' ? 'standard' : 'exit'),
      fill: 'both',
    }),
  )
}

function settle(animations: Animation[], done: () => void, keep: boolean) {
  let remaining = animations.length
  if (!remaining) return done()
  let called = false
  const finish = () => {
    if (called) return
    called = true
    done()
  }
  for (const animation of animations) {
    animation.onfinish = () => {
      if (!keep) animation.cancel()
      remaining -= 1
      if (remaining <= 0) finish()
    }
  }
  // A hidden tab may never finish an animation: the picture is gone all the same.
  const longest = Math.max(...animations.map((a) => Number(a.effect?.getTiming().duration ?? 0)))
  setTimeout(finish, longest + (document.hidden ? 100 : 2500))
}

async function onEnter(el: Element, done: () => void) {
  leaving = false
  const img = el.querySelector<HTMLImageElement>('.media-image')
  const chrome = fadeChrome(el, 'in')
  entering = [...chrome]
  if (!img?.animate) return done()
  const face = faceBox()
  img.style.opacity = '0'
  await decoded(img)
  if (leaving || !img.isConnected) return done()
  img.style.opacity = ''
  let frames: Keyframe[]
  let timing: { duration: number; easing: string }
  const set = face && !prefersReducedMotion() ? morphFrames(face, img.getBoundingClientRect(), FINAL_RADIUS) : null
  if (set) {
    frames = [
      { transform: set.start.transform, clipPath: set.start.clipPath, transformOrigin: '0 0' },
      { transform: set.end.transform, clipPath: set.end.clipPath, transformOrigin: '0 0' },
    ]
    timing = { duration: durationToken('overlay'), easing: easingToken('standard') }
  } else {
    frames = [{ opacity: 0 }, { opacity: 1 }]
    timing = { duration: durationToken('standard'), easing: easingToken('standard') }
  }
  const grow = img.animate(frames, { ...timing, fill: 'both' })
  entering = [...chrome, grow]
  settle(entering, () => { entering = []; done() }, false)
}

function onLeave(el: Element, done: () => void) {
  const img = el.querySelector<HTMLImageElement>('.media-image')
  leaving = true
  const finish = () => {
    entering = []
    done()
  }
  if (!img?.animate) return finish()
  // Closed in the middle of opening: back along the same way.
  if (entering.some((a) => a.playState === 'running')) {
    for (const animation of entering) animation.reverse()
    return settle(entering, finish, true)
  }
  // The swipe's drag style stays on the leaving element: clear it before measuring, the animation
  // carries the pull on.
  img.style.transition = 'none'
  img.style.transform = 'none'
  const face = prefersReducedMotion() ? null : faceBox()
  const set = face ? morphFrames(face, img.getBoundingClientRect(), FINAL_RADIUS, lift) : null
  const chrome = fadeChrome(el, 'out', veilAt(lift))
  let grow: Animation
  if (set) {
    grow = img.animate(
      [
        { transform: set.lifted.transform, clipPath: set.lifted.clipPath, transformOrigin: '0 0' },
        { transform: set.start.transform, clipPath: set.start.clipPath, transformOrigin: '0 0' },
      ],
      { duration: durationToken('overlay-exit'), easing: easingToken('standard'), fill: 'both' },
    )
  } else {
    grow = img.animate(
      [
        { opacity: 1, transform: `translateY(${lift}px)` },
        { opacity: 0, transform: `translateY(${lift}px)` },
      ],
      { duration: durationToken('exit'), easing: easingToken('exit'), fill: 'both' },
    )
  }
  settle([...chrome, grow], finish, true)
}
</script>

<template>
  <Teleport to="body">
    <Transition :css="false" @enter="onEnter" @leave="onLeave" @after-leave="afterLeave">
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
        <div class="media-veil absolute inset-0 bg-ink" :style="veilStyle" aria-hidden="true" @click="close" />
        <img
          :src="url!"
          :alt="label"
          class="media-image relative"
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
  /* As large as the screen allows, in the photo's own proportions (contain): the box is the
     picture, so the morph measures the picture and rounds its corners. */
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-lg, 16px);
  /* The snap back of a swipe that did not go far enough. */
  transition: transform var(--duration-quick) var(--ease-standard);
}
.media-close {
  margin-top: calc(env(safe-area-inset-top) + var(--spacing-sm));
  margin-right: calc(env(safe-area-inset-right) + var(--spacing-sm));
}
/* The veil thins as a swipe pulls the picture away, and comes back with it. */
.media-veil {
  transition: opacity var(--duration-quick) var(--ease-standard);
}
</style>
