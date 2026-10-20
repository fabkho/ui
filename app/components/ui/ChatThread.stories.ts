import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import UiAvatar from './Avatar.vue'
import UiBubble from './Bubble.vue'
import UiChatThread from './ChatThread.vue'
import UiComposer from './Composer.vue'
import UiRoundButton from './RoundButton.vue'
import UiSkeleton from './Skeleton.vue'
import { ago, EMOJIS, message, photoMessage, picture, quote, voiceMessage } from '../../../.storybook/chat-fixtures'
import type { BubbleMessage, BubbleQuote } from '../../utils/chat/message'

/** What the app's message adds to the base's: a quote, a sender (groups). */
type Item = BubbleMessage & { quote?: BubbleQuote | null; sender?: string | null }

const DAY = 24 * 60
const sam = (partial: Partial<Item> = {}): Item => message({ mine: false, ...partial })
const me = (partial: Partial<Item> = {}): Item => message({ mine: true, ...partial })

/** A conversation of two days: a system line, runs of both sides, a quote, a voice message, a photo, reactions, a failed send. */
function conversation(): Item[] {
  return [
    sam({ body: 'Did you get to the last chapter yet?', createdAt: ago(DAY + 150) }),
    me({ body: 'Not yet, I am saving it for tonight.', createdAt: ago(DAY + 140) }),
    me({ body: 'No spoilers please!', createdAt: ago(DAY + 139) }),
    message({ kind: 'system', body: 'Sam shared a phone number', mine: false, id: null, createdAt: ago(DAY + 100) }),
    sam({ body: 'Good morning! I finished it on the train.', createdAt: ago(190) }),
    sam({ body: 'The last chapter is wonderful.', createdAt: ago(189), reactions: [{ emoji: '🔥', count: 1, mine: true }], myReaction: '🔥' }),
    me({ body: 'Yes, and it was worth the wait!', createdAt: ago(120), quote: quote({ preview: 'The last chapter is wonderful.' }) }),
    sam({ ...voiceMessage({ createdAt: ago(60) }) }),
    me({ ...photoMessage({ mine: true, createdAt: ago(40) }, { width: 320, height: 240, url: picture(320, 240) }), reactions: [{ emoji: '❤️', count: 1, mine: false }] }),
    me({ body: 'Are you coming on Friday?', createdAt: ago(5), id: null, delivery: 'failed' }),
  ]
}

const PEOPLE = ['Alex', 'Jo', 'Sam']
/** A group's run is the same sender, not the same side. */
function group(): Item[] {
  const says = (sender: string, body: string, at: number, extra: Partial<Item> = {}) => message({ mine: sender === 'You', body, createdAt: ago(at), ...extra }) as Item & { sender: string }
  return [
    Object.assign(says('Alex', 'Which book do we pick for March?', 90), { sender: 'Alex' }),
    Object.assign(says('Alex', 'I vote for the Ishiguro.', 89), { sender: 'Alex' }),
    Object.assign(says('Jo', 'Second!', 80, { reactions: [{ emoji: '❤️', count: 3, mine: true }, { emoji: '😂', count: 5, mine: false }] }), { sender: 'Jo' }),
    Object.assign(says('Sam', 'I have not read anything this month…', 60), { sender: 'Sam' }),
    Object.assign(says('You', 'Then March is perfect for starting.', 30), { sender: 'You' }),
  ]
}

