import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import UiComposer from './Composer.vue'
import UiComposerChip from './ComposerChip.vue'
import { fakeKeyboard, fakeMicrophone, resetKeyboard } from '../../../.storybook/chat-fixtures'
import { fitsTheScreen, largeText } from '../../../.storybook/large-text'
import type { SendOption } from '../../utils/chat/sendAs'

// The composer floats over the thread (a glass capsule, the chips above it); the stories sit it on a busy
// backdrop so the glass shows. `v-model` is the text: every story holds it in a `ref`, so the field really
// takes typing, and send clears it. The thread docks it at the bottom of the screen (see ChatThread).
const render: Story['render'] = args => ({
  components: { UiComposer, UiComposerChip },
  setup() {
    const text = ref(args.modelValue ?? '')
    const send = () => {
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
  // A story that stood a soft keyboard in (`fakeKeyboard`) gets the real viewport back.
  afterEach: () => resetKeyboard(),
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

/** Stands a recorder in for `navigator.vibrate` (Android's Vibration API) while `run` goes; the calls, in order. */
async function vibrating(run: (calls: unknown[]) => Promise<void>) {
  const calls: unknown[] = []
  const had = Object.getOwnPropertyDescriptor(navigator, 'vibrate')
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (pattern: unknown) => (calls.push(pattern), true) })
  try {
    await run(calls)
  } finally {
    if (had) Object.defineProperty(navigator, 'vibrate', had)
    else delete (navigator as { vibrate?: unknown }).vibrate
  }
}

/**
 * Android haptics (utils/haptics.ts `VOICE_HAPTICS`), one per transition: hold → a firm pulse (45), slide past the
 * cancel distance → a buzz (60) once, however many moves, back → a short pulse (20), release armed → the long
 * "thrown away" pattern. The stand-in for `navigator.vibrate` records the patterns.
 */
export const HoldHapticsSlideLeft: Story = {
  play: async ({ canvasElement }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    await vibrating(async (calls) => {
      const { button, x, y } = await hold(canvas)
      await expect(calls).toEqual([45])
      for (const dx of [-40, -91, -100, -110, -120]) touch(button, 'pointermove', x + dx, y)
      await expect(calls).toEqual([45, 60])
      touch(button, 'pointermove', x - 20, y)
      await expect(calls).toEqual([45, 60, 20])
      touch(button, 'pointermove', x - 105, y)
      touch(button, 'pointerup', x - 105, y)
      await expect(calls).toEqual([45, 60, 20, 60, [60, 40, 90]])
    })
  },
}

/** Slide up to lock: the firm start pulse, then the double pulse, once; the finger lifting after it adds nothing. */
export const HoldHapticsLock: Story = {
  play: async ({ canvasElement }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    await vibrating(async (calls) => {
      const { button, x, y } = await hold(canvas)
      touch(button, 'pointermove', x, y - 40)
      touch(button, 'pointermove', x, y - 80)
      touch(button, 'pointermove', x, y - 120)
      touch(button, 'pointerup', x, y - 120)
      await sleep(100)
      await expect(calls).toEqual([45, [35, 45, 70]])
    })
  },
}

/** Release to send: the start pulse and one medium pulse (30). A tap or a key (the panel) only gets the short start pulse (25). */
export const HoldHapticsSend: Story = {
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    await vibrating(async (calls) => {
      const { button, x, y } = await hold(canvas)
      await sleep(800)
      touch(button, 'pointerup', x, y)
      await waitFor(() => expect(args.onVoice).toHaveBeenCalledTimes(1), { timeout: 5000 })
      await expect(calls).toEqual([45, 30])
    })
  },
}

export const HoldHapticsTap: Story = {
  play: async ({ canvasElement }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    await vibrating(async (calls) => {
      canvas.getByTestId('chat.record').focus()
      await userEvent.keyboard('{Enter}')
      await waitFor(() => expect(canvas.getByTestId('chat.voiceSend')).toBeEnabled(), { timeout: 5000 })
      await expect(calls).toEqual([25])
    })
  },
}

/** `haptics` off silences all of it. */
export const HoldHapticsOff: Story = {
  args: { haptics: false },
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    await vibrating(async (calls) => {
      const { button, x, y } = await hold(canvas)
      await sleep(800)
      touch(button, 'pointerup', x, y)
      await waitFor(() => expect(args.onVoice).toHaveBeenCalledTimes(1), { timeout: 5000 })
      await expect(calls).toEqual([])
    })
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

// ------------------------------------------------------------------ the split send button ("Send as")

// `sendOptions`: a small tab at the left of the send button opens a menu of the ways of sending (here an audience:
// Only me, Friends, Everyone), the send button sends in the selected one, and the selected one is shown by the
// button itself: its icon, its tone (`neutral` the usual ink button, `quiet` a raised one, `accent` the deep
// amber), and its words on the tab when the option is marked. The stories stand the app in: it holds `sendAs`, and
// says what was sent ("Sent as …") so a play function can see it. `voiceMaxMs` follows the option in the
// "private voice" stories, as BetterReads' notes will have it: the microphone for Only me alone.

const AUDIENCE: SendOption[] = [
  { value: 'me', label: 'Only me', hint: 'Just for you, in your own notes', icon: 'lock', tone: 'quiet' },
  { value: 'friends', label: 'Friends', hint: 'The buddies who read this book with you', icon: 'people' },
  { value: 'all', label: 'Everyone', hint: 'Anyone reading this book can see it', icon: 'globe', tone: 'accent' },
]
const AUDIENCE_DE: SendOption[] = [
  { value: 'me', label: 'Nur ich', hint: 'Nur für dich, in deinen eigenen Notizen', icon: 'lock', tone: 'quiet' },
  { value: 'friends', label: 'Freunde', hint: 'Die Buddys, die dieses Buch mit dir lesen', icon: 'people' },
  { value: 'all', label: 'Alle', hint: 'Alle, die dieses Buch lesen, sehen es', icon: 'globe', tone: 'accent' },
]

/** The room above the capsule the menu opens into, and the app's side of the contract (`sendAs`, and voice for Only me alone). */
function splitRender({ privateVoice = false, room = true }: { privateVoice?: boolean; room?: boolean } = {}): Story['render'] {
  return args => ({
    components: { UiComposer, UiComposerChip },
    setup() {
      const text = ref(args.modelValue ?? '')
      const sendAs = ref(args.sendAs ?? 'friends')
      const sent = ref('')
      const voiceMaxMs = computed(() => (privateVoice && sendAs.value !== 'me' ? undefined : args.voiceMaxMs))
      const send = () => {
        sent.value = `${sendAs.value}: ${text.value}`
        text.value = ''
      }
      return { args, text, sendAs, sent, voiceMaxMs, send, room }
    },
    template: `
      <div class="w-[min(100vw-2rem,440px)] rounded-md bg-linear-to-br from-accent-soft to-surface-raised px-md pb-md" :class="room ? 'pt-[17rem]' : 'pt-xl'">
        <UiComposer v-bind="args" v-model="text" v-model:send-as="sendAs" :voice-max-ms="voiceMaxMs" @send="send" />
        <p class="pt-sm text-caption text-ink-muted" data-testid="sent">{{ sent }}</p>
      </div>`,
  })
}

const split = {
  args: { sendOptions: AUDIENCE, sendAs: 'friends', gifs: false, photoAccept: undefined },
  render: splitRender(),
} satisfies Story

const sendAsTab = (canvas: ReturnType<typeof within>) => canvas.getByTestId('chat.sendAs')
const colour = (el: Element) => getComputedStyle(el).backgroundColor

/** At rest, Friends: the field empty and the microphone standing in the button, the tab beside it (the usual neutral cue). */
export const SplitRest: Story = { ...split }

/** Typing to Friends: the usual ink button, the tab with the people icon and a chevron. */
export const SplitTyping: Story = { ...split, args: { ...split.args, modelValue: 'The ending broke me, in the best way.' } }

/** Everyone, typing: the whole button takes the deep amber and the tab says "Everyone". The tone is the cue before sending. */
export const SplitEveryone: Story = {
  ...split,
  args: { ...split.args, sendAs: 'all', modelValue: 'Chapter 12 is the best one so far.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(sendAsTab(canvas)).toHaveTextContent('Everyone')
    await expect(canvas.getByTestId('chat.composer')).toHaveAttribute('data-tone', 'accent')
  },
}

/** Only me, typing: the quiet tone, a raised button, and the tab says "Only me" with the lock. */
export const SplitOnlyMe: Story = {
  ...split,
  args: { ...split.args, sendAs: 'me', modelValue: 'Note to self: reread the letter scene.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(sendAsTab(canvas)).toHaveTextContent('Only me')
    await expect(canvas.getByTestId('chat.composer')).toHaveAttribute('data-tone', 'quiet')
  },
}

/** Everyone with nothing written yet (the microphone): the tab already says who it would go to. */
export const SplitEveryoneEmpty: Story = { ...split, args: { ...split.args, sendAs: 'all' } }

/** Answering a message: the quote over the capsule and the menu over it. */
export const SplitAnswering: Story = {
  ...split,
  args: { ...split.args, sendAs: 'all', quote: { name: 'Sam', preview: 'Did you get to the last chapter yet?' }, modelValue: 'Yes, ' },
}

/** With the app's chips over the field, and the microphone beside the tab. */
export const SplitWithMic: Story = {
  ...split,
  args: { ...split.args, gifs: true, photoAccept: 'image/jpeg,image/png', voiceMaxMs: 120_000 },
}

/** A comment bar (`compact`): send is always drawn, so the tab stands beside it. */
export const SplitCompact: Story = {
  ...split,
  args: { ...split.args, compact: true, placeholder: 'Add a note', label: 'Note', modelValue: 'A note' },
}

/** The tab opened: Send as, three choices with their hints, the chosen one ticked, the focus on it. */
export const SplitMenuOpen: Story = {
  ...split,
  args: { ...split.args, sendAs: 'all', modelValue: 'Chapter 12 is the best one so far.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(sendAsTab(canvas))
    const menu = canvas.getByRole('menu', { name: 'Send as' })
    await waitFor(() => expect(menu).toBeVisible())
    await expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(3)
    await expect(within(menu).getByRole('menuitemradio', { name: /Everyone/ })).toHaveFocus()
    await expect(sendAsTab(canvas)).toHaveAttribute('aria-expanded', 'true')
  },
}

/** Tapping the send button sends in the current option, and the tab and the choice are untouched by it. */
export const SplitTapSendsInTheCurrentOption: Story = {
  ...split,
  args: { ...split.args, sendAs: 'all', modelValue: 'Hello, readers!' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Send · Everyone' }))
    await expect(args.onSend).toHaveBeenCalledTimes(1)
    await expect(canvas.getByTestId('sent')).toHaveTextContent('all: Hello, readers!')
    await expect(sendAsTab(canvas)).toHaveTextContent('Everyone')
    await expect(canvas.queryByRole('menu')).toBeNull()
  },
}

/** The tab opens the menu with the focus on the chosen one; the arrow keys move (and wrap), Home and End jump, Enter chooses and closes. */
export const SplitMenuKeyboard: Story = {
  ...split,
  args: { ...split.args, modelValue: 'Typed to Friends' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tab = sendAsTab(canvas)
    await expect(tab).toHaveAttribute('aria-haspopup', 'menu')
    await expect(tab).toHaveAttribute('aria-expanded', 'false')
    tab.focus()
    await userEvent.keyboard('{Enter}')
    const menu = canvas.getByRole('menu', { name: 'Send as' })
    const [me, friends, everyone] = within(menu).getAllByRole('menuitemradio')
    await expect(tab).toHaveAttribute('aria-expanded', 'true')
    await expect(friends).toHaveFocus()
    await expect(friends).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{ArrowDown}')
    await expect(everyone).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    await expect(me).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    await expect(everyone).toHaveFocus()
    await userEvent.keyboard('{Home}')
    await expect(me).toHaveFocus()
    await userEvent.keyboard('{End}')
    await expect(everyone).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    // Chosen: the menu is gone, the focus is back on the tab, and the button says it.
    await expect(canvas.queryByRole('menu')).toBeNull()
    await expect(tab).toHaveFocus()
    await expect(tab).toHaveAttribute('aria-expanded', 'false')
    await expect(tab).toHaveTextContent('Everyone')
    await expect(tab).toHaveAccessibleName('Send as: Everyone')
  },
}

/** Escape closes the menu, chooses nothing and gives the focus back to the tab. */
export const SplitEscapeReturnsFocus: Story = {
  ...split,
  args: { ...split.args, modelValue: 'Typed to Friends' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tab = sendAsTab(canvas)
    tab.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('{ArrowDown}')
    await expect(canvas.getByRole('menuitemradio', { name: /Everyone/ })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await expect(canvas.queryByRole('menu')).toBeNull()
    await expect(tab).toHaveFocus()
    await expect(tab).toHaveAttribute('aria-expanded', 'false')
    // Nothing was chosen.
    await expect(tab).not.toHaveTextContent('Everyone')
  },
}

/** A tap outside the split button closes the menu; so does the tab again. */
export const SplitOutsideCloses: Story = {
  ...split,
  args: { ...split.args, modelValue: 'Typed to Friends' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(sendAsTab(canvas))
    await waitFor(() => expect(canvas.getByRole('menu')).toBeVisible())
    await userEvent.click(canvas.getByTestId('sent'))
    await expect(canvas.queryByRole('menu')).toBeNull()
    await userEvent.click(sendAsTab(canvas))
    await waitFor(() => expect(canvas.getByRole('menu')).toBeVisible())
    await userEvent.click(sendAsTab(canvas))
    await expect(canvas.queryByRole('menu')).toBeNull()
  },
}

/** A choice held back (`disabled`) shows its reason and cannot be chosen: the menu stays, the option stays. */
export const SplitDisabledOption: Story = {
  ...split,
  args: {
    ...split.args,
    sendOptions: AUDIENCE.map(option => (option.value === 'all' ? { ...option, disabled: true, hint: 'Not for a reply: it stays with your friends' } : option)),
    modelValue: 'A reply',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(sendAsTab(canvas))
    const everyone = canvas.getByRole('menuitemradio', { name: /Everyone/ })
    await expect(everyone).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(everyone)
    await waitFor(() => expect(canvas.getByRole('menu')).toBeVisible())
    await expect(sendAsTab(canvas)).not.toHaveTextContent('Everyone')
  },
}

/** The cue is the button: choosing another option changes its tone (the colour), its icon and the tab's words, before anything is sent. */
export const SplitCueFollowsTheChoice: Story = {
  ...split,
  args: { ...split.args, modelValue: 'Typed to Friends' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const pill = canvas.getByTestId('chat.split')
    const form = canvas.getByTestId('chat.composer')
    const tab = sendAsTab(canvas)
    await expect(form).toHaveAttribute('data-tone', 'neutral')
    await expect(tab).not.toHaveTextContent(/\w/)
    const neutral = colour(pill)
    const choose = async (name: RegExp) => {
      await userEvent.click(tab)
      await userEvent.click(canvas.getByRole('menuitemradio', { name }))
    }
    await choose(/Everyone/)
    await expect(form).toHaveAttribute('data-tone', 'accent')
    await expect(tab).toHaveTextContent('Everyone')
    await waitFor(() => expect(colour(pill)).not.toBe(neutral))
    const accent = colour(pill)
    await choose(/Only me/)
    await expect(form).toHaveAttribute('data-tone', 'quiet')
    await expect(tab).toHaveTextContent('Only me')
    await waitFor(() => expect(colour(pill)).not.toBe(accent))
    await expect(colour(pill)).not.toBe(neutral)
    await choose(/Friends/)
    await expect(form).toHaveAttribute('data-tone', 'neutral')
    await waitFor(() => expect(colour(pill)).toBe(neutral))
    // The send button names the audience too.
    await expect(canvas.getByRole('button', { name: 'Send · Friends' })).toBeVisible()
  },
}

/** With nothing to send the pill is a quiet fill whatever the tone, so it reads as "nothing to send yet". */
export const SplitIdleHasNoTone: Story = {
  ...split,
  args: { ...split.args, sendAs: 'all', voiceMaxMs: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const pill = canvas.getByTestId('chat.split')
    await expect(pill).not.toHaveAttribute('data-live')
    await expect(canvas.getByTestId('chat.send')).toHaveAttribute('aria-disabled', 'true')
    const idle = colour(pill)
    await userEvent.type(canvas.getByRole('textbox'), 'Hi')
    await expect(pill).toHaveAttribute('data-live')
    await waitFor(() => expect(colour(pill)).not.toBe(idle))
  },
}

/** The base's own button is untouched without `sendOptions`: no tab, no split, the same test ids. */
export const SplitAbsentChangesNothing: Story = {
  args: { modelValue: 'Plain', gifs: false, photoAccept: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByTestId('chat.sendAs')).toBeNull()
    await expect(canvas.queryByTestId('chat.split')).toBeNull()
    await expect(canvas.getByTestId('chat.composer')).not.toHaveAttribute('data-tone')
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeVisible()
  },
}

// ------------------------------------------------------- the microphone and the options

/**
 * The microphone beside the tab: the audience can be chosen before recording. The app passes `voiceMaxMs` for Only me
 * alone, so choosing Friends turns the microphone into a (disabled) send and choosing Only me turns it back, while the
 * text and the focus stay where they are. The soft keyboard is stood in (the field keeps its focus through a tap on the
 * tab and the menu).
 */
export const SplitVoiceFollowsTheOption: Story = {
  args: { ...split.args, sendAs: 'me', voiceMaxMs: 120_000 },
  render: splitRender({ privateVoice: true }),
  play: async ({ canvasElement }) => {
    const keyboard = fakeKeyboard()
    const canvas = within(canvasElement)
    const field = canvas.getByRole('textbox')
    await expect(canvas.getByTestId('chat.record')).toBeVisible()
    // The tab beside the microphone, ahead of any recording.
    await expect(sendAsTab(canvas)).toBeVisible()
    await userEvent.click(field)
    keyboard.show()
    await userEvent.click(sendAsTab(canvas))
    await userEvent.click(canvas.getByRole('menuitemradio', { name: /Friends/ }))
    // Friends: no voice, the microphone has made way for send; the field kept the focus.
    await waitFor(() => expect(canvas.queryByTestId('chat.record')).toBeNull())
    await expect(canvas.getByTestId('chat.send')).toHaveAttribute('aria-disabled', 'true')
    await expect(field).toHaveFocus()
    await userEvent.type(field, 'Kept through every change')
    await userEvent.click(sendAsTab(canvas))
    await userEvent.click(canvas.getByRole('menuitemradio', { name: /Only me/ }))
    // Only me with text: it is send, still (text wins over the microphone); the text and the focus are intact.
    await expect(canvas.getByTestId('chat.send')).not.toHaveAttribute('aria-disabled')
    await expect(field).toHaveValue('Kept through every change')
    await expect(field).toHaveFocus()
    // Emptied, Only me is the microphone again; Everyone is send.
    await userEvent.clear(field)
    await waitFor(() => expect(canvas.getByTestId('chat.record')).toBeVisible())
    await expect(field).toHaveFocus()
    await userEvent.click(sendAsTab(canvas))
    await userEvent.click(canvas.getByRole('menuitemradio', { name: /Everyone/ }))
    await waitFor(() => expect(canvas.queryByTestId('chat.record')).toBeNull())
    await expect(field).toHaveFocus()
  },
}

/** A keyboard focus that stood on the microphone moves to the send button that takes its place (and back). */
export const SplitVoiceSwapKeepsKeyboardFocus: Story = {
  args: { ...split.args, sendAs: 'me', voiceMaxMs: 120_000 },
  render: splitRender({ privateVoice: true }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tab = sendAsTab(canvas)
    tab.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('{ArrowUp}{Enter}')
    // Friends (the menu opens on Only me, up wraps to Everyone): no voice either.
    await waitFor(() => expect(canvas.queryByTestId('chat.record')).toBeNull())
    await expect(tab).toHaveFocus()
  },
}

/** Holding the microphone still records with the tab beside it; the tab leaves while recording and the hold is the microphone's alone. */
export const SplitHoldToRecord: Story = {
  args: { ...split.args, sendAs: 'me', voiceMaxMs: 120_000 },
  render: splitRender({ privateVoice: true }),
  play: async ({ canvasElement, args }) => {
    fakeMicrophone()
    const canvas = within(canvasElement)
    const tab = sendAsTab(canvas)
    // A press on the tab starts nothing.
    const over = tab.getBoundingClientRect()
    tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: over.left + 4, clientY: over.top + 4, button: 0 }))
    await sleep(150)
    await expect(canvas.queryByTestId('chat.recorder')).toBeNull()
    tab.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: over.left + 4, clientY: over.top + 4, button: 0 }))
    // A press on the microphone records.
    const { button, x, y } = await hold(canvas)
    await expect(canvas.queryByTestId('chat.sendAs')).toBeNull()
    await sleep(700)
    touch(button, 'pointerup', x, y)
    await waitFor(() => expect(args.onVoice).toHaveBeenCalledTimes(1), { timeout: 5000 })
    await waitFor(() => expect(canvas.getByTestId('chat.sendAs')).toBeVisible())
  },
}

