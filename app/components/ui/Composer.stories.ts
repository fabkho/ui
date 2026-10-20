import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import UiComposer from './Composer.vue'
import UiComposerChip from './ComposerChip.vue'
import { fakeMicrophone } from '../../../.storybook/chat-fixtures'
import { fitsTheScreen, largeText } from '../../../.storybook/large-text'

// The composer floats over the thread (a glass capsule, the chips above it); the stories sit it on a busy
// backdrop so the glass shows. `v-model` is the text: every story holds it in a `ref`, so the field really
// takes typing, and send clears it. The thread docks it at the bottom of the screen (see ChatThread).
const render: Story['render'] = args => ({
  components: { UiComposer, UiComposerChip },
  setup() {
    const text = ref(args.modelValue ?? '')
    const send = () => {
      args.onSend?.()
      text.value = ''
    }
    return { args, text, send }
  },
  template: `
    <div class="w-[min(100vw-2rem,440px)] rounded-md bg-linear-to-br from-accent-soft to-surface-raised px-md pt-xl pb-md">
      <UiComposer v-bind="args" v-model="text" @send="send" />
    </div>`,
})

const meta = {
  title: 'Chat/Composer',
  component: UiComposer,
  args: {
    modelValue: '',
    gifs: true,
    photoAccept: 'image/jpeg,image/png',
    voiceMaxMs: 120_000,
    compact: false,
    note: null,
    quote: null,
    testid: 'chat',
    onSend: fn(),
    onPhoto: fn(),
    onGif: fn(),
    onVoice: fn(),
    onVoiceError: fn(),
    onCancelQuote: fn(),
    onDismissNote: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          'The chat composer: a glass capsule with the growing field and one lit send, floating photo, GIF and app chips above it (the `actions` slot), a quote of the answered message, and an optional voice recording mode.',
      },
    },
  },
  render,
} satisfies Meta<typeof UiComposer>
export default meta
type Story = StoryObj<typeof meta>

/** Nothing written: the microphone stands where send will be, and "Photo" and "GIF" float above. */
export const Empty: Story = {}

/** Something written: send is lit (ink on the glass). Return sends only on a desktop keyboard; on a phone it is a new line. */
export const Typing: Story = { args: { modelValue: 'On my way, save me a seat!' } }

/**
 * No zoom on focus on iPhone: Safari zooms the page in on a field under 16 px, so on iOS (`ui.css`, where only WebKit
 * knows `-webkit-touch-callout`) the field is 16 px at least, with no `maximum-scale` in the viewport. Elsewhere it
 * keeps the design's text size, which is all this runs against in Chromium; Bookretreads' WebKit iPhone project
 * checks the iOS side.
 */
export const FieldSizeOnIos: Story = {
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole('textbox')
    const size = Number.parseFloat(getComputedStyle(field).fontSize)
    if (CSS.supports('-webkit-touch-callout', 'none')) expect(size).toBeGreaterThanOrEqual(16)
    else expect(size).toBe(Number.parseFloat(getComputedStyle(document.body).fontSize))
  },
}

/** The field grows with what is written, up to five lines, then scrolls. */
export const Multiline: Story = {
  args: { modelValue: 'First line.\nSecond line.\nThird line, which is long enough that it will wrap over to a fourth line on a narrow phone.\nFifth.\nSixth line scrolls.' },
}

/** Without a GIF provider, a photo picker or a microphone, the capsule stands alone, with send always drawn. */
export const FieldOnly: Story = { args: { gifs: false, photoAccept: undefined, voiceMaxMs: undefined } }

/** `max`: the field takes no more than this many characters. */
export const WithLimit: Story = { args: { max: 40, modelValue: 'Forty characters is all that fits here.' } }

/** The app's own chips in the `actions` slot, beside the base's ("Share number"). */
export const WithChips: Story = {
  render: args => ({
    components: { UiComposer, UiComposerChip },
    setup: () => ({ args, text: ref('') }),
    template: `
      <div class="w-[min(100vw-2rem,440px)] rounded-md bg-linear-to-br from-accent-soft to-surface-raised px-md pt-xl pb-md">
        <UiComposer v-bind="args" v-model="text">
          <template #actions>
            <UiComposerChip icon="person">Share number</UiComposerChip>
            <UiComposerChip icon="heart">Send a like</UiComposerChip>
          </template>
        </UiComposer>
      </div>`,
  }),
}

/**
 * The text at 200 % (WCAG 1.4.4, 1.4.10): the chips wrap onto a second line instead of running out of the screen,
 * so every one of them stays reachable by a single tap.
 */
