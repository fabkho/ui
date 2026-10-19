import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import UiVoiceBubble from './VoiceBubble.vue'
import UiQuote from './Quote.vue'
import { useVoicePlayer } from '../../composables/useVoicePlayer'
import { quote, voiceMessage } from '../../.storybook/chat-fixtures'

// axe's `label-content-name-mismatch` is off for the story that carries a quote: see Quote.stories.ts.
const quoteRules = { a11y: { config: { rules: [{ id: 'label-content-name-mismatch', enabled: false }] } } }

/**
 * What the player says is shared by the whole app (`useVoicePlayer`: one voice at a time, `current.key` is
 * the bubble that has the sound). A story that shows a bubble playing or paused puts that state in
 * place, without sound, and silences it again when it leaves.
 */
function playerAt(key: string, state: { playing: boolean; positionMs: number; failed?: boolean }) {
  const player = useVoicePlayer()
  Object.assign(player.current, { key, playing: state.playing, positionMs: state.positionMs, failed: state.failed ?? false })
  onBeforeUnmount(() => player.stop())
}

// A voice message is the same card as a text bubble; UiBubble decides the tail and counts the taps.
const meta = {
  title: 'Chat/VoiceBubble',
  component: UiVoiceBubble,
  args: { item: voiceMessage(), tail: 'rounded-bl-tail', testid: 'chat', onPress: fn() },
  render: args => ({
    components: { UiVoiceBubble },
    setup: () => ({ args }),
    template: '<div class="w-[min(100vw-2rem,380px)] py-md"><div class="w-[78%]" :class="args.item.mine && \'ml-auto\'"><UiVoiceBubble v-bind="args" /></div></div>',
  }),
} satisfies Meta<typeof UiVoiceBubble>
export default meta
type Story = StoryObj<typeof meta>

/** Theirs: ink play button on the paper card, the waveform quiet, the length at the right. */
export const Theirs: Story = {}

/** Mine: ink card, the play button inverted. The tail is at the right. */
export const Mine: Story = { args: { item: voiceMessage({ mine: true }), tail: 'rounded-br-tail' } }

/** Not the last of a run: round corners all round (`tail` is empty). */
export const WithoutTail: Story = { args: { tail: '' } }

/** A long one: the length counts up in minutes. */
export const Long: Story = { args: { item: voiceMessage({}, { durationMs: 272_000 }) } }

/** Playing: Pause in the button, the bars played so far in full ink, the time is the position. */
export const Playing: Story = {
  render: args => ({
    components: { UiVoiceBubble },
    setup() {
      playerAt(args.item.key, { playing: true, positionMs: 9_000 })
      return { args }
    },
    template: '<div class="w-[min(100vw-2rem,380px)] py-md"><div class="w-[78%]"><UiVoiceBubble v-bind="args" /></div></div>',
  }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Voice message. Pause' })).toHaveAttribute('aria-pressed', 'true')
  },
}

/** Paused part way: Play again, the progress stays where it was. */
export const Paused: Story = {
  render: args => ({
    components: { UiVoiceBubble },
    setup() {
      playerAt(args.item.key, { playing: false, positionMs: 14_000 })
      return { args }
    },
    template: '<div class="w-[min(100vw-2rem,380px)] py-md"><div class="w-[78%]"><UiVoiceBubble v-bind="args" /></div></div>',
  }),
}

export const PlayingMine: Story = {
  args: { item: voiceMessage({ mine: true }), tail: 'rounded-br-tail' },
  render: args => ({
    components: { UiVoiceBubble },
    setup() {
      playerAt(args.item.key, { playing: true, positionMs: 15_000 })
      return { args }
    },
    template: '<div class="w-[min(100vw-2rem,380px)] py-md"><div class="ml-auto w-[78%]"><UiVoiceBubble v-bind="args" /></div></div>',
  }),
}

/** Real playback of a silent clip, to try the button: one voice at a time, so a second bubble stops the first. */
export const TryIt: Story = {
  render: args => ({
    components: { UiVoiceBubble },
    setup: () => ({ args, other: voiceMessage({ mine: true }, { durationMs: 2_000 }) }),
    template: `
      <div class="flex w-[min(100vw-2rem,380px)] flex-col gap-sm py-md">
        <div class="w-[78%]"><UiVoiceBubble v-bind="args" :item="{ ...args.item, media: { ...args.item.media, durationMs: 2_000 } }" /></div>
        <div class="ml-auto w-[78%]"><UiVoiceBubble v-bind="args" :item="other" tail="rounded-br-tail" /></div>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const [first] = within(canvasElement).getAllByRole('button', { name: /Play/ })
    await userEvent.click(first!)
    await waitFor(() => expect(within(canvasElement).getAllByRole('button', { name: /Pause|Play/ }).length).toBe(2))
  },
}

/** The URL is still being signed: the button is off, and a status says what is loading. */
export const Loading: Story = { args: { item: voiceMessage({}, { url: null }) } }

/** This device cannot decode the type (a WebM or Ogg on an iPhone): the button is off and a line says so. */
export const Unplayable: Story = { args: { item: voiceMessage({}, { mime: null }) } }

/** The sound broke off or did not start: one more try on a tap. */
export const PlayFailed: Story = {
  render: args => ({
    components: { UiVoiceBubble },
    setup() {
      playerAt(args.item.key, { playing: false, positionMs: 0, failed: true })
      return { args }
    },
    template: '<div class="w-[min(100vw-2rem,380px)] py-md"><div class="w-[78%]"><UiVoiceBubble v-bind="args" /></div></div>',
  }),
}

/** An answer by voice: the quote sits inside the same card, over the play row (`quote` slot). */
export const WithQuote: Story = {
  parameters: quoteRules,
  render: args => ({
    components: { UiVoiceBubble, UiQuote },
    setup: () => ({ args, original: quote({ preview: 'Can you tell me about the ending?' }) }),
    template: `
      <div class="w-[min(100vw-2rem,380px)] py-md"><div class="w-[78%]">
        <UiVoiceBubble v-bind="args"><template #quote><UiQuote class="m-xs" :quote="original" /></template></UiVoiceBubble>
      </div></div>`,
  }),
}

export const German: Story = { globals: { locale: 'de' } }
export const GermanUnplayable: Story = { args: { item: voiceMessage({}, { mime: null }) }, globals: { locale: 'de' } }

export const Night: Story = { globals: { theme: 'night' } }
export const NightMinePlaying: Story = { ...PlayingMine, globals: { theme: 'night' } }

