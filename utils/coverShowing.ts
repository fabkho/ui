/**
 * What a mounted cover (`UiCover`) shows, as a state it moves through. Framework free, so the rule is pinned by
 * `tests/cover-showing.test.ts` and a native port copies it. Taken from BetterReads' `utils/cover.ts` (`CoverShowing`),
 * minus the sources: the base knows no CDN, so which URLs are one artwork is the app's to say (`artwork`).
 *
 * The rule: **a cover shows its subject's cover, and follows it.** A list row that stays mounted and a page mounted
 * later show the same picture, because both show what the subject says now. A new `src` of another artwork starts
 * the cover afresh. Another size of the artwork in view is no other image: it takes over once it has loaded. An image
 * that fails or comes back blank moves on to the next of the chain (`src`, then the `fallbacks`), then the Placeholder.
 * A size of the artwork in view failing leaves that artwork in view, at the size that loaded.
 *
 * Without an `artwork` function every URL is an artwork of its own: a new `src` always starts afresh.
 */

/** Which artwork a URL is of, whatever size it is asked at. Two URLs of one artwork are one image, at two sizes. */
export type ArtworkOf = (url: string) => string

/** What an app knows about a cover's sources, for one `src` at one size: its images beyond `src`, and how it is offered. */
export interface CoverSources {
  /** The images to try, in order, after `src` fails or is blank (the same artwork at its other sizes). */
  fallbacks?: readonly string[]
  /** The sizes `src` is offered at (an `img` `srcset`, by width), null where there are none. */
  srcset?: string | null
  /** What width the cover renders at (an `img` `sizes`), for `srcset`. */
  sizes?: string
}

const itself: ArtworkOf = (url) => url

export interface CoverShowing {
  /** The sources to try in order: `src`, then its fallbacks. */
  chain: readonly string[]
  /** Which of `chain` is in the image. */
  attempt: number
  /** What the cover is of; a change of it starts the cover afresh, even at the same artwork. */
  identity: string
  /** The image in view (loaded, not blank), or null while none is. */
  shown: string | null
  /** Whether the image may offer its sizes (`srcset`); not after a size of it failed. */
  srcset: boolean
}

/** What a cover is asked to show. */
export interface CoverInput {
  src: string | null | undefined
  /** The same artwork at other sizes (or any other image), to try in turn when `src` fails. */
  fallbacks: readonly string[]
  identity: string
}

const chainOf = ({ src, fallbacks }: CoverInput): readonly string[] => (src ? [...new Set([src, ...fallbacks])] : [])

/** A cover that shows nothing yet, set to try `input`. */
export function startCover(input: CoverInput): CoverShowing {
  return { chain: chainOf(input), attempt: 0, identity: input.identity, shown: null, srcset: true }
}

/** The source in the image now, or null: the Placeholder. */
export function coverNow(state: CoverShowing): string | null {
  return state.chain[state.attempt] ?? null
}

/** The cover is asked to show something else (`src`, `fallbacks` or `identity` changed). */
export function coverInputChanged(state: CoverShowing, input: CoverInput, artwork: ArtworkOf = itself): CoverShowing {
  if (state.shown === null || input.identity !== state.identity) return startCover(input)
  const chain = chainOf(input)
  if (chain.length === state.chain.length && chain.every((url, index) => url === state.chain[index])) return state
  // Another size of what is in view: the same cover, swapped for the size once it has loaded.
  if (chain.length && artwork(chain[0]!) === artwork(state.shown)) return { ...state, chain, attempt: 0, srcset: true }
  // Another artwork, or none: the cover is another now, here as everywhere else it shows.
  return startCover(input)
}

/** An image loaded and is not blank: `url` (the image's `currentSrc`) is in view. */
export function coverShown(state: CoverShowing, url: string): CoverShowing {
  return { ...state, shown: url }
}

/**
 * The image at `url` (its `currentSrc`) failed or came back blank. A size of the artwork in view failing leaves that
 * artwork in view, at the size that loaded. The one in view failing, or one before any was, moves to the next of the
 * chain, then the Placeholder.
 */
export function coverFailed(state: CoverShowing, url: string, artwork: ArtworkOf = itself): CoverShowing {
  const shown = state.shown
  if (shown !== null && url !== shown && artwork(url) === artwork(shown)) {
    const rest = state.chain.slice(state.attempt + 1).filter((next) => next !== shown)
    return { ...state, chain: [shown, ...rest], attempt: 0, srcset: false }
  }
  const attempt = state.attempt + 1
  if (attempt < state.chain.length) return { ...state, attempt, shown: null, srcset: true }
  return { ...state, attempt, shown: null }
}