/** The screen as an app builds it: a top bar, the conversation's head, a bubble per message, the composer docked below. */
const render = (extra: { composer?: boolean; head?: boolean } = {}): Story['render'] => args => ({
  components: { UiAvatar, UiBubble, UiChatThread, UiComposer, UiRoundButton, UiSkeleton },
  setup() {
    const items = ref<Item[]>(args.items as Item[])
    const text = ref('')
    const replyTo = ref<Pick<BubbleQuote, 'name' | 'preview'> | null>(null)
    const thread = useTemplateRef<{ jumpTo: (id: string) => Promise<void> }>('thread')
    const patch = (key: string, change: Partial<Item>) => (items.value = items.value.map(item => (item.key === key ? { ...item, ...change } : item)))
    const readKey = computed(() => [...items.value].reverse().find(item => item.mine && item.delivery === 'sent')?.key)
    return {
      args,
      items,
      text,
      replyTo,
      thread,
      readKey,
      emojis: EMOJIS,
      people: PEOPLE,
      // A tap on the bar's emoji puts my reaction on the message, or takes it back.
      react(id: string, emoji: string) {
        const item = items.value.find(one => one.id === id)
        if (!item) return
        const taking = item.myReaction === emoji
        const others = item.reactions.filter(one => one.emoji !== emoji)
        const mine = item.reactions.find(one => one.emoji === emoji)
        const count = (mine?.count ?? 0) + (taking ? -1 : 1)
        patch(item.key, {
          myReaction: taking ? null : emoji,
          reactions: count > 0 ? [...others, { emoji, count, mine: !taking }] : others,
        })
      },
      retry(key: string) {
        patch(key, { delivery: 'sending' })
        setTimeout(() => patch(key, { delivery: 'sent', id: `sent-${key}` }), 2000)
      },
      reply(key: string) {
        const item = items.value.find(one => one.key === key)
        if (item) replyTo.value = { name: item.mine ? 'You' : (item.sender ?? 'Sam'), preview: item.body || '🎤 Voice message' }
      },
      send() {
        const body = text.value.trim()
        if (!body) return
        const sent = me({ body, id: null, delivery: 'sending', createdAt: new Date().toISOString() }) as Item
        if (replyTo.value) sent.quote = quote({ name: replyTo.value.name, preview: replyTo.value.preview })
        items.value = [...items.value, sent]
        text.value = ''
        replyTo.value = null
        setTimeout(() => patch(sent.key, { delivery: 'sent', id: `sent-${sent.key}` }), 900)
      },
      showHead: extra.head ?? true,
      showComposer: extra.composer ?? true,
    }
  },
  template: `
    <UiChatThread ref="thread" v-bind="args" :items="items" :head-shown="showHead">
      <template #top>
        <UiRoundButton icon="back" label="Back" class="pointer-events-auto" />
        <div class="pointer-events-auto flex items-center gap-sm">
          <UiAvatar initials="SM" size="sm" />
          <span class="text-subhead font-medium text-ink">{{ args.label }}</span>
        </div>
        <span class="size-(--size-touch)" aria-hidden="true" />
      </template>
      <template #head>
        <div class="flex flex-col items-center gap-xs px-lg py-xl text-center">
          <UiAvatar initials="SM" size="lg" />
          <p class="text-headline text-ink">{{ args.label }}</p>
          <p class="text-subhead text-ink-muted">Reading Persuasion together since October.</p>
        </div>
      </template>
      <template #loading-head>
        <div class="flex flex-col items-center gap-xs px-lg py-xl"><UiSkeleton class="size-(--size-avatar-xl) rounded-pill" /><UiSkeleton class="h-md w-1/3" /></div>
      </template>
      <template #message="{ item, signed, endsRun, reacting, placement, highlight, openReactions, closeReactions }">
        <p v-if="item.kind === 'system'" class="px-lg py-xs text-center text-caption text-ink-faint">{{ item.body }}</p>
        <UiBubble
          v-else
          :item="item"
          :read="item.key === readKey"
          :fresh="false"
          :signed="signed"
          :sender="item.sender"
          :ends-run="endsRun"
          :can-react="!!item.id"
          :emojis="emojis"
          :quote="item.quote"
          :reacting="reacting"
          :placement="placement"
          :highlight="highlight"
          @react-open="openReactions"
          @react-close="closeReactions"
          @react="react"
          @retry="retry"
          @reply="reply"
          @quote-tap="id => thread?.jumpTo(id)"
        />
      </template>
      <template #state><p class="px-lg pt-xxl text-center text-body text-ink-muted">This conversation is not available.</p></template>
      <template v-if="showComposer" #composer>
        <UiComposer v-model="text" gifs photo-accept="image/jpeg,image/png" :voice-max-ms="120000" :quote="replyTo" @send="send" @cancel-quote="replyTo = null" />
      </template>
    </UiChatThread>`,
})

// The thread is the whole screen (`position: fixed`, its bottom on the keyboard), so the stories are full
// screen, drawn in an iframe in the docs, and best looked at in the iPhone 390×844 viewport. The
// conversation is live: react, answer (the reaction bar's "Reply"), retry the failed message, send one.
const meta = {
  title: 'Chat/ChatThread',
  component: UiChatThread,
  args: {
    items: [] as Item[],
    status: 'ready',
    label: 'Sam',
    conversationKey: 'sam',
    hasMore: false,
    olderStatus: 'idle',
    offline: false,
    error: null,
    notice: null,
    headShown: true,
    testid: 'chat',
  },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 720 } } },
  render: render(),
} satisfies Meta<typeof UiChatThread>
export default meta
type Story = StoryObj<typeof meta>

