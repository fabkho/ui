import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import UiClampText from './ClampText.vue'

const LONG =
  'I started it on a train and finished it three days later in a bath that had long gone cold. The ending is quiet and exact, and I have thought about the last page every day since. It is the kind of book you press into a friend’s hands without a word, and then regret lending, and then do it again.'

/** A card-width column, so the text wraps the way it does on a phone. */
const meta = {
  title: 'Base/ClampText',
  component: UiClampText,
  args: { text: LONG, lines: 2, testid: 'clamp' },
  parameters: {
    docs: {
      description: {
        component:
          'Text cut to a few lines with a quiet "More" button under it when, and only when, the text is actually cut; the button opens and folds it in place.',
      },
    },
  },
  render: args => ({
    components: { UiClampText },
    setup: () => ({ args }),
    template: '<div class="w-(--size-menu)"><UiClampText v-bind="args" class="font-serif text-callout text-ink-muted italic" /></div>',
  }),
} satisfies Meta<typeof UiClampText>
export default meta
type Story = StoryObj<typeof meta>

/** Cut to two lines; "More" shows because, and only because, the text is cut. It opens the text in place. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole('button')).toHaveAccessibleName('More'))
    await expect(canvas.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  },
}

/** A text that fits has no button at all. */
export const Short: Story = {
  args: { text: 'Short and sweet.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('clamp')).toBeVisible()
    await expect(canvas.queryByRole('button')).toBeNull()
  },
}

/** `lines` is how many lines stay when it is folded. */
export const ThreeLines: Story = { args: { lines: 3 } }

/** The button's words are `ui.text.more` and `ui.text.less` (the toolbar's German sample shows the swap). */
export const German: Story = { globals: { locale: 'de' } }

export const Night: Story = { globals: { theme: 'night' } }

/**
 * The disclosure pattern (APG): Tab lands on the button, Enter opens the text (`aria-expanded`, "Less") and
 * Enter again folds it; Space does the same. The focus stays on the button throughout.
 */
export const KeyboardPattern: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = await waitFor(() => canvas.getByRole('button', { name: 'More' }))
    await userEvent.tab()
    await expect(button).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(button).toHaveAccessibleName('Less')
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByTestId('clamp')).not.toHaveClass('clamp-folded')
    await expect(button).toHaveFocus()
    await userEvent.keyboard(' ')
    await expect(button).toHaveAccessibleName('More')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toHaveFocus()
  },
}

/** The focus ring of a keyboard user, forced on with the pseudo-states addon so axe and the eye both see it. */
export const FocusVisible: Story = { parameters: { pseudo: { focusVisible: ['.more'] } } }
