import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, within } from 'storybook/test'
import UiTopBar from './TopBar.vue'
import UiRoundButton from './RoundButton.vue'
import { fitsTheScreen, largeText } from '../../../.storybook/large-text'

const meta = {
  title: 'Base/TopBar',
  component: UiTopBar,
  args: { backLabel: 'Back', backTestid: 'backButton' },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The top of a pushed screen: a round glass back button on the left, actions in the `trailing` slot on the right and an optional small centred title, floating over the page as it scrolls.' }, story: { inline: false, iframeHeight: 240 } } },
  render: args => ({
    components: { UiTopBar },
    setup: () => ({ args }),
    template: `
      <div class="min-h-[480px] bg-surface text-ink">
        <UiTopBar v-bind="args" />
        <main class="px-inset">
          <h1 v-if="!args.title" class="text-title">The Left Hand of Darkness</h1>
          <p class="mt-sm max-w-prose text-body text-ink-muted">The page content starts below the bar: the root keeps its place in the page, only the buttons float over it.</p>
        </main>
      </div>`,
  }),
} satisfies Meta<typeof UiTopBar>
export default meta
type Story = StoryObj<typeof meta>

/** Back only: the round glass button on the left, nothing on the right. */
export const Default: Story = {}

/** A title in the bar is the screen's own heading (an `h1`), centred between the buttons. */
export const WithTitle: Story = { args: { title: 'Your shelf' } }

/** Actions go in the `trailing` slot as `UiRoundButton`s. */
export const WithTrailingActions: Story = {
  args: { title: 'Your shelf' },
  render: args => ({
    components: { UiTopBar, UiRoundButton },
    setup: () => ({ args }),
    template: `
      <div class="min-h-[480px] bg-surface text-ink">
        <UiTopBar v-bind="args">
          <template #trailing>
            <UiRoundButton icon="search" label="Search" />
            <UiRoundButton icon="more" label="More" />
          </template>
        </UiTopBar>
        <main class="px-inset">
          <p class="mt-sm max-w-prose text-body text-ink-muted">Only the buttons take taps: the page under the rest of the row stays reachable.</p>
        </main>
      </div>`,
  }),
}

/**
 * A long title wraps, centred between the buttons: it never runs under them or out of the screen (WCAG 1.4.4,
 * 1.4.10). The play function measures it against the buttons.
 */
export const LongTitle: Story = {
  args: { title: 'Wanderings through the collected works of Ursula K. Le Guin' },
  render: WithTrailingActions.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const title = canvas.getByRole('heading', { level: 1 }).getBoundingClientRect()
    const back = canvas.getByRole('button', { name: 'Back' }).getBoundingClientRect()
    const actions = canvas.getByRole('button', { name: 'More' }).getBoundingClientRect()
    await expect(title.left).toBeGreaterThanOrEqual(back.right)
    await expect(title.right).toBeLessThanOrEqual(actions.right)
    await expect(title.right).toBeLessThanOrEqual(canvas.getByRole('button', { name: 'Search' }).getBoundingClientRect().left)
    await expect(fitsTheScreen()).toBe(true)
  },
}

/** The text at 200 %: the same long title, still between the buttons and inside the screen. */
export const LargeText: Story = {
  ...LongTitle,
  decorators: [largeText],
}

/** Over a full-bleed hero (a book cover): the bar floats over its light, the page scrolls under it. */
export const OverCover: Story = {
  args: { title: undefined },
  render: args => ({
    components: { UiTopBar, UiRoundButton },
    setup: () => ({ args }),
    template: `
      <div class="min-h-[480px] bg-surface text-ink">
        <UiTopBar v-bind="args">
          <template #trailing><UiRoundButton icon="more" label="More" /></template>
        </UiTopBar>
        <div class="-mt-(--size-touch) h-[256px] bg-cloth3" />
        <main class="px-inset"><h1 class="mt-md text-title">Dune</h1></main>
      </div>`,
  }),
}

export const Night: Story = { args: { title: 'Your shelf' }, globals: { theme: 'night' }, render: WithTrailingActions.render }
