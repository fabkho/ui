<script lang="ts">
export interface AvatarStackFace {
  /** The initials drawn when there is no photo (and under it). */
  initials: string
  /** The photo URL. Default: none (initials only). */
  photo?: string | null
  /** Who it is (the stack's name is made of these when it has no `label`). */
  label: string
}
</script>

<script setup lang="ts">
import UiAvatar from './Avatar.vue'
import { useUiText } from '../../composables/useUiText'
import { fillWords } from '../../utils/chat/words'

// Faces that overlap, as a group shows who is in it (a chapter's readers, a group's members, who answered a
// call): `layout="row"` overlaps them left to right, a "+N" circle takes the place of the faces past `max`;
// `layout="pair"` is the group chat's mark, two faces diagonally (the first up left, the second down right).
// Each face has a ring in the colour of what the stack lies on, so the overlap reads as an edge: the ring
// is `--avatar-stack-ring` (the surface colour when the app sets none).
//
// The stack is one image for assistive tech (`role="img"`, named by `label`, or by the faces' names and "and
// N more" when there is none): never one name per face. The faces are drawn by UiAvatar, or by the app's own
// avatar in the scoped slot `face` (`{ face, index, size }`), which is decoration inside that one image.
const props = withDefaults(
  defineProps<{
    /** The people, in the order they are drawn. */
    faces: readonly AvatarStackFace[]
    /** How many faces a row draws before the "+N" circle. Default: `4`. */
    max?: number
    /** The faces' size: `xs` 30, `sm` 32, `md` 40 (UiAvatar's). Default: `sm`. */
    size?: 'xs' | 'sm' | 'md'
    /** `row` overlaps them in a line, `pair` draws two diagonally (more than two: the first two). Default: `row`. */
    layout?: 'row' | 'pair'
    /** The stack's one accessible name ("Ida, Berit and Clara"). Default: made of the faces' labels. */
    label?: string
  }>(),
  { max: 4, size: 'sm', layout: 'row', label: undefined },
)

const uiText = useUiText()

const shown = computed(() => props.faces.slice(0, props.layout === 'pair' ? 2 : Math.max(1, props.max)))
const rest = computed(() => (props.layout === 'pair' ? 0 : props.faces.length - shown.value.length))
const name = computed(() => {
  if (props.label) return props.label
  const names = shown.value.map((face) => face.label).join(', ')
  return rest.value ? `${names} ${fillWords(uiText.value.chat.more, { count: rest.value })}` : names
})
</script>

<template>
  <span
    class="stack"
    :class="[`is-${size}`, layout]"
    role="img"
    :aria-label="name"
    :data-count="faces.length"
  >
    <span v-for="(face, index) in shown" :key="index" class="face" aria-hidden="true">
      <slot name="face" :face="face" :index="index" :size="size">
        <UiAvatar :initials="face.initials" :photo="face.photo" :size="size" solid decorative />
      </slot>
    </span>
    <span v-if="rest" class="face more figures text-ink-muted" aria-hidden="true">+{{ rest }}</span>
  </span>
</template>

<style scoped>
.stack {
  --face: var(--size-avatar);
  --ring: var(--avatar-stack-ring, var(--color-surface));
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}
.is-xs {
  --face: var(--size-cover-xs);
}
.is-md {
  --face: var(--size-button-md);
}
.face {
  display: flex;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  box-shadow: 0 0 0 var(--stroke-focus) var(--ring);
  background: var(--ring);
}
.row .face + .face {
  margin-inline-start: calc(var(--face) / -3);
}
/* The "+N" circle: the quiet fill on the ring colour, so it is opaque like the faces. */
.more {
  align-items: center;
  justify-content: center;
  width: var(--face);
  height: var(--face);
  background: linear-gradient(var(--color-fill), var(--color-fill)), var(--ring);
  font-size: var(--text-meta);
  font-weight: 500;
}
/* Two faces on the diagonal of a box one and a half faces wide. */
.pair {
  position: relative;
  display: block;
  width: calc(var(--face) * 1.5);
  height: calc(var(--face) * 1.5);
}
.pair .face {
  position: absolute;
}
.pair .face:first-child {
  inset-block-start: 0;
  inset-inline-start: 0;
}
.pair .face:nth-child(2) {
  inset-block-end: 0;
  inset-inline-end: 0;
}
</style>