// ------------------------------------------------------- nothing folds with the keyboard but the chips, and only for the keyboard

/** The chips' row folds only while the field has the focus AND a keyboard is up: the focus alone leaves it open. */
export const ChipsStayOpenWithTheFocusAlone: Story = {
  render: WithChips.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const row = canvas.getByTestId('chat.actions')
    await userEvent.click(canvas.getByRole('textbox'))
    await expect(canvas.getByRole('textbox')).toHaveFocus()
    // A desktop, a hardware keyboard: no soft keyboard, nothing to make room for.
    await sleep(300)
    await expect(row).not.toHaveAttribute('data-folded')
    await expect(row).not.toHaveAttribute('inert')
  },
}

/** The keyboard comes: the row folds; Android's back button closes it with the focus kept: the row unfolds; it comes back: it folds again. */
export const ChipsFoldWithTheKeyboard: Story = {
  render: WithChips.render,
  play: async ({ canvasElement }) => {
    const keyboard = fakeKeyboard()
    const canvas = within(canvasElement)
    const row = canvas.getByTestId('chat.actions')
    const field = canvas.getByRole('textbox')
    await userEvent.click(field)
    await expect(row).not.toHaveAttribute('data-folded')
    keyboard.show()
    await waitFor(() => expect(row).toHaveAttribute('data-folded'))
    await expect(row).toHaveAttribute('inert')
    keyboard.hide()
    await waitFor(() => expect(row).not.toHaveAttribute('data-folded'))
    await expect(row).not.toHaveAttribute('inert')
    await expect(field).toHaveFocus()
    keyboard.show()
    await waitFor(() => expect(row).toHaveAttribute('data-folded'))
    // Left, the keyboard goes: the row is back as well.
    field.blur()
    keyboard.hide()
    await waitFor(() => expect(row).not.toHaveAttribute('data-folded'))
  },
}

