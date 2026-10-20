<script lang="ts">
import type { IconName } from './Icon.vue'

/** One tab of UiTabBar. */
export type UiTab = {
  /** Stable key (v-for). */
  key: string
  /** The tab's page. */
  to: string
  /** The tab's icon, unless the tab draws its own in the `icon-<key>` slot. */
  icon: IconName
  /** What assistive tech says (and the tests read): the tab's name. */
  label: string
  /** A longer name for assistive tech when there is news or the tab is locked ("Friends, neue Nachrichten"). */
  ariaLabel?: string
  /**
   * The tab is named by its content instead of `label`/`ariaLabel`: the link gets no `aria-label`, so the
   * visible text the tab draws (the text of its `icon-<key>` slot) is its name, as WCAG 2.5.3 asks. For an
   * icon slot that draws no text of its own (a face, an avatar), give a `label-<key>` slot: its text is
   * rendered visually hidden and is the name. Use it for a tab whose slot shows visible text (initials, a
   * name); without it the tab stays named by `label`.
   */
  nameFromContent?: boolean
  /** Something waits in that tab: a small accent dot on the icon's shoulder. */
  dot?: boolean
  /** Not open yet: the icon in ghost ink with a small lock. It stays a link (the page says why). */
  locked?: boolean
  /** `data-testid` of the tab; its dot and lock get `<testid>Dot` and `<testid>Locked`. */
  testid?: string
}
</script>

<script setup lang="ts">
import UiIcon from './Icon.vue'
import { useHideOnScroll } from '../../composables/useHideOnScroll'
import { useModalShown } from '../../composables/useModalLayer'
import { prefersReducedMotion } from '../../utils/motion'
import { useModalLayer } from '../../composables/useModalLayer'
// A floating glass tab bar, after Libellus' (its components/shell/TabBar.vue,
// which carries Libellus' own tabs and search): a small capsule of icons over
// the content with nothing behind it (no fade, no scroll edge: its glass, edge
// and shadow set it apart), at iOS 26's proportions (`tabBar` 62 tall, `tab` 72
// per tab, `tabIcon` 26). The current tab is full ink with a bolder stroke and
// an accent dot under it, the others recede. Labels are for assistive tech.
//
// It slides away while the member reads down and comes back on a short scroll
// up, at the top and at the end of the page (useHideOnScroll, `hideOnScroll`),
// never on a page that is only a little longer than the screen (`MIN_END_PX`: a
// few px of reading are not worth a bar that goes and comes back), never while
// a sheet or a dialog is open, nor once focus is in the bar. The
// tab already showing, tapped again, scrolls its page back to the top, as iOS
// does, and says so (`reselect`). The default slot comes after the tabs (a tab
// that is not a page, Libellus' Search).
//
// Added for Bookretreats; generic: the tabs come in as `items`, the copy with
// them. Root attributes (`data-testid`) land on the <nav>.
//
// A tab can draw something of its own in place of its icon: the slot `icon-<key>`
// ({ active }), Instagram's own face for the profile. The slot brings its own
// active state (a ring), so the accent dot under the tab is left out for it.
// Such a tab can be named by its content (`nameFromContent`, with a `label-<key>`
// slot for a face with no text): no aria-label hides what it draws.
const props = withDefaults(
  defineProps<{
    items: readonly UiTab[]
    /** The bar's name for assistive tech ("Tabs"). */
    label: string
    /** Only the exact path counts as the tab's (Libellus); otherwise its sub-pages count too. */
    exact?: boolean
    /** Slides the bar away as the member reads down and back on a short scroll up; `true` by default. */
    hideOnScroll?: boolean
  }>(),
  { exact: false, hideOnScroll: true },
)
const emit = defineEmits<{
  /** The tab already showing was tapped again: the bar scrolled its page back to the top; the key says which tab. */
  reselect: [key: string]
}>()
const slots = useSlots()
const drawn = (tab: UiTab) => !!slots[`icon-${tab.key}`]

// The router's own current route, not `useRoute()`: that one follows the router only when `<NuxtPage>` reports
// a finished page (`_route.sync`), and the tab's `aria-current` must be true as soon as the navigation is.
const route = useRouter().currentRoute
const modal = useModalShown()
const { hidden: away, reveal } = useHideOnScroll(() => props.hideOnScroll && !modal.value)