export const LargeText: Story = {
  ...WithChips,
  decorators: [largeText],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The story's frame is the screen's width here: the chips stay inside it.
    const row = (canvasElement.firstElementChild as HTMLElement).getBoundingClientRect()
    for (const name of ['Send a photo from your gallery', 'Find and send a GIF', 'Share number', 'Send a like']) {
      const chip = canvas.getByRole('button', { name }).getBoundingClientRect()
      await expect(chip.right, name).toBeLessThanOrEqual(row.right + 1)
    }
    await expect(fitsTheScreen()).toBe(true)
  },
}

/**
 * The chips over the field are a toolbar (APG): one tab stop, and Left / Right / Home / End move along them (they
 * wrap). Each is a 44 × 44 target (see ComposerChip).
 */
export const ChipsKeyboard: Story = {
  render: WithChips.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toolbar = canvas.getByRole('toolbar', { name: 'Message actions' })
    const [photo, gif, share, like] = within(toolbar).getAllByRole('button')
    await expect(toolbar.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
    await userEvent.tab()
    await expect(photo).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(gif).toHaveFocus()
    await userEvent.keyboard('{End}')
    await expect(like).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(photo).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    await expect(share).toHaveFocus()
    // One tab stop: Tab leaves the toolbar for the field.
    await userEvent.tab()
    await expect(canvas.getByRole('textbox')).toHaveFocus()
  },
}

/** Answering a message: the quote stands over the capsule, its ✕ takes it back (`cancelQuote`). */
export const Answering: Story = {
  args: { quote: { name: 'Sam', preview: 'Did you get to the last chapter yet?' }, modelValue: 'Yes, ' },
}

/** A long quote is cut to one line. */
export const AnsweringLong: Story = {
  args: { quote: { name: 'Alexandra Konstantinopoulou-Whitfield', preview: 'I have been thinking about the ending for days now and I still cannot decide whether she can be trusted.' } },
}

// ------------------------------------------------------------------ compact

/** `compact`, a comment bar: the same capsule with the field and send, send always drawn, no microphone. */
export const Compact: Story = { args: { compact: true, gifs: false, photoAccept: undefined, placeholder: 'Add a comment', label: 'Comment' } }

/** Compact with a GIF chip. */
export const CompactWithGif: Story = { args: { compact: true, photoAccept: undefined, placeholder: 'Add a comment', label: 'Comment' } }

/** `note`: a pill over the capsule for the bar's reply or edit mode, its ✕ named by `noteLabel`. */
export const CompactWithNote: Story = {
  args: { compact: true, gifs: false, photoAccept: undefined, placeholder: 'Add a comment', label: 'Comment', note: 'Replying to Sam', noteLabel: 'Cancel reply', modelValue: 'Thanks, ' },
}

export const CompactEditing: Story = {
  args: { compact: true, gifs: false, photoAccept: undefined, placeholder: 'Add a comment', label: 'Comment', note: 'Editing', noteLabel: 'Stop editing', modelValue: 'The ending is my favourite part.' },
}

// --------------------------------------------------------------- recording

/**
 * Recording: the microphone starts it (a tap, not a hold). The capsule then holds ✕ (throw away), the live
 * bars, the timer and send, and the chips give way to one line, "Recording". This story stands a hum in for
 * the microphone (no permission prompt), so it runs in the test browser too.
 */
export const Recording: Story = {
  args: { voiceMaxMs: 120_000 },
  play: async ({ canvasElement }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('chat.record'))
    await waitFor(() => expect(canvas.getByTestId('chat.voiceSend')).toBeEnabled(), { timeout: 5000 })
    await expect(canvas.getByTestId('chat.recorder')).toBeVisible()
  },
}

/** At the longest recording (`voiceMaxMs`) it stops by itself and says so; ✕ and send still work. */
export const RecordingAtTheLimit: Story = {
  args: { voiceMaxMs: 1_200 },
  play: async ({ canvasElement }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('chat.record'))
    await waitFor(() => expect(canvas.getByTestId('chat.recordingStatus')).toHaveTextContent(/\w/), { timeout: 5000 })
    await waitFor(() => expect(canvas.getByTestId('chat.voiceTimer')).toHaveAttribute('data-ms', '1200'), { timeout: 5000 })
  },
}

// ------------------------------------------------------------------ words

export const German: Story = { args: { modelValue: '' }, globals: { locale: 'de' } }
export const GermanAnswering: Story = {
  args: { quote: { name: 'Sam', preview: 'Hast du das letzte Kapitel schon gelesen?' }, modelValue: 'Ja, ' },
  globals: { locale: 'de' },
}
export const GermanRecording: Story = { ...Recording, globals: { locale: 'de' } }

export const Night: Story = { args: { modelValue: 'On my way, save me a seat!' }, globals: { theme: 'night' } }
export const NightEmpty: Story = { globals: { theme: 'night' } }
export const NightAnswering: Story = { ...Answering, globals: { theme: 'night' } }