/** The compact bar's note keeps its row open through the keyboard, as before. */
export const CompactNoteStaysWithTheKeyboard: Story = {
  args: { compact: true, gifs: false, photoAccept: undefined, placeholder: 'Add a comment', label: 'Comment', note: 'Replying to Sam', noteLabel: 'Cancel reply' },
  play: async ({ canvasElement }) => {
    const keyboard = fakeKeyboard()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('textbox'))
    keyboard.show()
    await sleep(300)
    await expect(canvas.getByTestId('chat.actions')).not.toHaveAttribute('data-folded')
    await expect(canvas.getByTestId('chat.note')).toBeVisible()
  },
}

/**
 * Nothing about the options folds away with the keyboard (the notes composer's bug: the row went on focus and did
 * not come back): with the keyboard up the tab and the button stay, and the menu opens above the field.
 */
export const SplitStaysWithTheKeyboard: Story = {
  ...split,
  args: { ...split.args, gifs: true, photoAccept: 'image/jpeg,image/png', sendAs: 'all', modelValue: 'Typing with the keyboard up' },
  play: async ({ canvasElement }) => {
    const keyboard = fakeKeyboard()
    const canvas = within(canvasElement)
    const field = canvas.getByRole('textbox')
    await userEvent.click(field)
    keyboard.show()
    await waitFor(() => expect(canvas.getByTestId('chat.actions')).toHaveAttribute('data-folded'))
    await expect(sendAsTab(canvas)).toBeVisible()
    await expect(canvas.getByTestId('chat.send')).toBeVisible()
    // The tab does not take the field's focus (or the keyboard): the menu opens over it, and a tap on a choice goes through.
    await userEvent.click(sendAsTab(canvas))
    await waitFor(() => expect(canvas.getByRole('menu')).toBeVisible())
    await expect(field).toHaveFocus()
    await userEvent.click(canvas.getByRole('menuitemradio', { name: /Only me/ }))
    await expect(canvas.queryByRole('menu')).toBeNull()
    await expect(sendAsTab(canvas)).toHaveTextContent('Only me')
    await expect(field).toHaveFocus()
    // Escape from the field closes a menu that left the focus there.
    await userEvent.click(sendAsTab(canvas))
    await userEvent.keyboard('{Escape}')
    await expect(canvas.queryByRole('menu')).toBeNull()
  },
}

