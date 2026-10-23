<script setup lang="ts">
import UiIcon from './Icon.vue'
import { MAX_ZOOM, OUTPUT_MAX, renderCrop } from '../../utils/imageCrop'
import { useImageCrop } from '../../composables/useImageCrop'
import { useUiText } from '../../composables/useUiText'
import { fillWords } from '../../utils/chat/words'

// A square window over a picture, to choose what a profile or group photo shows: the picture is moved with one
// finger or the mouse, zoomed with two fingers, the wheel, the slider or the +/− buttons, and panned with the
// arrow keys. A round or square mask shows the cut; the corners of the round one stay visible, dimmed, since the
// upload is the whole square. The component draws no buttons of its own: the caller confirms and cancels, and
// asks for the result with `crop()` (a JPEG Blob of at most `output` px on a side, never upscaled).
const props = withDefaults(
  defineProps<{
    /** The decoded picture to crop (EXIF orientation applied, e.g. by `loadImage`). */
    image: HTMLImageElement
    /** The mask: a circle (avatars) or the square itself. */
    shape?: 'round' | 'square'
    /** The longest side of the Blob `crop()` returns, in px; a smaller cut-out is not upscaled. */
    output?: number
  }>(),
  { shape: 'round', output: OUTPUT_MAX },
)
const emit = defineEmits<{
  /** `crop()` finished: the cut-out picture. */
  crop: [photo: Blob]
}>()

const text = useUiText()
const frame = useTemplateRef<HTMLElement>('frame')
// The square's width, observed, so the picture follows a rotated phone.
const size = ref(0)
const crop = useImageCrop(() => Math.max(1, size.value))
const placement = computed(() => crop.placement())

let observer: ResizeObserver | undefined
onMounted(() => {
  size.value = frame.value?.clientWidth ?? 0
  crop.open({ width: props.image.naturalWidth, height: props.image.naturalHeight })
  observer = new ResizeObserver(([entry]) => {
    const previous = size.value
    size.value = entry?.contentRect.width ?? 0
    crop.resize(previous, size.value)
  })
  if (frame.value) observer.observe(frame.value)
})
onBeforeUnmount(() => observer?.disconnect())

// A new picture starts again, centred at zoom 1.
watch(
  () => props.image,
  (image) => crop.open({ width: image.naturalWidth, height: image.naturalHeight }),
)

const zoom = computed({
  get: () => crop.state.zoom,
  set: (value: number) => crop.setZoom(Number(value)),
})
const zoomText = computed(() => fillWords(text.value.imageCrop.zoomValue, { percent: Math.round(crop.state.zoom * 100) }))

const ZOOM_STEP = 0.25
const PAN_STEP = 0.1

// Keyboard: arrows move the picture the way a drag would, +/− zoom.
function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  const step = size.value * PAN_STEP
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }
  const move = moves[event.key]
  if (move) crop.nudge(move[0], move[1])
  else if (event.key === '+' || event.key === '=') zoom.value = zoom.value + ZOOM_STEP
  else if (event.key === '-' || event.key === '_') zoom.value = zoom.value - ZOOM_STEP
  else return
  event.preventDefault()
}

/** Cuts the square out, scales it down to `output` px and encodes a JPEG; also emitted as `crop`. */
async function render(): Promise<Blob | null> {
  const rect = crop.rect()
  if (!rect) return null
  const photo = await renderCrop(props.image, rect, props.output)
  emit('crop', photo)
  return photo
}
defineExpose({ crop: render })

const hintId = useId()
</script>

<template>
  <div class="flex flex-col gap-lg">
    <div
      ref="frame"
      class="relative aspect-square w-full touch-none overflow-hidden bg-fill-strong select-none"
      :class="shape === 'round' ? 'rounded-xl' : 'rounded-md'"
      role="group"
      tabindex="0"
      :aria-label="text.imageCrop.area"
      :aria-describedby="hintId"
      @keydown="onKeydown"
      @pointerdown="crop.onPointerDown"
      @pointermove="crop.onPointerMove"
      @pointerup="crop.onPointerUp"
      @pointercancel="crop.onPointerUp"
      @wheel="crop.onWheel"
    >
      <img
        v-if="placement"
        :src="image.src"
        alt=""
        draggable="false"
        class="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
        :style="{ width: `${placement.width}px`, height: `${placement.height}px`, transform: `translate(${placement.x}px, ${placement.y}px)` }"
      />
      <svg v-if="shape === 'round'" class="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M0 0h100v100H0Z M50 0a50 50 0 1 0 0.001 0Z" fill-rule="evenodd" class="fill-surface/70" />
        <circle cx="50" cy="50" r="49.75" fill="none" class="stroke-surface-raised" stroke-width="0.5" />
      </svg>
      <span :id="hintId" class="sr-only">{{ text.imageCrop.hint }}</span>
    </div>

    <div class="flex items-center gap-sm text-ink-muted">
      <button
        type="button"
        class="flex size-(--size-touch) items-center justify-center rounded-pill"
        :aria-label="text.imageCrop.zoomOut"
        :disabled="zoom <= 1"
        @click="zoom = zoom - ZOOM_STEP"
      >
        <UiIcon name="minus" :size="20" />
      </button>
      <!-- A native range is the APG slider: arrows and Home/End step it, VoiceOver and TalkBack adjust it by swipe. -->
      <input
        v-model.number="zoom"
        type="range"
        min="1"
        :max="MAX_ZOOM"
        step="0.05"
        class="h-(--size-touch) flex-1 accent-accent"
        :aria-label="text.imageCrop.zoom"
        :aria-valuetext="zoomText"
      />
      <button
        type="button"
        class="flex size-(--size-touch) items-center justify-center rounded-pill"
        :aria-label="text.imageCrop.zoomIn"
        :disabled="zoom >= MAX_ZOOM"
        @click="zoom = zoom + ZOOM_STEP"
      >
        <UiIcon name="plus" :size="20" />
      </button>
    </div>
  </div>
</template>
