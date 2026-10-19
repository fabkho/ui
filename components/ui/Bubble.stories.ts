import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, waitFor, within } from 'storybook/test'
import UiBubble from './Bubble.vue'
import UiButton from './Button.vue'
import { EMOJIS, message, photoMessage, picturesMedia, quote, voiceMessage } from '../../.storybook/chat-fixtures'

// axe's `label-content-name-mismatch` is off for the stories that carry a quote: see Quote.stories.ts.
const quoteRules = { a11y: { config: { rules: [{ id: 'label-content-name-mismatch', enabled: false }] } } }

// a11y todo (label-content-name-mismatch, WCAG 2.5.3): a reaction pill with a count shows the number ("2"), and the
// name ("Reactions: Fire from both of you") does not say it; a voice-control user cannot say what they see.
const pillTodo = { a11y: { test: 'todo' as const } }

// One message, drawn as the thread draws it: a column as wide as a phone's thread. Theirs is the raised paper
// card on the left, mine is ink on the right; the small corner (the tail) is on the last bubble of a run.
// Long press (or right click) opens the reaction bar, swipe right replies, a double tap likes: these need a
// finger, so the stories show their results (`reacting`, the reaction pill, the quote) as states.
const meta = {
  title: 'Chat/Bubble',
  component: UiBubble,
  args: {
    item: message(),
    read: false,
    fresh: false,
    signed: false,
    sender: null,
    endsRun: true,
    canReact: false,
    emojis: EMOJIS,
    quote: null,
    highlight: false,
    reacting: false,
    placement: 'above',
    wide: false,
    testid: 'chat',
    onRetry: fn(),
    onOpen: fn(),
    onReactOpen: fn(),
    onReactClose: fn(),
    onReact: fn(),
    onReply: fn(),
    onQuoteTap: fn(),
    onMediaFailed: fn(),
  },
  decorators: [() => ({ template: '<div class="w-[min(100vw-2rem,380px)] pt-lg pb-md"><story /></div>' })],
} satisfies Meta<typeof UiBubble>
export default meta
type Story = StoryObj<typeof meta>

/** Theirs: a raised paper card on the left. */
export const Theirs: Story = {}

/** Mine: ink with on-ink type, on the right. */
export const Mine: Story = { args: { item: message({ mine: true, body: 'Not yet, I am saving it for tonight.' }) } }

/** A longer text wraps inside 78 % of the thread and keeps its line breaks. */
export const LongText: Story = {
  args: {
    item: message({
      body: 'I finished it on the train this morning.\nThe last chapter is wonderful, and the ending made me read the first page again straight away.\n\nTell me when you are through and we can talk about it properly.',
    }),
  },
}

/** Only the last bubble of a run has the small corner (`endsRun`); the earlier ones stay round. */
export const RunOfTheirs: Story = {
  render: args => ({
    components: { UiBubble },
    setup: () => ({ args, items: [message({ body: 'Are you up?' }), message({ body: 'I found the edition you were looking for.' }), message({ body: 'It has the old cover!' })] }),
    template: `
      <div class="flex flex-col gap-xs">
        <UiBubble v-for="(item, i) in items" :key="item.key" v-bind="args" :item="item" :ends-run="i === items.length - 1" />
      </div>`,
  }),
}

export const RunOfMine: Story = {
  render: args => ({
    components: { UiBubble },
    setup: () => ({ args, items: [message({ mine: true, body: 'Yes!' }), message({ mine: true, body: 'Which shop?' }), message({ mine: true, body: 'Reserve it for me, please.' })] }),
    template: `
      <div class="flex flex-col gap-xs">
        <UiBubble v-for="(item, i) in items" :key="item.key" v-bind="args" :item="item" :ends-run="i === items.length - 1" />
      </div>`,
  }),
}

/** A group's run: the sender's name stands over the first bubble (`signed`, `sender`). */
export const Signed: Story = { args: { signed: true, sender: 'Alex' } }

/** Mine, not yet stored (`id` is null): a touch lighter, and it cannot be reacted to or answered. */
export const Pending: Story = { args: { item: message({ mine: true, id: null, delivery: 'sending', body: 'On my way!' }) } }

