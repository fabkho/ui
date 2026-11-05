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
          'The chat composer: a glass capsule with the growing field and one lit send, floating photo, GIF and app chips above it (the `actions` slot), a quote of the answered message, and an optional voice recording mode: hold the microphone to record, let go to send, slide up to lock, slide away to cancel (`voiceHold`, on by default; a tap records hands-free).',
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
 * Recording by a tap (the way without a hold: VoiceOver, the keyboard, a mouse). The capsule holds ✕ (throw
 * away), the live bars, the timer and send, and the chips give way to one line, "Recording". This story stands a
 * hum in for the microphone (no permission prompt), so it runs in the test browser too.
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

// ------------------------------------------------------------- hold to record

// The microphone as in WhatsApp: hold to record, let go to send, slide up to lock, slide towards the start side
// to cancel. A play function drives the pointer with real `PointerEvent`s. Their pointer ids are touch ids (7, 8),
// not the mouse's 1: Chromium drops the capture of a pointer that has no button down at once, and the component
// would (rightly) read that as the touch being taken away; a pointer it does not know, it cannot capture at all.
// The words are `ui.text.chat.voice`, English defaults in app.config.ts; an app supplies its own (EN and DE):
//   record        the microphone's name                     'Record a voice message'
//   recordHint    its description (aria-describedby)        'Hold to record, release to send. Slide up to lock, slide left to cancel. Or tap to record hands-free.'
//   slideToCancel the hint in the capsule while held        'Slide to cancel'
//   locked        announced, polite, when it locks          'Recording locked. Press send when you are done.'
//   discarded     announced, polite, when thrown away       'Recording discarded.'
//   tooShort      announced, polite, a hold too short       'Recording too short, so it was discarded. Hold the microphone longer, or tap it to record hands-free.'
// (`recording`, `stopped`, `limit`, `timer`, `cancel`, `send` are the status line's and the panel's, as before.)

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

function touch(target: Element, type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', x: number, y: number, pointerId = 7, isPrimary = true) {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary, clientX: x, clientY: y, button: 0 }),
  )
}

/** Where the thumb rests on the microphone (its centre); the moves are relative to it. */
function thumb(button: HTMLElement) {
  const box = button.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/** Presses the microphone and waits until it is really recording (the stand-in microphone is there). */
async function hold(canvas: ReturnType<typeof within>) {
  const button = canvas.getByTestId('chat.record')
  const at = thumb(button)
  touch(button, 'pointerdown', at.x, at.y)
  await waitFor(() => expect(canvas.getByTestId('chat.recorder')).toHaveAttribute('data-hold'))
  await waitFor(() => expect(Number(canvas.getByTestId('chat.voiceTimer').getAttribute('data-ms'))).toBeGreaterThan(0), { timeout: 5000 })
  return { button, ...at }
}

/**
 * Held: the timer with a pulsing red dot, the live bars, "Slide to cancel" and, over the microphone, the
 * lock mark. The finger stays down (the story ends with the hold going on).
 */
export const Holding: Story = {
  play: async ({ canvasElement }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    await hold(canvas)
    await expect(canvas.getByTestId('chat.holdHint')).toBeVisible()
    await expect(canvas.getByTestId('chat.holdLock')).toBeVisible()
    await expect(canvas.getByTestId('chat.holdDot')).toBeVisible()
  },
}

/** Mid-slide towards the start side: the hint has faded and shifted, the cancel is not yet armed. */
export const HoldSlidingToCancel: Story = {
  play: async ({ canvasElement }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    touch(button, 'pointermove', x - 45, y - 4)
    await waitFor(() => expect(Number(getComputedStyle(canvas.getByTestId('chat.holdHint')).opacity)).toBeCloseTo(0.5, 1))
    await expect(canvas.getByTestId('chat.recorder')).toHaveAttribute('data-hold')
  },
}

/** Slid up past the lock distance: the recording goes on without the finger, in today's panel (✕, bars, timer, send). */
export const HoldLocked: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    touch(button, 'pointermove', x, y - 40)
    touch(button, 'pointermove', x - 3, y - 80)
    touch(button, 'pointerup', x - 3, y - 80)
    await waitFor(() => expect(canvas.getByTestId('chat.voiceSend')).toBeEnabled(), { timeout: 5000 })
    await expect(canvas.getByTestId('chat.voiceCancel')).toBeVisible()
    await expect(canvas.getByTestId('chat.voiceAnnounce')).toHaveTextContent('Recording locked')
    await expect(args.onVoice).not.toHaveBeenCalled()
  },
}