/** A short screen with the keyboard up (360 × 640): the menu keeps one line per choice and stays in view above the field. */
export const SplitMenuShortScreen: Story = {
  ...split,
  args: { ...split.args, modelValue: 'Short screen' },
  play: async ({ canvasElement }) => {
    const keyboard = fakeKeyboard()
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('textbox'))
    // 349 px in view, as an iPhone SE shows with the keyboard up (or what the window allows).
    keyboard.show(Math.min(349, window.innerHeight - 200))
    await waitFor(() => expect(canvas.getByRole('textbox')).toBeVisible())
    await userEvent.click(sendAsTab(canvas))
    const menu = canvas.getByRole('menu')
    await waitFor(() => expect(menu).toBeVisible())
    await expect(canvas.queryByText('Just for you, in your own notes')).toBeNull()
    // Still a 44 px target each.
    for (const item of within(menu).getAllByRole('menuitemradio')) await expect(item.getBoundingClientRect().height).toBeGreaterThanOrEqual(43.9)
  },
}

/** The finger's 44 px: the tab and the button each. */
export const SplitTouchTargets: Story = {
  ...split,
  args: { ...split.args, modelValue: 'Targets' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const el of [sendAsTab(canvas), canvas.getByTestId('chat.send')]) {
      const box = el.getBoundingClientRect()
      const after = getComputedStyle(el, '::after')
      const reach = box.height + Math.abs(Number.parseFloat(after.top)) * 2
      await expect(box.width).toBeGreaterThanOrEqual(44)
      await expect(reach).toBeGreaterThanOrEqual(44)
    }
  },
}

