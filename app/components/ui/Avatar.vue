<script setup lang="ts">
// The member's initials in mono inside a hairline ring, or her photo (issue
// #156) over them. The initials stay underneath, so the circle is never empty
// and nothing moves: a photo the avatar mounts with (the device's copy) simply
// draws over them, visible at once with no fade, and the initials are then
// invisible under it so an image that is not decoded yet (iOS Safari decodes
// blob URLs async) never shows them; one that comes while it is on screen (the
// first download, a new photo) fades in over `standard` once decoded, over the
// visible initials. Drawing only: the button around it is the 44 px target and carries the label.
//
// `size` (added for Bookretreats): xs 30, sm 32 (the default, Libellus' only
// size), md 40, lg 40 at `coverSm`, xl 72 (a hero's ring, `coverMd`).
// `solid` (added for Bookretreats): the quiet fill laid on the room colour, so
// the circle is opaque where it overlaps something (a face on a cover).
// `lazy` (added for Bookretreats): the photo loads lazily (`loading="lazy"`), for photos from a third party in
// lists.
// `fallback` (added for Bookretreats): the URL to draw when `photo` fails — her stored 1024 px picture
// behind the 256 px face a member's avatar is drawn from (`data/avatarFace.ts`). Only when that fails
// too (a 404) is the photo dropped: the initials stay, nothing jumps.
// `fallback` event (added for Bookretreats): emitted when `photo` was refused and `fallback` is drawn instead, so the
// caller can remember a face is missing and not ask for it again (`MemberAvatar`, `faceToDraw`).
// `label` / `decorative` (added for Bookretreats, accessibility): an avatar that stands for someone says who, as an
// image (`role="img"`, named by `label`: "Mara"); one beside the name, or inside a button that already says it, is
// decorative and hidden from assistive tech. Without a `label` it is decorative (as it always was), so nothing
// in an app changes until it names its avatars; `decorative` hides it even with one.
const props = withDefaults(
  defineProps<{
    /** The initials shown in mono, and what stays under a photo. */
    initials: string
    /** The photo URL drawn over the initials. Default: `null` (initials only). */
    photo?: string | null
    /** A second URL tried when `photo` fails, before falling back to the initials. Default: `null`. */
    fallback?: string | null
    /** The circle's size: `xs` 30, `sm` 32, `md` 40, `lg` 40 on a cover, `xl` 72. Default: `sm`. */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    /** The quiet fill on the room colour, so the circle is opaque where it overlaps something. Default: `false`. */
    solid?: boolean
    /** Load the photo lazily, for third-party photos in lists. Default: `false`. */
    lazy?: boolean
    /** Who it shows (the accessible name), when the avatar is meaningful on its own. */
    label?: string
    /** Hide it from assistive tech even though it has a `label`: the name is right beside it. */
    decorative?: boolean
  }>(),
  { photo: null, fallback: null, size: 'sm', solid: false, lazy: false, label: undefined, decorative: undefined },
)
const hidden = computed(() => props.decorative ?? !props.label)

const emit = defineEmits<{
  /** `photo` was refused and `fallback` was drawn instead, so the caller can remember the face is missing. */
  fallback: []
}>()

const SIZES = {
  xs: 'size-(--size-cover-xs) text-meta',
  sm: 'size-(--size-avatar) text-meta',
  md: 'size-(--size-button-md) text-caption',
  lg: 'size-(--size-cover-sm) text-caption',
  xl: 'size-(--size-cover-md) text-title',
} as const

/** What is being drawn: `photo`, or `fallback` once that one was refused. */
const source = ref<string | null>(null)
/** The photo came or changed while on screen: it waits for its decode, then fades in. Not for one present at mount. */
const arriving = ref(false)
const decoded = ref(false)
const failed = ref(false)
function reset() {
  source.value = props.photo
  decoded.value = false
  failed.value = false
}
// Not immediate: a photo known at mount is drawn at once (`arriving` stays false).
reset()
watch(
  () => [props.photo, props.fallback] as const,
  () => {
    reset()
    arriving.value = true
  },
)
/** A photo is being drawn that was there at mount: the initials stay underneath but invisible. */
const initialsHidden = computed(() => !!source.value && !failed.value && !arriving.value)

/** A refused photo: the fallback, once; then the initials. */
function onError() {
  if (source.value !== props.fallback && props.fallback) {
    source.value = props.fallback
    decoded.value = false
    emit('fallback')
    return
  }
  failed.value = true
}
</script>

<template>
  <span
    class="avatar relative flex shrink-0 items-center justify-center overflow-hidden rounded-pill figures font-medium text-ink-muted"
    :class="[`is-${size}`, SIZES[size], solid ? 'solid' : 'bg-fill']"
    :role="hidden ? undefined : 'img'"
    :aria-label="hidden ? undefined : label"
    :aria-hidden="hidden ? 'true' : undefined"
  >
    <span :class="{ invisible: initialsHidden }" data-avatar-initials>{{ initials }}</span>
    <img
      v-if="source && !failed"
      :key="source"
      :src="source"
      alt=""
      draggable="false"
      :loading="lazy ? 'lazy' : undefined"
      :decoding="lazy ? 'async' : undefined"
      class="absolute inset-0 size-full object-cover"
      :class="arriving && ['transition-opacity duration-(--duration-standard) ease-standard', decoded ? 'opacity-100' : 'opacity-0']"
      data-avatar-photo
      @load="decoded = true"
      @error="onError"
    />
    <!-- The hairline ring over the photo too. -->
    <span class="pointer-events-none absolute inset-0 rounded-pill edge" />
  </span>
</template>

<style scoped>
/* Large text: the circle is fixed, the initials follow the text size, so they are capped to what the circle holds
   (at 100 % the cap is never reached: 38 % of the circle is at least the size's own text). */
.is-xs {
  --avatar-d: var(--size-cover-xs);
  --avatar-fs: var(--text-meta);
}
.is-sm {
  --avatar-d: var(--size-avatar);
  --avatar-fs: var(--text-meta);
}
.is-md {
  --avatar-d: var(--size-button-md);
  --avatar-fs: var(--text-caption);
}
.is-lg {
  --avatar-d: var(--size-cover-sm);
  --avatar-fs: var(--text-caption);
}
.is-xl {
  --avatar-d: var(--size-cover-md);
  --avatar-fs: var(--text-title);
}
.avatar {
  font-size: min(var(--avatar-fs), calc(var(--avatar-d) * 0.38));
}
/* The quiet fill on the room colour: the same tint, but nothing shows through it. */
.solid {
  background: linear-gradient(var(--color-fill), var(--color-fill)), var(--color-surface);
}
</style>