/** Hold, then let go after a while: the recording is sent (`voice`). */
export const HoldAndRelease: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    await sleep(800)
    touch(button, 'pointerup', x, y)
    await waitFor(() => expect(args.onVoice).toHaveBeenCalledTimes(1), { timeout: 5000 })
    const [voice] = (args.onVoice as unknown as ReturnType<typeof fn>).mock.calls[0] as [{ durationMs: number; peaks: number[] }]
    await expect(voice.durationMs).toBeGreaterThan(700)
    await expect(Array.isArray(voice.peaks)).toBe(true)
    await expect(args.onVoiceError).not.toHaveBeenCalled()
    await waitFor(() => expect(canvas.queryByTestId('chat.recorder')).toBeNull())
  },
}

/** Hold, slide up past the lock distance (no release needed), then send from the panel. */
export const HoldSlideUpLocksThenSend: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    touch(button, 'pointermove', x, y - 75)
    await waitFor(() => expect(canvas.getByTestId('chat.voiceSend')).toBeEnabled(), { timeout: 5000 })
    // The finger lifts: nothing is sent, the recording goes on.
    touch(button, 'pointerup', x, y - 75)
    await sleep(900)
    await expect(args.onVoice).not.toHaveBeenCalled()
    await expect(canvas.getByTestId('chat.recorder')).not.toHaveAttribute('data-hold')
    await userEvent.click(canvas.getByTestId('chat.voiceSend'))
    await waitFor(() => expect(args.onVoice).toHaveBeenCalledTimes(1), { timeout: 5000 })
  },
}

/** Hold, slide towards the start side past the cancel distance and let go: thrown away, nothing sent, the trash shows for a moment. */
export const HoldSlideLeftCancels: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    touch(button, 'pointermove', x - 60, y)
    touch(button, 'pointermove', x - 110, y - 5)
    touch(button, 'pointerup', x - 110, y - 5)
    await waitFor(() => expect(canvas.getByTestId('chat.holdTrash')).toBeVisible())
    await expect(canvas.getByTestId('chat.voiceAnnounce')).toHaveTextContent('Recording discarded')
    await expect(canvas.queryByTestId('chat.recorder')).toBeNull()
    await waitFor(() => expect(canvas.getByRole('textbox')).toBeVisible(), { timeout: 3000 })
    await expect(args.onVoice).not.toHaveBeenCalled()
  },
}

/** A hold let go too soon to send (under 0.7 s) is thrown away, and the announcement says why. */
export const HoldTooShort: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    // Past a tap (0.3 s), short of a message (0.7 s).
    const held = Number(canvas.getByTestId('chat.voiceTimer').getAttribute('data-ms'))
    await sleep(Math.max(0, 450 - held))
    touch(button, 'pointerup', x, y)
    await waitFor(() => expect(canvas.getByTestId('chat.voiceAnnounce')).toHaveTextContent('too short'))
    await expect(canvas.queryByTestId('chat.recorder')).toBeNull()
    await expect(args.onVoice).not.toHaveBeenCalled()
  },
}

/**
 * A short press (within 0.3 s) is a tap: nothing is sent, nothing is thrown away, the recording goes on in the
 * panel. The way for VoiceOver, Switch Control and a mouse that clicks; so is a press the microphone's
 * permission sheet takes the `pointerup` of.
 */
export const HoldShortTapFallsBack: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const button = canvas.getByTestId('chat.record')
    const at = thumb(button)
    touch(button, 'pointerdown', at.x, at.y)
    await sleep(80)
    touch(button, 'pointerup', at.x, at.y)
    await waitFor(() => expect(canvas.getByTestId('chat.voiceSend')).toBeEnabled(), { timeout: 5000 })
    await sleep(900)
    await expect(canvas.getByTestId('chat.recorder')).not.toHaveAttribute('data-hold')
    await expect(canvas.getByTestId('chat.voiceCancel')).toBeVisible()
    await expect(args.onVoice).not.toHaveBeenCalled()
  },
}

