<script setup lang="ts">
// A link that starts on touch-down (NuxtBooks' pattern). The moment a finger or the mouse goes down, the
// destination's code is preloaded and `press` is emitted so the caller can start loading its data (and
// prepare whatever the arrival will use: the link element comes with the event). A mouse press navigates
// right away; a finger navigates on the tap (its click), because the same touch-down may turn into a
// scroll. Modified clicks (open in a new tab) and links that name another `target` or are a `download`
// stay the browser's.
// `navigate` is emitted just before the link takes its destination, with the link element, so the caller
// can hand the element over to a transition (a cover that flies into the page it opens).
// A part of the link marked `data-press-to` (a row's author line) goes to its own address instead: tapped
// there, the row opens that address, with no `navigate`; the link itself (keyboard, assistive tech) stays
// the link's own.
// A real anchor: Enter follows it, it has its role and its name from its content. Classes and attributes
// land on the `<a>`.
import type { RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  /** Where the link goes, as a router location (resolved to the anchor's `href`). */
  to: RouteLocationRaw
}>()
const emit = defineEmits<{
  /** On touch-down (or on the press of a mouse), with the link: preload the destination and start its data. */
  press: [link: HTMLElement]
  /** Just before the link takes its destination, with the link (hand it to a transition). */
  navigate: [link: HTMLElement]
}>()
/** The link's content; the anchor gets the classes and attributes given to the component. */
defineSlots<{ default?: () => unknown }>()

const router = useRouter()
const href = computed(() => router.resolve(props.to).href)

// Set when a mouse press already navigated, so its click does not do it twice.
let pressed = false

function modified(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

/** A link that is not the app's to follow: another tab or window, or a file to download. */
function foreign(link: EventTarget | null) {
  return link instanceof HTMLAnchorElement && ((link.target !== '' && link.target !== '_self') || link.hasAttribute('download'))
}

/** The address of the part of the link the event is on, if that part goes elsewhere. */
function partTo(event: Event): string | null {
  const part = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-press-to]') : null
  if (!part || !(event.currentTarget instanceof Element) || !event.currentTarget.contains(part)) return null
  return part.dataset.pressTo || null
}

function onPointerdown(event: PointerEvent) {
  pressed = false
  if (event.button !== 0 || modified(event) || foreign(event.currentTarget)) return
  const part = partTo(event)
  if (part) {
    void preloadRouteComponents(part)
    if (event.pointerType === 'mouse') {
      pressed = true
      void navigateTo(part)
    }
    return
  }
  void preloadRouteComponents(props.to)
  if (event.currentTarget instanceof HTMLElement) emit('press', event.currentTarget)
  if (event.pointerType === 'mouse') {
    pressed = true
    go(event.currentTarget)
  }
}

function onClick(event: MouseEvent) {
  if (event.button !== 0 || modified(event) || foreign(event.currentTarget)) return
  event.preventDefault()
  if (pressed) {
    pressed = false
    return
  }
  const part = partTo(event)
  if (part) void navigateTo(part)
  else go(event.currentTarget)
}

function go(link: EventTarget | null) {
  if (link instanceof HTMLElement) emit('navigate', link)
  void navigateTo(props.to)
}
</script>

<template>
  <a :href="href" @pointerdown="onPointerdown" @click="onClick"><slot /></a>
</template>