// ------------------------------------------------------- 200 %, motion, direction, words

/** The text at 200 %: the tab grows with its word, the menu with its words (one tap each), and nothing runs out of the screen. */
export const SplitLargeText: Story = {
  ...split,
  decorators: [largeText],
  args: { ...split.args, sendAs: 'all', modelValue: 'Big text' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(sendAsTab(canvas)).toHaveTextContent('Everyone')
    await userEvent.click(sendAsTab(canvas))
    const menu = canvas.getByRole('menu')
    const frame = (canvasElement.firstElementChild as HTMLElement).getBoundingClientRect()
    for (const item of within(menu).getAllByRole('menuitemradio')) {
      const box = item.getBoundingClientRect()
      await expect(box.height).toBeGreaterThanOrEqual(44)
      await expect(box.right).toBeLessThanOrEqual(frame.right + 1)
      // The words are whole: not cut by an ellipsis or a clip.
      await expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1)
    }
    await expect(fitsTheScreen()).toBe(true)
  },
}

/** Reduced motion: the menu opens without its rise, and the choice still works. */
export const SplitReducedMotion: Story = {
  ...split,
  globals: { motion: 'reduce' },
  args: { ...split.args, modelValue: 'Calm' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(sendAsTab(canvas))
    const pop = canvas.getByTestId('chat.sendAsPopover')
    await waitFor(() => expect(getComputedStyle(pop).animationName === 'none' || Number.parseFloat(getComputedStyle(pop).animationDuration) < 0.02).toBe(true))
    await userEvent.click(canvas.getByRole('menuitemradio', { name: /Everyone/ }))
    await expect(sendAsTab(canvas)).toHaveTextContent('Everyone')
  },
}