/** Held up for 1.5 s, "Sending …" shows under it, so a quick send never flickers. */
export const SlowSending: Story = {
  args: { item: message({ mine: true, id: null, delivery: 'sending', body: 'On my way!' }) },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getByText('Sending …')).toBeVisible(), { timeout: 4000 })
  },
}

/** The other side has read my last message: "Read" under it (the thread decides which one). */
export const Read: Story = { args: { item: message({ mine: true, body: 'See you at seven.' }), read: true } }

/** Not sent: the bubble and the line under it are one button, "Not sent. Tap to try again." */
export const Failed: Story = { args: { item: message({ mine: true, id: null, delivery: 'failed', body: 'Are you coming tonight?' }) } }

/** The app's own sentence for why it was refused, then the hint (`item.error`, `ui.text.chat.retryHint`). */
export const FailedWithReason: Story = {
  args: { item: message({ mine: true, id: null, delivery: 'failed', error: 'This message is too long to send.', body: 'A very long message …' }) },
}

/** A tap sends again: the bubble goes back to "sending" and, a moment later, is stored. */
export const RetryInteractive: Story = {
  args: { item: message({ mine: true, id: null, delivery: 'failed', body: 'Are you coming tonight?' }) },
  render: args => ({
    components: { UiBubble },
    setup() {
      const item = ref({ ...args.item })
      function retry() {
        item.value = { ...item.value, delivery: 'sending' }
        setTimeout(() => (item.value = { ...item.value, delivery: 'sent', id: 'stored' }), 2200)
      }
      return { args, item, retry }
    },
    template: '<UiBubble v-bind="args" :item="item" @retry="retry" />',
  }),
}

// ------------------------------------------------------------------ quote

/** An answer: the quoted message on top of the bubble, a tap on it jumps to the original (`quoteTap`). */
export const WithQuote: Story = {
  args: { item: message({ body: 'Yes, and it was worth the wait.' }), quote: quote() },
  parameters: quoteRules,
}

export const WithQuoteOnMine: Story = {
  args: { item: message({ mine: true, body: 'Not yet, tonight.' }), quote: quote({ mine: false }) },
  parameters: quoteRules,
}

/** The quoted message is gone: "Message deleted", no button. */
export const WithDeletedQuote: Story = {
  args: { item: message({ mine: true, body: 'That was my favourite line.' }), quote: quote({ id: null }) },
  parameters: quoteRules,
}

/** The chat just jumped here from a quote: the bubble lights up for a moment (`highlight`). */
export const Highlighted: Story = { args: { highlight: true } }

// -------------------------------------------------------------- reactions

/** 1:1: one pill on the inner lower corner; "Reactions: Heart from them". A tap on it opens the bar. */
export const ReactionFromThem: Story = {
  args: { canReact: true, item: message({ reactions: [{ emoji: '❤️', count: 1, mine: false }] }) },
}

/** Mine and theirs on the same emoji: "from both of you", the emoji with a 2. */
export const ReactionFromBoth: Story = {
  parameters: pillTodo,
  args: {
    canReact: true,
    item: message({ mine: true, body: 'It was the best part.', reactions: [{ emoji: '🔥', count: 2, mine: true }, { emoji: '😂', count: 1, mine: false }], myReaction: '🔥' }),
  },
}

/** A group: counts above two ("Heart from 5"). */
export const ReactionsInAGroup: Story = {
  parameters: pillTodo,
  args: {
    canReact: true,
    item: message({ reactions: [{ emoji: '❤️', count: 5, mine: false }, { emoji: '😮', count: 3, mine: true }], myReaction: '😮' }),
  },
}

/** Long press, right click, or the "React" button (for keyboards and VoiceOver) opens the bar (`reacting`). */
export const ReactionBarOpen: Story = {
  args: { canReact: true, reacting: true, item: message({ body: 'Guess who found the first edition?', myReaction: '❤️' }) },
  decorators: [() => ({ template: '<div class="pt-xxl"><story /></div>' })],
}