/**
 * Two days of a chat: day separators ("Yesterday", "Today", written out by `dayLabel`), a system line that
 * breaks a run, runs where only the last bubble has the tail, a quote, a voice message, a photo, reactions,
 * "Read" under my last sent message, and a message that did not go out (tap to retry).
 */
export const Conversation: Story = {
  args: { items: conversation() },
  globals: { viewport: { value: 'iphone', isRotated: false } },
}

/**
 * `landmark`: the screen is a `region` named by `label` ("Sam"), so it shows in the landmark list. The play function
 * finds it by that name and checks the thread inside it. The default story has no region (`landmark` is off).
 */
export const Landmark: Story = {
  args: { items: conversation(), landmark: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = await canvas.findByRole('region', { name: 'Sam' })
    await expect(within(region).getByRole('list', { name: 'Sam' })).toBeInTheDocument()
  },
}

/** Opens the reaction bar on a message with the bubble's "React" button (the one for keyboards and VoiceOver), then picks. */
export const ReactionBarOpen: Story = {
  args: { items: conversation() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first] = await canvas.findAllByTestId('chat.react')
    await userEvent.click(first!)
    await waitFor(() => expect(canvas.getByRole('toolbar', { name: 'Choose a reaction' })).toBeVisible())
  },
}

/** Sending: the new message is "sending" for a moment, then stored. */
export const SendingAMessage: Story = {
  args: { items: conversation().slice(4, 7) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByTestId('chat.input'), 'See you on Friday!')
    await userEvent.click(canvas.getByTestId('chat.send'))
    // Stored after a moment; the check runs on the settled bubble, not on its fade.
    await waitFor(() => expect(canvas.getByText('See you on Friday!').closest('[data-delivery]')).toHaveAttribute('data-delivery', 'sent'), { timeout: 4000 })
  },
}

/** A conversation that has just begun: the head, and nothing else. */
export const NoMessagesYet: Story = { args: { items: [] } }

/** `status: 'loading'`: the head's placeholder and three bubbles' placeholders, a status for a screen reader. */
export const Loading: Story = { args: { status: 'loading' } }

/** Any other `status` draws the `state` slot (unavailable, an error) and no composer. */
export const Unavailable: Story = { args: { status: 'unavailable' } }

// The pills with two counts ("Heart from 3, Laughing from 5") say both numbers in their names; axe's
// `label-content-name-mismatch` wants them side by side: see Bubble.stories.ts.
/** A group: a run is one sender's (`sameRun`), the name stands over the first bubble, reaction counts go past two. */
export const Group: Story = {
  parameters: { a11y: { config: { rules: [{ id: 'label-content-name-mismatch', enabled: false }] } } },
  args: {
    items: group(),
    label: 'Book club',
    sameRun: (before: Item, item: Item) => before.sender === item.sender && before.kind !== 'system' && item.kind !== 'system',
  },
  render: render({ head: false }),
}

/** There are earlier messages: a line at the top loads them as the thread is scrolled up there. */
export const LoadingEarlierMessages: Story = { args: { items: conversation().slice(4), hasMore: true, olderStatus: 'loading' } }

/** Loading earlier messages failed: a button to try again. */
export const EarlierMessagesFailed: Story = { args: { items: conversation().slice(4), hasMore: true, olderStatus: 'error' } }

/** No connection: one quiet line under the top bar. */
export const Offline: Story = { args: { items: conversation().slice(4, 8), offline: true } }

/** A sentence over the composer: a photo that could not be sent, a reaction that did not arrive. */
export const WithError: Story = { args: { items: conversation().slice(4, 8), error: 'The photo could not be sent. Please try again.' } }

/** A conversation that has become read-only: a quiet line in the composer's place. */
export const ReadOnly: Story = { args: { items: conversation().slice(4, 8), notice: 'Sam has left the book club. You can still read this conversation.' } }

export const German: Story = { args: { items: conversation(), label: 'Sam' }, globals: { locale: 'de' } }
export const GermanOffline: Story = { args: { items: conversation().slice(4, 8), offline: true }, globals: { locale: 'de' } }
export const Night: Story = { args: { items: conversation() }, globals: { theme: 'night' } }
export const NightLoading: Story = { args: { status: 'loading' }, globals: { theme: 'night' } }
