<script setup lang="ts">
import UiButton from './Button.vue'
import UiPill from './Pill.vue'
import UiSheet from './Sheet.vue'
import UiSkeleton from './Skeleton.vue'
import { useUiText } from '../../composables/useUiText'
import { gifColumns, latestRequest, type GifFeed, type GifItem, type GifSearch } from '../../utils/chat/gif'
import { fillWords } from '../../utils/chat/words'

// The GIF picker (moved into the base unchanged in look and behaviour): a tall sheet with a search
// field, and while it is empty the GIFs of a topic, chosen by chips under the field (`feeds`, where it
// opens on the first; each is one search of the provider, shown as the provider ranks it; no feeds, no
// chips). A search leaves the chips unchosen, a chip clears the search. A grid of two columns, "Load
// more" and the provider's attribution (`attribution`, or the slot) at the foot. A tap picks the GIF
// (`pick`, with the words that found it — a chip's `query` too — for a provider's share count) and
// closes the sheet. Each GIF's button is named by its title when the provider gives one, else by its
// place in the grid.
//
// The provider is the app's (`search`: asked from the phone itself, as some providers' terms want; its
// key, its filters and its page size are the app's), and so are its own words: the field's
// `placeholder` (a provider may prescribe it) and the attribution. Typing waits 400 ms before it
// searches; a slow answer to an earlier search never replaces a newer one (`latestRequest`).
const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(
  defineProps<{
    /** The provider: a page of GIFs for the search words, or for a chip's topic while there are none. */
    search: GifSearch
    /** The chips under the field; the picker opens on the first. */
    feeds: readonly GifFeed[]
    /** The field's placeholder (a provider may prescribe it); `ui.text.chat.gifPicker.search` without one. */
    placeholder?: string
    /** The provider's attribution at the foot of the sheet. */
    attribution?: string
    testid?: string
  }>(),
  { placeholder: undefined, attribution: undefined, testid: 'chat' },
)
/** `q`: the words that found it (a topic chip's search too), for a provider's share count. */
const emit = defineEmits<{ pick: [gif: GifItem, q: string] }>()
const uiText = useUiText()
const words = computed(() => uiText.value.chat.gifPicker)

const DEBOUNCE_MS = 400

const query = ref('')
const firstFeed = () => props.feeds[0]?.key ?? ''
/** The search field's id: one per picker, so two pickers on a screen never share one. */
const searchId = useId()
/** What shows while nothing is searched. */
const feed = ref<string>(firstFeed())
const items = ref<GifItem[]>([])
/** The number of the next page, null on the last. */
const next = ref<number | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const error = ref<string | null>(null)
const searched = ref('')
const requests = latestRequest()
/** The topic the grid on screen was searched for (its `query` goes with a pick, for the share count). */
const shown = ref<string>(firstFeed())
/** Bumped on each new grid, so Vue crossfades the old one out and the new one in. */
const swapKey = ref(0)
const root = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

async function load(more = false) {
  const mine = requests.start()
  const q = query.value.trim()
  const topic = feed.value
  // A chip switch keeps the grid up: the status says loading, the items stay until the new ones are in.
  status.value = more ? status.value : 'loading'
  error.value = null
  const result = await props.search(q, more ? (next.value ?? 1) : 1, topic)
  if (!requests.isCurrent(mine)) return
  if (result.error !== null || !result.data) {
    error.value = result.error
    status.value = 'error'
    return
  }
  searched.value = q
  shown.value = topic
  if (more) {
    items.value = [...items.value, ...result.data.items]
  } else {
    items.value = result.data.items
    // A new grid crossfades in; a page more just appends to the one on screen.
    swapKey.value++
  }
  next.value = result.data.next
  status.value = 'ready'
}

watch(query, () => {
  clearTimeout(timer)
  timer = setTimeout(() => void load(), DEBOUNCE_MS)
})

/** A chip: its GIFs at once (the grid stays up until they are in), the search cleared, the list back at the top. */
async function choose(next: string) {
  if (feed.value === next && !searched.value && !query.value.trim() && status.value !== 'error') return
  feed.value = next
  query.value = ''
  await nextTick()
  clearTimeout(timer)
  root.value?.closest<HTMLElement>('[data-sheet-body]')?.scrollTo({ top: 0 })
  void load()
}

/** The chip that is showing: none during a search. */
const chosen = computed(() => (searched.value || query.value.trim() ? null : feed.value))

function opened() {
  query.value = ''
  feed.value = firstFeed()
  void load()
}
watch(open, (isOpen) => {
  clearTimeout(timer)
  if (isOpen) return opened()
  requests.cancel()
  items.value = []
  status.value = 'idle'
})
// Mounted already open (a screen that shows it from the start, a story): there is no change to watch for.
onMounted(() => open.value && opened())

onBeforeUnmount(() => clearTimeout(timer))

function pick(gif: GifItem) {
  emit('pick', gif, searched.value || (props.feeds.find((one) => one.key === shown.value)?.query ?? ''))
  open.value = false
}

// Two columns, each GIF in the next shorter one, so the grid stays even.
const columns = computed(() => gifColumns(items.value))
/** Each GIF's place in the grid's order (1, 2, …): its button's name when it has no title. */
const placeOf = computed(() => new Map(items.value.map((gif, i) => [gif.id, i + 1])))
</script>

