import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiTopBar from './TopBar.vue'
import UiRoundButton from './RoundButton.vue'

const meta = {
  title: 'Base/TopBar',
  component: UiTopBar,
  args: { backLabel: 'Back', backTestid: 'backButton' },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 240 } } },
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

/** A long title truncates before it runs into the buttons. */
export const LongTitle: Story = {
  args: { title: 'Wanderings through the collected works of Ursula K. Le Guin' },
  render: WithTrailingActions.render,
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
