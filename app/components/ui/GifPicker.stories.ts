import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import UiGifPicker from './GifPicker.vue'
import UiButton from './Button.vue'
import { brokenGifSearch, fakeGifSearch, GIF_FEEDS, slowGifSearch } from '../../../.storybook/chat-fixtures'

// The picker is a sheet, so it is a modal layer: while it is open the rest of the page is `inert` and focus is
// inside it. Every story shows a button that opens it, and (as for UiSheet) the docs page draws them in an
// iframe. The provider is a local fake: gradients as data URIs, no network. Type "broken" to see its error,
// "nothing" for no results; every other search has two pages.
const meta = {
  title: 'Chat/GifPicker',
  component: UiGifPicker,
  args: { open: false, search: fakeGifSearch(), feeds: GIF_FEEDS, attribution: 'Powered by Fake GIFs', testid: 'chat', onPick: fn() },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 700 } } },
  render: args => ({
    components: { UiGifPicker, UiButton },
    setup() {
      // `open` starts false and is set after the mount: the picker loads when `open` *changes* to true.
      const open = ref(false)
      if (args.open) onMounted(() => nextTick(() => (open.value = true)))
      const picked = ref('')
      return { args, open, picked, onPick: (gif: { id: string }, q: string) => (picked.value = `${gif.id}${q ? ` (found by “${q}”)` : ''}`) }
    },
    template: `
      <div class="flex min-h-[640px] flex-col items-center justify-center gap-md bg-surface">
        <UiButton tone="secondary" @click="open = true">Find a GIF</UiButton>
        <p class="text-caption text-ink-muted" role="status">{{ picked ? 'Picked ' + picked : 'Nothing picked yet' }}</p>
        <UiGifPicker v-bind="args" v-model:open="open" @pick="onPick" />
      </div>`,
  }),
} satisfies Meta<typeof UiGifPicker>
export default meta
type Story = StoryObj<typeof meta>

const gifs = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body)

/** Opens on the first topic chip; each chip is one search of the provider. A tap on a GIF picks it and closes the sheet. */
export const Default: Story = {}

/** Starts open, on the first topic. */
export const Open: Story = {
  args: { open: true },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(gifs(canvasElement).getAllByTestId('chat.gif').length).toBeGreaterThan(0), { timeout: 5000 })
  },
}

/**
 * The topic chips are a radio group (APG): Tab from the field lands on the chosen chip, the arrows move the choice
 * and the focus (and load that topic's GIFs), and they wrap. The GIFs are list items around their buttons
 * (`<li><button>`), in two lists, one per column.
 */
export const KeyboardTopics: Story = {
  args: { open: true },
  play: async ({ canvasElement }) => {
    const body = gifs(canvasElement)
    await waitFor(() => expect(body.getAllByTestId('chat.gif').length).toBeGreaterThan(0), { timeout: 5000 })
    for (const gif of body.getAllByTestId('chat.gif')) await expect(gif.closest('li')).not.toBeNull()
    const [trending, reading] = body.getAllByRole('radio')
    const last = body.getByRole('radio', { name: 'Wow' })
    await userEvent.click(await body.findByTestId('chat.gifSearch'))
    await userEvent.clear(body.getByTestId('chat.gifSearch'))
    await userEvent.tab()
    await expect(trending).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(reading).toHaveFocus()
    await expect(reading).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    await expect(last).toHaveFocus()
    await expect(last).toHaveAttribute('aria-checked', 'true')
    await waitFor(() => expect(body.getAllByTestId('chat.gif').length).toBeGreaterThan(0), { timeout: 5000 })
  },
}

/** Mounted with `open` already true (not opened by a tap): it loads at once, as it does on a tap. */
export const OpenFromTheStart: Story = {
  args: { open: true },
  render: args => ({
    components: { UiGifPicker },
    setup: () => ({ args, open: ref(true) }),
    template: '<UiGifPicker v-bind="args" v-model:open="open" />',
  }),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(gifs(canvasElement).getAllByTestId('chat.gif').length).toBeGreaterThan(0), { timeout: 5000 })
  },
}

/** A search leaves the topic chips unchosen; the heading says what was searched ("For “cats”"). */
export const Searching: Story = {
  args: { open: true },
  play: async ({ canvasElement }) => {
    const body = gifs(canvasElement)
    await userEvent.type(await body.findByTestId('chat.gifSearch'), 'cats')
    await waitFor(() => expect(body.getByTestId('chat.gifHeading')).toBeVisible(), { timeout: 5000 })
    await waitFor(() => expect(body.getAllByTestId('chat.gif').length).toBeGreaterThan(0))
  },
}

/** "Load more" fetches the next page; the provider's attribution stays at the foot. */
export const LoadMore: Story = {
  args: { open: true },
  play: async ({ canvasElement }) => {
    const body = gifs(canvasElement)
    await waitFor(() => expect(body.getByTestId('chat.gifMore')).toBeVisible(), { timeout: 5000 })
    const before = body.getAllByTestId('chat.gif').length
    await userEvent.click(body.getByTestId('chat.gifMore'))
    await waitFor(() => expect(body.getAllByTestId('chat.gif').length).toBeGreaterThan(before), { timeout: 5000 })
  },
}

/** Nothing found for the words: a plain line. */
export const NoResults: Story = {
  args: { open: true },
  play: async ({ canvasElement }) => {
    const body = gifs(canvasElement)
    await userEvent.type(await body.findByTestId('chat.gifSearch'), 'nothing')
    await waitFor(() => expect(body.getByTestId('chat.gifNone')).toBeVisible(), { timeout: 5000 })
  },
}

/** The provider failed: its sentence and a retry button. */
export const ProviderError: Story = {
  args: { open: true, search: brokenGifSearch },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(gifs(canvasElement).getByTestId('chat.gifError')).toBeVisible(), { timeout: 5000 })
  },
}

/** While the first page is on its way: skeletons in the grid, a status for a screen reader. */
export const Loading: Story = { args: { open: true, search: slowGifSearch } }

/** No feeds, no chips: the field and the first search only. */
export const WithoutFeeds: Story = { args: { feeds: [] } }

/** The provider may prescribe the field's placeholder. */
export const ProviderPlaceholder: Story = { args: { open: true, placeholder: 'Search the fake GIF library' } }

export const German: Story = { args: { open: true, attribution: 'Bereitgestellt von Fake GIFs' }, globals: { locale: 'de' } }
export const GermanNoResults: Story = {
  args: { open: true },
  globals: { locale: 'de' },
  play: async ({ canvasElement }) => {
    const body = gifs(canvasElement)
    await userEvent.type(await body.findByTestId('chat.gifSearch'), 'nothing')
    await waitFor(() => expect(body.getByTestId('chat.gifNone')).toBeVisible(), { timeout: 5000 })
  },
}

export const Night: Story = { ...Open, globals: { theme: 'night' } }
