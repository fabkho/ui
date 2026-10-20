import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, waitFor } from 'storybook/test'
import UiSearchPalette from './SearchPalette.vue'
import UiButton from './Button.vue'
import UiIcon from './Icon.vue'

// The palette is a modal layer: while it is open the rest of the page is `inert` and focus is in the query. Every
// story therefore shows a button that opens it, and the stories are drawn in an iframe in the docs page
// (`inline: false`), so the page around them is not locked.
const BOOKS = [
  { id: 'dispossessed', title: 'The Dispossessed', author: 'Ursula K. Le Guin' },
  { id: 'left-hand', title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin' },
  { id: 'earthsea', title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin' },
  { id: 'always-coming-home', title: 'Always Coming Home', author: 'Ursula K. Le Guin' },
  { id: 'lathe', title: 'The Lathe of Heaven', author: 'Ursula K. Le Guin' },
  { id: 'hyperion', title: 'Hyperion', author: 'Dan Simmons' },
  { id: 'dune', title: 'Dune', author: 'Frank Herbert' },
  { id: 'solaris', title: 'Solaris', author: 'Stanisław Lem' },
  { id: 'neuromancer', title: 'Neuromancer', author: 'William Gibson' },
  { id: 'foundation', title: 'Foundation', author: 'Isaac Asimov' },
  { id: 'kindred', title: 'Kindred', author: 'Octavia E. Butler' },
  { id: 'piranesi', title: 'Piranesi', author: 'Susanna Clarke' },
  { id: 'ancillary', title: 'Ancillary Justice', author: 'Ann Leckie' },
]

// What the app puts in the slot: a listbox of answers, filtered by the query. The combobox attributes
// (`aria-expanded`, `aria-controls`) go to the <input> through `v-bind="$attrs"`.
const RESULTS = `
  <ul
    v-if="found.length"
    id="results"
    role="listbox"
    aria-label="Books"
    tabindex="0"
    class="max-h-[40dvh] overflow-y-auto py-xs"
  >
    <li v-for="book in found" :key="book.id" role="option" aria-selected="false" class="flex min-h-(--size-row) items-center gap-ms px-inset hover:bg-fill">
      <UiIcon name="library" :size="18" class="shrink-0 text-ink-faint" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-body">{{ book.title }}</span>
        <span class="block truncate text-footnote text-ink-muted">{{ book.author }}</span>
      </span>
    </li>
  </ul>
  <p v-else-if="query" id="results" class="px-inset py-md text-subhead text-ink-muted">No books match “{{ query }}”.</p>
  <p v-else id="results" class="px-inset py-md text-subhead text-ink-muted">Search your library by title or author.</p>`

/** When the palette is open: waits until it has finished rising and fading in (Web Animations). */
async function settled({ open = false } = {}) {
  const find = () => document.body.querySelector('[role=dialog]')
  if (open) await waitFor(() => expect(find()).not.toBeNull())
  const dialog = find()
  if (dialog) await waitFor(() => expect(dialog.getAnimations()).toHaveLength(0))
}

/** The palette with a button that opens it (or already open) and a listbox of answers filtered by the query. */
function renderPalette(startOpen: boolean) {
  return (args: Record<string, any>) => ({
    components: { UiSearchPalette, UiButton, UiIcon },
    setup() {
      const query = ref<string>(args.query)
      const found = computed(() => {
        const q = query.value.trim().toLowerCase()
        return q ? BOOKS.filter(book => `${book.title} ${book.author}`.toLowerCase().includes(q)) : []
      })
      return { args, open: ref(startOpen), query, found }
    },
    template: `
      <div class="flex min-h-[520px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">Search</UiButton>
        <UiSearchPalette
          v-bind="args"
          v-model:open="open"
          v-model:query="query"
          :status="found.length ? found.length + ' books found' : ''"
          :aria-expanded="found.length > 0"
          aria-controls="results"
        >${RESULTS}</UiSearchPalette>
      </div>`,
  })
}

const meta = {
  title: 'Base/SearchPalette',
  component: UiSearchPalette,
  args: {
    open: false,
    query: '',
    label: 'Search your library',
    placeholder: 'Title or author',
    clear: 'Clear search',
    testid: 'search',
    status: '',
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'An over-the-page search palette: a raised card above the keyboard whose query row (glyph, field, clear, Cancel) sits at the bottom and whose answers, the default slot, stand above it, the nearest last.',
      },
      story: { inline: false, iframeHeight: 560 },
    },
  },
  render: renderPalette(false),
} satisfies Meta<typeof UiSearchPalette>
export default meta
type Story = StoryObj<typeof meta>

/** No query yet: the app's own prompt stands where the answers will be. */
export const Empty: Story = {}

/** A query with answers: the nearest is at the bottom, by the query row. The query row has the search glyph, the field, clear and Cancel. */
export const WithResults: Story = { args: { query: 'le guin' } }

/** A query nothing matches: the app says so in the slot. */
export const NoResults: Story = { args: { query: 'zzyzx' } }

/** More answers than fit: the app's list scrolls in the slot, the palette stays above the keyboard. */
export const ManyResults: Story = { args: { query: 'e' } }

/** The words are the app's (label, placeholder, clear); Cancel is the layer's own (`ui.text.cancel`, here the German sample), or the `cancel` prop's. */
export const GermanWords: Story = {
  args: { query: 'le guin', label: 'Bibliothek durchsuchen', placeholder: 'Titel oder Autor:in', clear: 'Suche löschen' },
  globals: { locale: 'de' },
}

/** Starts open, for looking at the palette at rest. */
export const Open: Story = {
  args: { query: 'le guin' },
  play: () => settled({ open: true }),
  render: renderPalette(true),
}

/** The dark theme, open. */
export const Night: Story = { args: { query: 'le guin' }, globals: { theme: 'night' }, play: Open.play, render: renderPalette(true) }
