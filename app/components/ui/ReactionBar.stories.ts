import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, within } from 'storybook/test'
import UiReactionBar from './ReactionBar.vue'
import { EMOJIS } from '../../../.storybook/chat-fixtures'

// The glass capsule is drawn over a bubble, so the stories sit it on a busy backdrop (the glass blurs it).
const meta = {
  title: 'Chat/ReactionBar',
  component: UiReactionBar,
  parameters: {
    docs: {
      description: {
        component:
          'A floating glass capsule of emoji for reacting to a chat message or a post, with "Reply" and "Copy" where the message offers them; a toolbar that is one tab stop and closes with Escape.',
      },
    },
  },
  args: { emojis: EMOJIS, current: null, copyable: false, replyable: false, focusOnOpen: false, testid: 'chat', onPick: fn(), onCopy: fn(), onReply: fn(), onAction: fn(), onClose: fn() },
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

/**
 * Roving tabindex (APG toolbar): one tab stop, on the reader's reaction (the first button without one), and
 * it follows the focus; Tab leaves the bar. Every button is a 44 × 44 cell (WCAG 2.5.8).
 */
export const RovingTabindex: Story = {
  args: { replyable: true, copyable: true, current: '😂' },
  decorators: [() => ({ template: '<div class="rounded-md bg-linear-to-br from-accent-soft to-surface-raised p-xl"><story /><button type="button">After</button></div>' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const buttons = within(canvas.getByRole('toolbar')).getAllByRole('button')
    await expect(buttons.filter(button => button.tabIndex === 0)).toHaveLength(1)
    for (const button of buttons) {
      const box = button.getBoundingClientRect()
      await expect(Math.round(box.width)).toBeGreaterThanOrEqual(44)
      await expect(Math.round(box.height)).toBeGreaterThanOrEqual(44)
    }
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Take back Laughing' })).toHaveFocus()
    await userEvent.keyboard('{End}')
    await expect(canvas.getByRole('button', { name: 'Copy' })).toHaveFocus()
    await expect(buttons.filter(button => button.tabIndex === 0)).toEqual([canvas.getByRole('button', { name: 'Copy' })])
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    await expect(canvas.getByRole('button', { name: 'Copy' })).toHaveFocus()
  },
}

/** A longer set (the app's `emojis`): the capsule grows with it. */
export const SixEmoji: Story = { args: { emojis: ['❤️', '😂', '😮', '😢', '🔥', '👍'] } }

export const German: Story = { args: { replyable: true, copyable: true, current: '❤️' }, globals: { locale: 'de' } }
export const Night: Story = { args: { replyable: true, copyable: true, current: '🔥' }, globals: { theme: 'night' } }

const ACTIONS = [
  { id: 'report', label: 'Report', icon: 'flag' as const },
  { id: 'remove', label: 'Delete for me', icon: 'trash' as const },
]

/** `actions`: the app's own entries after "Copy", each an icon button named by its label (no domain word in the base). */
export const WithActions: Story = { args: { replyable: true, copyable: true, actions: ACTIONS } }

/** The actions are in the same toolbar: the arrow keys reach them, Enter or Space emits `action` with the id. */
export const ActionsKeyboard: Story = {
  args: { replyable: true, actions: ACTIONS, focusOnOpen: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'React with Heart' })).toHaveFocus()
    // End goes to the last entry; one Left to the one before it.
    await userEvent.keyboard('{End}')
    await expect(canvas.getByRole('button', { name: 'Delete for me' })).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    await expect(canvas.getByRole('button', { name: 'Report' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(args.onAction).toHaveBeenCalledWith('report')
    // Still one tab stop: only the focused one is tabbable.
    await expect(canvas.getAllByRole('button').filter(b => b.tabIndex === 0)).toHaveLength(1)
  },
}

export const ActionsNight: Story = { args: { replyable: true, copyable: true, actions: ACTIONS }, globals: { theme: 'night' } }