/** Right to left: the tab stays beside the button on the start side of it, the menu hangs from the end side, and the keys work as before. */
export const SplitRtl: Story = {
  ...split,
  args: { ...split.args, sendAs: 'all', modelValue: 'مرحبا' },
  decorators: [() => ({ template: '<div dir="rtl"><story /></div>' })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tab = sendAsTab(canvas)
    await expect(tab.getBoundingClientRect().left).toBeGreaterThan(canvas.getByTestId('chat.send').getBoundingClientRect().left)
    await userEvent.click(tab)
    const menu = canvas.getByRole('menu')
    const capsule = canvas.getByTestId('chat.composer').getBoundingClientRect()
    // Hanging from the end side: the left edge, in RTL.
    await expect(Math.abs(menu.parentElement!.getBoundingClientRect().left - capsule.left)).toBeLessThan(2)
    await userEvent.keyboard('{ArrowDown}')
    await expect(canvas.getAllByRole('menuitemradio')[0]).toHaveFocus()
  },
}

/** The German sample: "Senden als", the options in German, "Alle" on the tab. */
export const SplitGerman: Story = {
  ...split,
  args: { ...split.args, sendOptions: AUDIENCE_DE, sendAs: 'all', modelValue: 'Das Ende hat mich umgehauen.', placeholder: undefined },
  globals: { locale: 'de' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(sendAsTab(canvas)).toHaveAccessibleName('Senden als: Alle')
    await userEvent.click(sendAsTab(canvas))
    await waitFor(() => expect(canvas.getByRole('menu', { name: 'Senden als' })).toBeVisible())
  },
}

export const SplitNight: Story = { ...SplitEveryone, globals: { theme: 'night' } }
export const SplitNightOnlyMe: Story = { ...SplitOnlyMe, globals: { theme: 'night' } }
export const SplitNightMenu: Story = { ...SplitMenuOpen, globals: { theme: 'night' } }
