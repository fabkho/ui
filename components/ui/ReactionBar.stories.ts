import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, within } from 'storybook/test'
import UiReactionBar from './ReactionBar.vue'
import { EMOJIS } from '../../.storybook/chat-fixtures'

// The glass capsule is drawn over a bubble, so the stories sit it on a busy backdrop (the glass blurs it).
const meta = {
  title: 'Chat/ReactionBar',
  component: UiReactionBar,
  args: { emojis: EMOJIS, current: null, copyable: false, replyable: false, focusOnOpen: false, testid: 'chat', onPick: fn(), onCopy: fn(), onReply: fn(), onClose: fn() },
  decorators: [() => ({ template: '<div class="rounded-md bg-linear-to-br from-accent-soft to-surface-raised p-xl"><story /></div>' })],
} satisfies Meta<typeof UiReactionBar>
export default meta
type Story = StoryObj<typeof meta>

/** The reactions on offer, in the app's order; each is named for a screen reader (`ui.text.chat.reactions.names`). */
export const Default: Story = {}

/** The reader's own reaction is lit and pressed; its button takes it back ("Take back Heart"). */
export const WithCurrent: Story = { args: { current: '🔥' } }

/** "Reply" after a hairline, on a message that can be answered (`replyable`). */
export const WithReply: Story = { args: { replyable: true } }

/** "Copy" on a text message (`copyable`). */
export const WithReplyAndCopy: Story = { args: { replyable: true, copyable: true, current: '❤️' } }

/**
 * APG toolbar: one tab stop, Left / Right / Home / End move between the buttons, Escape closes
 * (`close`). `focusOnOpen` puts the focus on the current reaction (the bubble's "React" button opens it so).
 */
export const Keyboard: Story = {
  args: { replyable: true, copyable: true, current: '😂', focusOnOpen: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Take back Laughing' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByRole('button', { name: 'React with Surprised' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await expect(args.onClose).toHaveBeenCalled()
  },
}

/** A longer set (the app's `emojis`): the capsule grows with it. */
export const SixEmoji: Story = { args: { emojis: ['❤️', '😂', '😮', '😢', '🔥', '👍'] } }

export const German: Story = { args: { replyable: true, copyable: true, current: '❤️' }, globals: { locale: 'de' } }
export const Night: Story = { args: { replyable: true, copyable: true, current: '🔥' }, globals: { theme: 'night' } }
