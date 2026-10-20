import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import UiTabBar from './TabBar.vue'
import type { UiTab } from './TabBar.vue'
import UiIcon from './Icon.vue'

// Routing: the tabs are NuxtLinks to plain paths, and the current tab is `route.path`. Storybook's Nuxt app
// has no pages, so a path it does not know would reload the iframe. The stories therefore register the tab
// paths on the live router as empty routes (`routed`, below; nothing is rendered for them, the canvas stays
// as it is), so a tap really navigates (pushState) and the current tab moves. The route the story started on
// is put back when it unmounts. The bar reads the router's own current route (not `useRoute()`, which waits for
// `<NuxtPage>`), so nothing has to be synced by hand. No router mock and no change to the component.
const TABS: UiTab[] = [
  { key: 'home', to: '/home', icon: 'home', label: 'Home', testid: 'tabHome' },
  { key: 'library', to: '/library', icon: 'library', label: 'Library', testid: 'tabLibrary' },
  { key: 'feed', to: '/feed', icon: 'feed', label: 'Feed', testid: 'tabFeed' },
  { key: 'profile', to: '/profile', icon: 'person', label: 'Profile', testid: 'tabProfile' },
]

const FIVE: UiTab[] = [
  ...TABS.slice(0, 3),
  { key: 'people', to: '/people', icon: 'people', label: 'Members', testid: 'tabPeople' },
  { key: 'admin', to: '/admin', icon: 'gear', label: 'Admin', testid: 'tabAdmin' },
]

const Blank = { render: () => null }

/** Registers the tab paths on the iframe's router and goes to `path`, so the tab for it is the current one. */
let owner = 0
let origin: string | undefined
function routed(path: string) {
  const router = useRouter()
  origin ??= location.href
  const start = router.currentRoute.value
  const mine = ++owner
  const paths = new Set([start.path, path, ...TABS.map(tab => tab.to), ...FIVE.map(tab => tab.to)])
  for (const known of paths) if (!router.resolve(known).matched.length) router.addRoute({ path: known, component: Blank })
  void router.replace(path)
  // A newer story has taken the router over by then (it mounts before this one unmounts): leave it be.
  onBeforeUnmount(() => {
    if (mine !== owner) return
    history.replaceState(history.state, '', origin!)
  })
}

const meta = {
  title: 'Base/TabBar',
  component: UiTabBar,
  args: { items: TABS, label: 'Tabs', exact: false, hideOnScroll: true },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'A floating glass tab bar of icon links to the app\'s pages, sliding away as the member reads down; the slot `icon-<key>` ({ active }) draws a tab\'s own face in place of its icon, the slot `label-<key>` names a tab by its content, and the default slot adds a control after the tabs.' }, story: { inline: false, iframeHeight: 240 } } },
  render: args => ({
    components: { UiTabBar },
    setup() {
      routed('/home')
      return { args }
    },
    template: `
      <div class="min-h-[360px] bg-surface p-md text-ink">
        <p class="text-body text-ink-muted">The bar floats at the bottom of the screen; tap a tab to move the current one.</p>
        <UiTabBar v-bind="args" />
      </div>`,
  }),
} satisfies Meta<typeof UiTabBar>
export default meta
type Story = StoryObj<typeof meta>

/** Four tabs, the first one current: its icon is bold, in full ink, with the accent dot under it. */
export const Default: Story = {}

/**
 * The second tab is current: `aria-current="page"` comes from the router's own route, and only that tab has it.
 * The play function taps the Feed tab: the current tab moves with it.
 */
export const SecondTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page'))
    await expect(canvas.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
    await userEvent.click(canvas.getByRole('link', { name: 'Feed' }))
    await waitFor(() => expect(canvas.getByRole('link', { name: 'Feed' })).toHaveAttribute('aria-current', 'page'))
    await expect(canvas.getByRole('link', { name: 'Library' })).not.toHaveAttribute('aria-current')
  },
  render: args => ({
    components: { UiTabBar },
    setup() {
      routed('/library')
      return { args }
    },
    template: '<div class="min-h-[360px] bg-surface"><UiTabBar v-bind="args" /></div>',
  }),
}

/** Five tabs (an admin's): narrower tabs, so the capsule still fits a phone with its margins. */
export const FiveTabs: Story = { args: { items: FIVE } }