/** A system gesture takes the touch (`pointercancel`) while holding, before the lock distance: thrown away, no microphone left on. */
export const HoldPointerCancel: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    touch(button, 'pointercancel', x, y)
    await waitFor(() => expect(canvas.queryByTestId('chat.recorder')).toBeNull())
    await expect(args.onVoice).not.toHaveBeenCalled()
  },
}

/** A second finger is ignored: it neither moves nor ends the hold of the first. */
export const HoldSecondFinger: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    touch(button, 'pointerdown', x, y, 8, false)
    touch(button, 'pointermove', x - 150, y - 150, 8, false)
    touch(button, 'pointerup', x - 150, y - 150, 8, false)
    await sleep(100)
    await expect(canvas.getByTestId('chat.recorder')).toHaveAttribute('data-hold')
    await expect(args.onVoice).not.toHaveBeenCalled()
  },
}

/** Enter on the microphone (a keyboard, a switch, VoiceOver's double tap) records hands-free, in the panel. */
export const KeyboardRecord: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    canvas.getByTestId('chat.record').focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(canvas.getByTestId('chat.voiceSend')).toBeEnabled(), { timeout: 5000 })
    await expect(canvas.getByTestId('chat.recorder')).not.toHaveAttribute('data-hold')
    await expect(args.onVoice).not.toHaveBeenCalled()
  },
}

/** The microphone's description, read after its name. */
export const MicrophoneDescribed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Record a voice message', description: /Hold to record, release to send/ })).toBeVisible()
  },
}

/** `voiceHold` off keeps tap-only: a press and hold does not record; a tap does, as before. */
export const TapOnly: Story = {
  args: { voiceHold: false },
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const button = canvas.getByTestId('chat.record')
    await expect(button).not.toHaveAccessibleDescription()
    const at = thumb(button)
    touch(button, 'pointerdown', at.x, at.y)
    await sleep(100)
    await expect(canvas.queryByTestId('chat.recorder')).toBeNull()
    touch(button, 'pointerup', at.x, at.y)
    await userEvent.click(button)
    await waitFor(() => expect(canvas.getByTestId('chat.voiceSend')).toBeEnabled(), { timeout: 5000 })
    await expect(args.onVoice).not.toHaveBeenCalled()
  },
}

/** Right to left: the hint and the cancel are on the start side, the right; sliding that way cancels. */
export const HoldRtl: Story = {
  decorators: [() => ({ template: '<div dir="rtl"><story /></div>' })],
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    // The wrong way (towards the end side) does nothing.
    touch(button, 'pointermove', x - 120, y)
    touch(button, 'pointermove', x + 110, y)
    touch(button, 'pointerup', x + 110, y)
    await waitFor(() => expect(canvas.getByTestId('chat.voiceAnnounce')).toHaveTextContent('Recording discarded'))
    await expect(args.onVoice).not.toHaveBeenCalled()
  },
}

/** Reduced motion: the dot does not pulse and the hint stays put (the distances still count). */
export const HoldReducedMotion: Story = {
  globals: { motion: 'reduce' },
  play: async ({ canvasElement }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const { button, x, y } = await hold(canvas)
    touch(button, 'pointermove', x - 60, y)
    await waitFor(() => expect(Number(getComputedStyle(canvas.getByTestId('chat.holdHint')).opacity)).toBeLessThan(1))
    await expect(getComputedStyle(canvas.getByTestId('chat.holdHint')).transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
    touch(button, 'pointerup', x - 120, y)
  },
}

// ------------------------------------------------------------------ words

export const German: Story = { args: { modelValue: '' }, globals: { locale: 'de' } }
export const GermanAnswering: Story = {
  args: { quote: { name: 'Sam', preview: 'Hast du das letzte Kapitel schon gelesen?' }, modelValue: 'Ja, ' },
  globals: { locale: 'de' },
}
export const GermanRecording: Story = { ...Recording, globals: { locale: 'de' } }
export const GermanHolding: Story = { ...Holding, globals: { locale: 'de' } }

export const Night: Story = { args: { modelValue: 'On my way, save me a seat!' }, globals: { theme: 'night' } }
export const NightEmpty: Story = { globals: { theme: 'night' } }
export const NightAnswering: Story = { ...Answering, globals: { theme: 'night' } }