const current = (to: string) => route.value.path === to || (!props.exact && route.value.path.startsWith(`${to}/`))

function tapped(event: MouseEvent, tab: UiTab) {
  if (!current(tab.to)) return
  event.preventDefault()
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'instant' : 'smooth' })
  emit('reselect', tab.key)
}
</script>

<template>
  <nav
    :aria-label="label"
    class="bar float-bottom glass fixed left-1/2 z-20 flex -translate-x-1/2 rounded-pill px-xs edge shadow-float"
    :class="[away && 'away', items.length > 4 && 'compact']"
    :data-away="away || undefined"
    @focusin="reveal"
  >
    <NuxtLink
      v-for="tab in items"
      :key="tab.key"
      :to="tab.to"
      class="tab"
      :class="tab.locked ? 'text-ink-ghost' : current(tab.to) ? 'text-ink' : 'text-ink-faint'"
      :aria-label="tab.nameFromContent ? undefined : (tab.ariaLabel ?? tab.label)"
      :aria-current="current(tab.to) ? 'page' : undefined"
      :data-testid="tab.testid"
      @click="tapped($event, tab)"
    >
      <span class="relative flex">
        <slot :name="`icon-${tab.key}`" :active="current(tab.to)">
          <UiIcon class="tab-icon" :name="tab.icon" :bold="current(tab.to)" />
        </slot>
        <span v-if="tab.dot && !tab.locked" class="news" :data-testid="tab.testid && `${tab.testid}Dot`" aria-hidden="true" />
        <span
          v-if="tab.locked"
          class="absolute -right-sm -bottom-xs flex items-center justify-center rounded-pill bg-surface text-ink-faint"
          :data-testid="tab.testid && `${tab.testid}Locked`"
          aria-hidden="true"
        >
          <UiIcon name="lock" :size="12" bold />
        </span>
      </span>
      <span v-if="tab.nameFromContent && slots[`label-${tab.key}`]" class="sr-only"><slot :name="`label-${tab.key}`" /></span>
      <span v-if="!drawn(tab)" class="dot" :class="current(tab.to) ? 'opacity-100' : 'opacity-0'" aria-hidden="true" />
    </NuxtLink>
    <slot />
  </nav>
</template>

<style scoped>
.tab {
  position: relative;
  display: flex;
  width: var(--size-tab);
  height: var(--size-tab-bar);
  align-items: center;
  justify-content: center;
  transition: color var(--duration-quick) var(--ease-standard);
}

/* Five tabs (an admin's): narrower, so the capsule still fits a phone with its margins. Added for Bookretreats. */
.compact .tab {
  width: var(--size-tab-compact);
}

/* The tab's own icon, not the lock beside it. */
.tab-icon {
  width: var(--size-tab-icon);
  height: var(--size-tab-icon);
}

/* Away and back: down past the screen edge and out, transform and opacity
   only, so nothing is laid out again. Back over `standard`, away over `exit`. */
.bar {
  transition:
    transform var(--duration-standard) var(--ease-standard),
    opacity var(--duration-standard) var(--ease-standard);
}

.bar.away {
  pointer-events: none;
  opacity: 0;
  transform: translateY(calc(100% + var(--float-bottom)));
  transition-duration: var(--duration-exit);
  transition-timing-function: var(--ease-exit);
}

/* 6 under the icon (`xs` + `xxs`), less the dot's own `xs`. */
.dot {
  position: absolute;
  bottom: calc((var(--size-tab-bar) - var(--size-tab-icon)) / 2 - var(--spacing-xs) * 2 - var(--spacing-xxs));
  width: var(--spacing-xs);
  height: var(--spacing-xs);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  transition: opacity var(--duration-quick) var(--ease-standard);
}

/* Something waits in that tab: a small accent dot on the icon's shoulder, cut out of what is under it. */
.news {
  position: absolute;
  top: -1px;
  right: -2px;
  width: var(--spacing-sm);
  height: var(--spacing-sm);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-surface);
}
</style>