/** `dot`: something waits in that tab. Its `ariaLabel` says so for assistive tech. */
export const WithNewsDot: Story = {
  args: {
    items: TABS.map(tab => (tab.key === 'feed' ? { ...tab, dot: true, ariaLabel: 'Feed, new posts' } : tab)),
  },
}

/** `locked`: not open yet. Ghost ink with a small lock; it stays a link (the page says why). */
export const WithLockedTab: Story = {
  args: {
    items: TABS.map(tab => (tab.key === 'feed' ? { ...tab, locked: true, ariaLabel: 'Feed, locked' } : tab)),
  },
}

/** Slot `icon-<key>` draws a face of its own in place of the icon (here an avatar ring); the slot brings its own active state. */
export const CustomIcon: Story = {
  render: args => ({
    components: { UiTabBar },
    setup() {
      routed('/profile')
      return { args }
    },
    template: `
      <div class="min-h-[360px] bg-surface">
        <UiTabBar v-bind="args">
          <template #icon-profile="{ active }">
            <span
              class="flex size-[28px] items-center justify-center rounded-pill bg-cloth2 text-caption font-medium text-cloth-ink"
              :class="active ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''"
              aria-hidden="true"
            >F</span>
          </template>
        </UiTabBar>
      </div>`,
  }),
}

/** The default slot comes after the tabs: a tab that is not a page, such as Search. */
export const WithTrailingSlot: Story = {
  render: args => ({
    components: { UiTabBar, UiIcon },
    setup() {
      routed('/home')
      return { args }
    },
    template: `
      <div class="min-h-[360px] bg-surface">
        <UiTabBar v-bind="args">
          <button type="button" class="flex h-(--size-tab-bar) w-(--size-tab) items-center justify-center text-ink-faint" aria-label="Search">
            <UiIcon name="search" :size="26" />
          </button>
        </UiTabBar>
      </div>`,
  }),
}

/** Sub-pages count for their tab unless `exact` is set (Libellus: only the exact path is the tab's). Here `/library` is current while the route is `/library/shelf`. */
export const SubPageIsCurrent: Story = {
  render: args => ({
    components: { UiTabBar },
    setup() {
      routed('/library/shelf')
      return { args }
    },
    template: '<div class="min-h-[360px] bg-surface"><UiTabBar v-bind="args" /></div>',
  }),
}

/**
 * `nameFromContent`: no aria-label on the tab; the name is what it draws. Here the face has no text, so the
 * `label-profile` slot gives the name (visually hidden). The face is `aria-hidden`; the name is "Profile".
 * The play function tabs to it from the bar's start and taps it with the keyboard.
 */
export const NamedByHiddenLabel: Story = {
  args: {
    items: TABS.map(tab => (tab.key === 'profile' ? { ...tab, nameFromContent: true } : tab)),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const profile = await canvas.findByRole('link', { name: 'Profile' })
    await expect(profile).not.toHaveAttribute('aria-label')
    profile.focus()
    await expect(profile).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(profile).toHaveAttribute('aria-current', 'page'))
  },
  render: args => ({
    components: { UiTabBar },
    setup() {
      routed('/home')
      return { args }
    },
    template: `
      <div class="min-h-[360px] bg-surface">
        <UiTabBar v-bind="args">
          <template #icon-profile="{ active }">
            <span
              class="flex size-[28px] items-center justify-center rounded-pill bg-cloth2 text-caption font-medium text-cloth-ink"
              :class="active ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''"
              aria-hidden="true"
            >F</span>
          </template>
          <template #label-profile>Profile</template>
        </UiTabBar>
      </div>`,
  }),
}

/** `nameFromContent` with visible text in the icon slot: the visible text is the name ("Me"); no hidden label needed. */
export const NamedByVisibleText: Story = {
  args: {
    items: TABS.map(tab => (tab.key === 'profile' ? { ...tab, nameFromContent: true } : tab)),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole('link', { name: 'Me' })).toHaveTextContent('Me')
  },
  render: args => ({
    components: { UiTabBar },
    setup() {
      routed('/home')
      return { args }
    },
    template: `
      <div class="min-h-[360px] bg-surface">
        <UiTabBar v-bind="args">
          <template #icon-profile>
            <span class="flex size-[28px] items-center justify-center text-caption font-medium text-ink">Me</span>
          </template>
        </UiTabBar>
      </div>`,
  }),
}

export const Night: Story = { globals: { theme: 'night' } }
