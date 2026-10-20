import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, within } from 'storybook/test'
import UiPressLink from './PressLink.vue'

const meta = {
  title: 'Base/PressLink',
  component: UiPressLink,
  parameters: {
    docs: {
      description: {
        component:
          'A router link that starts early: it preloads the destination and emits `press` when a finger or the mouse goes down, and `navigate` just before it takes its destination.',
      },
    },
  },
  args: { to: '#dune', onPress: fn(), onNavigate: fn() },
  render: args => ({
    components: { UiPressLink },
    setup: () => ({ args }),
    template: '<UiPressLink v-bind="args" class="text-callout text-ink underline">Dune, by Frank Herbert</UiPressLink>',
  }),
} satisfies Meta<typeof UiPressLink>
export default meta
type Story = StoryObj<typeof meta>

/**
 * A real anchor that starts early: `press` fires on touch-down (preload the destination, start its data), `navigate` just
 * before the link takes its destination (hand the link element to a transition). A mouse navigates on the press, a finger on the tap.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => expect(within(canvasElement).getByRole('link', { name: 'Dune, by Frank Herbert' })).toHaveAttribute('href', expect.stringContaining('#dune')),
}

/** A part marked `data-press-to` goes to its own address: no `navigate`, and the link itself stays the link's. */
export const PartWithItsOwnAddress: Story = {
  render: args => ({
    components: { UiPressLink },
    setup: () => ({ args }),
    template: `
      <UiPressLink v-bind="args" class="block text-callout text-ink">
        <span class="block">Dune</span>
        <span class="block text-subhead text-ink-muted underline" data-press-to="#frank-herbert">Frank Herbert</span>
      </UiPressLink>`,
  }),
}

/** A link for another tab (`target`) or a download is the browser's own: nothing is intercepted. */
export const ForeignTarget: Story = {
  args: { target: '_blank', rel: 'noopener' } as object,
  play: async ({ canvasElement, args }) => {
    const link = within(canvasElement).getByRole('link')
    link.addEventListener('click', event => event.preventDefault(), { once: true })
    await userEvent.click(link)
    await expect(args.onPress).not.toHaveBeenCalled()
    await expect(args.onNavigate).not.toHaveBeenCalled()
  },
}

export const Night: Story = { globals: { theme: 'night' } }

/** With the keyboard: Tab lands on the link and Enter follows it (a click, so no touch-down: `navigate` once, `press` never). */
export const KeyboardPattern: Story = {
  play: async ({ canvasElement, args }) => {
    const link = within(canvasElement).getByRole('link')
    await userEvent.tab()
    await expect(link).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(args.onNavigate).toHaveBeenCalledTimes(1)
    await expect(args.onPress).not.toHaveBeenCalled()
  },
}

/** A mouse press navigates at once, on the touch-down, and its click does not navigate a second time. */
export const MousePress: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('link'))
    await expect(args.onPress).toHaveBeenCalledTimes(1)
    await expect(args.onNavigate).toHaveBeenCalledTimes(1)
  },
}

/** The focus ring of a keyboard user, forced on with the pseudo-states addon. */
export const FocusVisible: Story = { parameters: { pseudo: { focusVisible: ['a'] } } }
