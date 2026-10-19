/**
 * The GIF picker's data (UiGifPicker): what a provider answers with and how the grid is laid out.
 * The provider itself (its key, its terms) is the app's: it comes in as the
 * picker's `search` prop.
 *
 * Not auto-imported: import from `#ui/utils/chat/gif`.
 */

/** A GIF in the picker: the provider's id, the grid's preview and its size, and what a tap sends. */
export type GifItem = {
  id: string
  /** The preview's size (the grid keeps the shape before it loads). */
  width: number
  height: number
  /** The preview in the grid. */
  preview: string
  /** What it shows, when the provider says (it names the GIF's button for a screen reader). */
  title?: string
  /** The rendition the message holds, and its size. */
  url: string
  sentWidth: number
  sentHeight: number
}

/** One page; `next` is the number of the next page, null on the last. */
export type GifPage = { items: GifItem[]; next: number | null }

/** What the provider answers: a page, or the sentence that says why not. */
export type GifResult = { data: GifPage; error: null } | { data: null; error: string }

/**
 * The provider: the GIFs for `q` (or, while `q` is empty, for the chosen feed), page `page`.
 */
export type GifSearch = (q: string, page: number, feed: string) => Promise<GifResult>

/**
 * A chip under the search field: what the grid shows while nothing is searched. `query` is the
 * search behind it, handed out with a pick (a provider's share count); '' for one that is no search
 * (a trending feed).
 */
export type GifFeed = { key: string; label: string; query: string }

/** Two columns, each GIF in the next shorter one, so the grid stays even. */
export function gifColumns<T extends { width: number; height: number }>(items: readonly T[]): [T[], T[]] {
  const cols: Array<{ items: T[]; height: number }> = [
    { items: [], height: 0 },
    { items: [], height: 0 },
  ]
  for (const gif of items) {
    const col = cols[0]!.height <= cols[1]!.height ? cols[0]! : cols[1]!
    col.items.push(gif)
    col.height += gif.height / gif.width
  }
  return [cols[0]!.items, cols[1]!.items]
}

/**
 * Only the newest request counts: a slow answer to an earlier search never replaces a newer one.
 * `start()` returns a ticket, `isCurrent(ticket)` says whether it is still the newest, `cancel()`
 * makes every ticket out of date.
 */
export function latestRequest() {
  let current = 0
  return {
    start: () => ++current,
    isCurrent: (ticket: number) => ticket === current,
    cancel: () => {
      current++
    },
  }
}
