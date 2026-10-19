import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, within } from 'storybook/test'
import UiQuote from './Quote.vue'
import { quote } from '../../.storybook/chat-fixtures'

// A quote sits on top of a bubble, so the stories draw it on the ground it has there: the paper card for
// theirs, the ink bubble for mine (`mine` turns the type to on-ink).
const meta = {
  title: 'Chat/Quote',
  component: UiQuote,
  args: { quote: quote(), mine: false, testid: 'chat', onTap: fn() },
  render: args => ({
    components: { UiQuote },
    setup: () => ({ args }),
    template: `
      <div class="w-[min(100vw-2rem,300px)] rounded-lg px-inset py-sm" :class="args.mine ? 'bg-ink text-on-ink' : 'edge bg-surface-raised text-ink shadow-raised'">
        <UiQuote v-bind="args" />
        <p class="pt-xs text-body">Yes, I did. It was worth the wait.</p>
      </div>`,
  }),
} satisfies Meta<typeof UiQuote>
export default meta

type Story = StoryObj<typeof meta>

/**
 * A button to the original message: a tap jumps to it (the thread's `jumpTo`). The name and the preview have a
 * space between them in the DOM, so the button's text reads as it looks ("Sam Did you get…") and its name
 * contains it (WCAG 2.5.3; axe's `label-content-name-mismatch` is on here).
 */
export const Theirs: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button')
    await expect(button).toHaveTextContent(/^Sam Did you get/)
  },
}

/** On an ink bubble: the stripe stays in the accent, the type is on-ink. */
export const OnMyBubble: Story = { args: { mine: true, quote: quote({ mine: true, name: 'You', preview: 'Finished it last night.' }) } }

/** The quoted message was deleted: nowhere to go, so it is no button and says so (`ui.text.chat.reply.deleted`). */
export const Deleted: Story = { args: { quote: quote({ id: null }) } }
export const DeletedOnMyBubble: Story = { args: { mine: true, quote: quote({ id: null }) } }

/** Two lines at most: the app hands over a one-line preview, and the block never grows with what was written. */
export const LongPreview: Story = {
  args: {
    quote: quote({
      name: 'Alexandra Konstantinopoulou-Whitfield',
      preview: 'I have been thinking about the ending for days now, and I still cannot decide whether the narrator is reliable or whether the whole book is her own invention.',
    }),
  },
}

/** A message that was not words: the app writes what the quote says (`ui.text.chat.reply`). */
export const Voice: Story = { args: { quote: quote({ preview: '🎤 Voice message' }) } }

export const German: Story = {
  args: { quote: quote({ name: 'Du', mine: true, preview: 'Hast du das letzte Kapitel schon gelesen?' }) },
  globals: { locale: 'de' },
}
export const GermanDeleted: Story = { args: { quote: quote({ id: null }) }, globals: { locale: 'de' } }
export const Night: Story = { globals: { theme: 'night' } }
export const NightOnMyBubble: Story = { ...OnMyBubble, globals: { theme: 'night' } }
