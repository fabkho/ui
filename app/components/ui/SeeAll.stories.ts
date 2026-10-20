import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, within } from 'storybook/test'
import UiSeeAll from './SeeAll.vue'

const meta = {
  title: 'Base/SeeAll',
  component: UiSeeAll,
  args: { dialog: false, onClick: fn() },
  render: args => ({
    components: { UiSeeAll },
    setup: () => ({ args }),
    template: '<UiSeeAll v-bind="args">See all 11</UiSeeAll>',
  }),
} satisfies Meta<typeof UiSeeAll>
export default meta
type Story = StoryObj<typeof meta>

/** The control at the right of a section's head: a hairline pill, the chevron after the words. */
export const Default: Story = {}

/** `dialog`: it opens a sheet, and says so to a screen reader (`aria-haspopup="dialog"`). */
export const Dialog: Story = { args: { dialog: true }, play: async ({ canvasElement }) => expect(within(canvasElement).getByRole('button')).toHaveAttribute('aria-haspopup', 'dialog') }

/** With `to` it is a link to a page. */
export const AsLink: Story = {
  args: { to: '/reviews' },
  play: async ({ canvasElement }) => expect(within(canvasElement).getByRole('link')).toHaveAttribute('href', '/reviews'),
}

/** A longer name for a screen reader goes in `aria-label`; it has to contain the words that are shown (WCAG 2.5.3). */
export const WithLongName: Story = {
  render: args => ({
    components: { UiSeeAll },
    setup: () => ({ args }),
    template: '<UiSeeAll v-bind="args" aria-label="See all 11 finished books">See all 11</UiSeeAll>',
  }),
}

/** In a section's head, beside its title. */
export const InSectionHead: Story = {
  parameters: { layout: 'padded' },
  render: args => ({
    components: { UiSeeAll },
    setup: () => ({ args }),
    template: `
      <div class="flex w-(--size-menu) items-center justify-between">
        <h2 class="eyebrow">Finished</h2>
        <UiSeeAll v-bind="args">2026 in review</UiSeeAll>
      </div>`,
  }),
}

export const Night: Story = { globals: { theme: 'night' } }

/** Tab lands on it and Enter or Space presses it, as on any button. */
export const KeyboardPattern: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: 'See all 11' })
    await userEvent.tab()
    await expect(button).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(args.onClick).toHaveBeenCalledTimes(1)
    await userEvent.keyboard(' ')
    await expect(args.onClick).toHaveBeenCalledTimes(2)
  },
}

/** The focus ring of a keyboard user, forced on with the pseudo-states addon. */
export const FocusVisible: Story = { parameters: { pseudo: { focusVisible: ['.see-all'] } } }