/** Near the top of the screen the bar opens under the bubble (`placement: 'below'`). */
export const ReactionBarBelow: Story = {
  args: { canReact: true, reacting: true, placement: 'below', item: message({ mine: true, body: 'Guess who found the first edition?' }) },
  decorators: [() => ({ template: '<div class="pb-xxl"><story /></div>' })],
}

// ------------------------------------------------------------------ media

/** A photo is the card's content: its shape is kept before it loads, a tap opens it full screen (`open`). */
export const Photo: Story = { args: { item: photoMessage() } }
export const PhotoMine: Story = { args: { item: photoMessage({ mine: true }) } }
export const Gif: Story = { args: { item: message({ kind: 'media', body: '', media: picturesMedia('gif', 320, 200) }) } }
export const PhotoWithQuote: Story = { args: { item: photoMessage({ mine: true }), quote: quote() }, parameters: quoteRules }

/** The URL is being signed: an empty frame in the picture's shape, and a status for a screen reader. */
export const PhotoLoading: Story = { args: { item: photoMessage({}, { url: null }) } }

/** Nothing new is coming (the file is gone, signing failed): the bubble says so. */
// a11y todo (label-content-name-mismatch, WCAG 2.5.3): the frame says "Picture not available right now", but its button
// is still named "Photo. View large" (and does nothing).
export const PhotoUnavailable: Story = {
  args: { item: photoMessage({}, { url: null, unavailable: true }) },
  parameters: { a11y: { test: 'todo' } },
}

/** Its sender is gone, and the picture with them. */
export const PhotoRemoved: Story = { args: { item: photoMessage({}, { removed: true }) } }

// ------------------------------------------------------------------ voice

/** A voice message: play button, waveform as progress, length (see VoiceBubble for its states). */
export const Voice: Story = { args: { item: voiceMessage() } }
export const VoiceMine: Story = { args: { item: voiceMessage({ mine: true }) } }
export const VoiceWithQuote: Story = { args: { item: voiceMessage(), quote: quote() }, parameters: quoteRules }
export const VoiceRemoved: Story = { args: { item: voiceMessage({}, { removed: true }) } }

// ----------------------------------------------------------- the app's own

/** Any other `kind` is the app's: it draws the card in the `body` slot (`wide`: as wide as a voice message). */
export const AppOwnKind: Story = {
  args: { wide: true, item: message({ kind: 'contact', body: '' }) },
  render: args => ({
    components: { UiBubble, UiButton },
    setup: () => ({ args }),
    template: `
      <UiBubble v-bind="args">
        <template #body="{ tail }">
          <div class="edge rounded-lg bg-surface-raised px-inset py-sm shadow-raised" :class="tail">
            <p class="text-subhead font-medium text-ink">Alex shared a phone number</p>
            <p class="pb-sm text-caption text-ink-muted">Only people in this chat can see it.</p>
            <UiButton tone="secondary" size="sm">Show number</UiButton>
          </div>
        </template>
      </UiBubble>`,
  }),
}

// ------------------------------------------------------------------ words

/** `ui.text.chat` in German: "Nicht gesendet. Zum erneuten Versuch tippen." */
export const GermanFailed: Story = {
  args: { item: message({ mine: true, id: null, delivery: 'failed', body: 'Kommst du heute Abend?' }) },
  globals: { locale: 'de' },
}
export const GermanRead: Story = { args: { item: message({ mine: true, body: 'Bis um sieben.' }), read: true }, globals: { locale: 'de' } }
export const GermanReaction: Story = {
  parameters: pillTodo,
  args: { canReact: true, item: message({ body: 'Rate, wer die Erstausgabe gefunden hat.', reactions: [{ emoji: '❤️', count: 2, mine: true }] }) },
  globals: { locale: 'de' },
}

export const Night: Story = { args: { item: message({ mine: true, body: 'Not yet, tonight.' }), quote: quote(), read: true }, parameters: quoteRules, globals: { theme: 'night' } }
export const NightTheirs: Story = {
  args: { canReact: true, item: message({ reactions: [{ emoji: '🔥', count: 3, mine: false }] }) },
  globals: { theme: 'night' },
}
