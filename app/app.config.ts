// The few words the layer says itself (a sheet's Cancel, the Offline button, a
// cover's "et al.", a clamped text's More and Less). The app overrides them in its own app.config.ts, or, with
// translations, keeps them current with `updateAppConfig({ ui: { text } })`
// (README.md, Copy). The layer never imports the app's copy.
import type { ArtworkOf, CoverSources } from './utils/coverShowing'

export default defineAppConfig({
  ui: {
    /**
     * What an app knows about its covers' sources, for every `UiCover` at once (a prop of the cover wins).
     * Empty here: a cover shows `src`, then its `fallbacks`, as given.
     */
    /** `UiAmbient`: `grain` is how its grain is drawn when the card does not say (`image`, the default, or `inline`: an SVG, which is no LCP candidate). */
    ambient: {} as { grain?: 'image' | 'inline' },
    cover: {} as {
      /**
       * `src` at `size`: the images to try after it (the same artwork at its other sizes), its `srcset` and `sizes`.
       * Called again when `src` or `size` changes.
       */
      sources?: (src: string, size: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl') => CoverSources | null | undefined
      /** Which artwork a URL is of, whatever size it is asked at: a new size of the image in view takes over once loaded. */
      artworkOf?: ArtworkOf
    },
    /**
     * UiIcon drawings an app replaces: the name (an `IconName`) and the SVG markup of its shapes on the 24-unit
     * grid, e.g. `people: '<circle cx="9.3" cy="8.8" r="3.3" /><path d="…" />'`. Merged over the layer's set;
     * a name left out keeps the layer's drawing. Empty here: the layer's own drawings are the default.
     */
    icons: {} as Record<string, string>,
    text: {
      /** A sheet's and a dialog's way out. */
      cancel: 'Cancel',
      /** A button that writes, while the device has no connection (UiButton `offline`). */
      offline: 'Offline',
      /** After the first author when a cover names fewer than all of them. */
      etAl: 'et al.',
      /** UiClampText: the button that opens a cut text in place, and the one that folds it again. */
      more: 'More',
      less: 'Less',
      /**
       * The chat's words (`utils/chat/*` and the chat components: UiChatThread, UiBubble, UiQuote,
       * UiReactionBar, UiComposer, UiVoiceBubble, UiGifPicker). Each app fills them from its own copy
       * (a copy module, or i18n).
       * A word with a `{name}` in it is a template: the component fills the braces in (`fillWords`,
       * `utils/chat/words.ts`), so an app can hand over its own function's output for `'{name}'`.
       */
      /** UiCheckList: the filter field, the count line under it, and what a filter that finds nobody says. */
      checkList: {
        filter: 'Filter',
        /** `{count}` chosen; with a `max`, `{count}` of `{max}`. */
        count: '{count} selected',
        countMax: '{count} of {max} selected',
        /** Under the count while fewer than `min` are chosen. */
        atLeast: 'Choose at least {min}.',
        /** The filter found nobody. */
        none: 'Nothing matches.',
      },
      chat: {
        /** A BCP 47 tag: the language the weekdays and months of a day separator are spelled in (`Intl`). */
        locale: 'en',
        /** The "+N" of a stack of faces (UiAvatarStack), spoken after the names when it has no label: "Ida, Berit and 3 more". */
        more: 'and {count} more',
        /** Day separators; older days are written out by `dayLabel`. */
        today: 'Today',
        yesterday: 'Yesterday',
        /** The thread while it loads (for a screen reader: the placeholder is drawn). */
        loading: 'Loading the conversation',
        /** The line under the top bar while the device is offline. */
        offline: 'No connection. We will try again in a moment.',
        /** Paging up: earlier messages at the top of the thread. */
        olderLoading: 'Loading earlier messages',
        olderFailed: 'Earlier messages could not be loaded.',
        olderRetry: 'Try again',
        /** Under one's own last message once the other one has read it. */
        read: 'Read',
        /** Under a message that is taking a while on its way. */
        sending: 'Sending …',
        /** What a screen reader says when a message from the other side arrives while the thread is open ("{name}: the text"). */
        incoming: 'New message from {name}',
        /** Under a message that did not go out; the bubble is the button. */
        failed: 'Not sent. Tap to try again.',
        /** After the app's own sentence for a refused message (`error` on the message). */
        retryHint: 'Tap to try again.',
        composer: {
          label: 'Message',
          placeholder: 'Message',
          send: 'Send',
          /** The chips over the field are a toolbar; this is its name for assistive tech. */
          actions: 'Message actions',
          /** The chips over the field. */
          photo: 'Photo',
          photoLabel: 'Send a photo from your gallery',
          gif: 'GIF',
          gifLabel: 'Find and send a GIF',
        },
        /** Answering one message: what a quote says for a message that is not words. */
        reply: {
          /** One's own message is quoted with this, as in WhatsApp. */
          you: 'You',
          voice: '🎤 Voice message',
          gif: 'GIF',
          photo: 'Photo',
          /** A message whose content was withdrawn (`Quoted.gone`). */
          gone: 'No longer available',
          /** The way without a swipe: the entry in the reaction bar. */
          bar: 'Reply',
          /** The ✕ of the quote over the composer. */
          cancel: 'Discard reply',
          /** The quoted message was deleted meanwhile. */
          deleted: 'Message deleted',
          /** A tap on a quote jumps to the original. */
          show: '{name}: {preview}. Go to message',
        },
        /** A picture in the thread. */
        media: {
          photo: 'Photo',
          photoMine: 'Your photo',
          gif: 'GIF',
          gifMine: 'Your GIF',
          open: 'View large',
          loading: 'Loading picture',
          /** Its sender is gone: the picture went with them. */
          photoRemoved: 'Photo removed',
          gifRemoved: 'GIF removed',
          /** The picture did not load and no new address is coming. */
          unavailable: 'Picture not available right now',
        },
        /** Voice messages: the microphone in the composer, the recording bar, the bubble. */
        voice: {
          record: 'Record a voice message',
          recording: 'Recording',
          stopped: 'Recording stopped',
          timer: '{elapsed} of {max}',
          cancel: 'Discard recording',
          send: 'Send voice message',
          /** At the limit the recording stops by itself; it can still be sent. */
          limit: 'That is as long as a recording can be. You can send it now.',
          /** Why the microphone did not start (`micProblem`). */
          problems: {
            denied: 'Your microphone is turned off for this app. Allow it in your device or browser settings and try again.',
            none: 'We cannot find a microphone on your device.',
            busy: 'Something else is using your microphone. Close it and try again.',
            unsupported: 'This browser cannot record voice messages.',
            failed: 'The recording did not work. Please try again.',
          },
          bubble: {
            mine: 'Your voice message',
            theirs: 'Voice message',
            play: 'Play',
            pause: 'Pause',
            loading: 'Loading voice message',
            /** Its sender is gone: the recording went with them. */
            removed: 'Voice message removed',
            /** A recording in a format this device cannot play. */
            unplayable: 'Your device cannot play this voice message.',
            /** The sound broke off or did not start: one more try on a tap. */
            playFailed: 'Playing did not work. Tap to try again.',
            position: '{now} of {total}',
          },
        },
        /** The GIF picker (a sheet). The provider's own words (placeholder, attribution, topics) are props. */
        gifPicker: {
          title: 'Send a GIF',
          search: 'Search GIFs',
          feedsLabel: 'GIF topics',
          results: 'For “{q}”',
          none: 'No GIF for “{q}”.',
          more: 'Load more',
          loading: 'Loading GIFs',
          /** A GIF in the grid, by its place (`{n}`), or by its title when the provider gives one (`{title}`). */
          pick: 'Send GIF {n}',
          pickTitled: 'Send GIF: {title}',
          retry: 'Try again',
        },
        /** Reactions on a message: the bar over a bubble and the pill on its corner. */
        reactions: {
          bar: 'Choose a reaction',
          open: 'React',
          /** What each emoji is called for a screen reader; an emoji without a name is read as itself. */
          names: { '❤️': 'Heart', '😂': 'Laughing', '😮': 'Surprised', '😢': 'Sad', '🔥': 'Fire' } as Record<string, string>,
          pick: 'React with {name}',
          takeBack: 'Take back {name}',
          /** Who chose it: the reader alone, one other, the reader and one other, more (`{count}`). */
          byYou: '{name} from you',
          byOther: '{name} from them',
          byBoth: '{name} from both of you',
          byMany: '{name} from {count}',
          pill: 'Reactions: {parts}',
          copy: 'Copy',
          copied: 'Copied',
        },
      },
    },
  },
})