<template>
  <!-- Cancel is the sheet's own (`ui.text.chat.gifPicker.title` is its title). UiSheet puts no
       attributes on its panel, so the status is read from the content. The content
       is given a height so the sheet opens tall and does not jump as results arrive. -->
  <UiSheet v-model:open="open" :title="words.title" :testid="`${testid}.gifPicker`">
    <div ref="root" class="flex min-h-[70dvh] flex-col" :data-status="status" :data-testid="`${testid}.gifResults`">
      <!-- The field stays under the title row while the grid scrolls past it (the offset
           is the body's own padding, which a sticky box keeps clear). -->
      <div class="sticky -top-md z-10 -mx-ml -mt-md bg-surface-sheet px-ml pt-md pb-sm">
        <label :for="searchId" class="sr-only">{{ words.search }}</label>
        <input
          :id="searchId"
          v-model="query"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          :placeholder="placeholder ?? words.search"
          class="h-(--size-field) w-full rounded-pill bg-fill px-md text-input text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-accent"
          :data-testid="`${testid}.gifSearch`"
        />
        <!-- The feeds while nothing is searched: one of them is chosen. -->
        <div
          v-if="feeds.length"
          role="radiogroup"
          :aria-label="words.feedsLabel"
          class="scrollbar-none -mx-ml flex gap-xs overflow-x-auto px-ml pt-sm"
          :data-testid="`${testid}.gifFeeds`"
        >
          <UiPill
            v-for="one in feeds"
            :key="one.key"
            radio
            :pressed="chosen === one.key"
            class="shrink-0"
            :data-testid="`${testid}.gifFeed`"
            :data-feed="one.key"
            @click="choose(one.key)"
          >
            {{ one.label }}
          </UiPill>
        </div>
      </div>

      <p v-if="searched" class="eyebrow pb-sm" :data-testid="`${testid}.gifHeading`">{{ fillWords(words.results, { q: searched }) }}</p>

      <div v-if="status === 'error'" class="flex flex-col items-start gap-sm py-md">
        <p class="rounded-md bg-error-soft px-md py-sm text-center text-caption text-ink" role="alert" :data-testid="`${testid}.gifError`">{{ error }}</p>
        <UiButton tone="secondary" size="md" :data-testid="`${testid}.gifRetry`" @click="load()">{{ words.retry }}</UiButton>
      </div>
      <div v-else-if="status === 'loading' && items.length === 0" class="grid grid-cols-2 gap-sm" role="status" :aria-label="words.loading">
        <UiSkeleton v-for="n in 6" :key="n" :wave="n / 12" class="h-(--size-avatar-xl) rounded-md" />
      </div>
      <p v-else-if="status === 'ready' && items.length === 0" class="py-lg text-center text-body text-ink-muted" :data-testid="`${testid}.gifNone`">
        {{ fillWords(words.none, { q: searched }) }}
      </p>
      <div v-else class="relative">
        <!-- A new topic's grid crossfades over the old one (standard; instant with Reduce Motion). -->
        <Transition name="gif-swap">
          <!-- Two columns, each a list of its GIFs (a button may not be a `listitem`: the item is the <li> around it). -->
          <div :key="swapKey" class="grid grid-cols-2 items-start gap-sm">
            <ul v-for="(column, c) in columns" :key="c" class="flex flex-col gap-sm">
              <li v-for="gif in column" :key="gif.id">
                <button
                  type="button"
                  class="relative block w-full overflow-hidden rounded-md bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  :style="{ aspectRatio: `${gif.width} / ${gif.height}` }"
                  :aria-label="gif.title ? fillWords(words.pickTitled, { title: gif.title }) : fillWords(words.pick, { n: placeOf.get(gif.id) ?? 0 })"
                  :data-testid="`${testid}.gif`"
                  :data-gif-id="gif.id"
                  @click="pick(gif)"
                >
                  <img :src="gif.preview" alt="" loading="lazy" decoding="async" class="size-full object-cover" />
                </button>
              </li>
            </ul>
          </div>
        </Transition>
      </div>

      <div v-if="next !== null && status === 'ready'" class="flex justify-center py-md">
        <UiButton tone="plain" size="md" :data-testid="`${testid}.gifMore`" @click="load(true)">{{ words.more }}</UiButton>
      </div>

      <!-- The provider's attribution (some providers' guidelines ask for one wherever their content is
           shown). It stays in view at the foot of the body, as the grid scrolls under it. -->
      <div v-if="attribution || $slots.attribution" class="sticky -bottom-md z-10 -mx-ml -mb-md mt-auto flex justify-center border-t-(length:--stroke-hairline) border-hairline bg-surface-sheet px-ml py-sm">
        <slot name="attribution">
          <p class="text-caption text-ink-muted" :data-testid="`${testid}.gifAttribution`">{{ attribution }}</p>
        </slot>
      </div>
    </div>
  </UiSheet>
</template>

<style scoped>
/* A topic's grid crossfades over `standard` (docs/MOTION.md): the old one is taken out of the flow while it fades,
   so the new one takes its place at once. With Reduce Motion `ui.css` makes it instant. */
.gif-swap-enter-active,
.gif-swap-leave-active {
  transition: opacity var(--duration-standard) var(--ease-standard);
}
.gif-swap-leave-active {
  position: absolute;
  inset-inline: 0;
  top: 0;
  pointer-events: none;
}
.gif-swap-enter-from,
.gif-swap-leave-to {
  opacity: 0;
}
</style>
