<script setup lang="ts">
// The member's initials in mono inside a hairline ring, or her photo (issue
// #156) over them. The initials stay underneath, so the circle is never empty
// and nothing moves: a photo the avatar mounts with (the device's copy) simply
// draws over them as it decodes; one that comes while it is on screen (the
// first download, a new photo) fades in over `standard` once decoded. Drawing
// only: the button around it is the 44 px target and carries the label.
//
// `size` (added for Bookretreats): xs 30, sm 32 (the default, Libellus' only
// size), md 40, lg 40 at `coverSm`, xl 72 (a hero's ring, `coverMd`).
// `solid` (added for Bookretreats): the quiet fill laid on the room colour, so
// the circle is opaque where it overlaps something (a face on a cover).
// `lazy` (added for Bookretreats): the photo loads lazily (`loading="lazy"`), for photos from a third party in
// lists. A photo that fails to load (a 404) is dropped: the initials stay, nothing jumps.
const props = withDefaults(
  defineProps<{ initials: string; photo?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; solid?: boolean; lazy?: boolean }>(),
  { photo: null, size: 'sm', solid: false, lazy: false },
)

const SIZES = {
  xs: 'size-(--size-cover-xs) text-meta',
  sm: 'size-(--size-avatar) text-meta',
  md: 'size-(--size-button-md) text-caption',
  lg: 'size-(--size-cover-sm) text-caption',
  xl: 'size-(--size-cover-md) text-title',
} as const

/** The photo changed while on screen: it waits for its decode, then fades in. */
const arriving = ref(false)
const decoded = ref(false)
const failed = ref(false)
watch(
  () => props.photo,
  () => {
    arriving.value = true
    decoded.value = false
    failed.value = false
  },
)
</script>

<template>
  <span
    class="relative flex shrink-0 items-center justify-center overflow-hidden rounded-pill figures font-medium text-ink-muted"
    :class="[SIZES[size], solid ? 'solid' : 'bg-fill']"
    aria-hidden="true"
  >
    {{ initials }}
    <img
      v-if="photo && !failed"
      :key="photo"
      :src="photo"
      alt=""
      draggable="false"
      :loading="lazy ? 'lazy' : undefined"
      :decoding="lazy ? 'async' : undefined"
      class="absolute inset-0 size-full object-cover"
      :class="arriving && ['transition-opacity duration-(--duration-standard) ease-standard', decoded ? 'opacity-100' : 'opacity-0']"
      data-avatar-photo
      @load="decoded = true"
      @error="failed = true"
    />
    <!-- The hairline ring over the photo too. -->
    <span class="pointer-events-none absolute inset-0 rounded-pill edge" />
  </span>
</template>

<style scoped>
/* The quiet fill on the room colour: the same tint, but nothing shows through it. */
.solid {
  background: linear-gradient(var(--color-fill), var(--color-fill)), var(--color-surface);
}
</style>
