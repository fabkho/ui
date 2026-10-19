# @fabkho/ui

The shared UI base of Bookretreats and BetterReads, as a Nuxt layer: Libellus' design system
(fabkho/libellus, `web/app/components/ui/`, its composables, utils and `main.css`, at commit `f9764be`),
which Bookretreats runs on and Libellus moves onto step by step without renaming anything (issue #70;
port plan step 2, `docs/design-variants/port-plan.md` on the prototype branch). The plan this repo
follows is `docs/ui-layer-plan.md` in fabkho/trappist.

**Compatibility with Libellus comes first.** Component names, props, slots, emitted events, CSS
utility names and token names are Libellus'. Improvements are additive (a new optional prop, a new
slot, a new token, a fixed bug), never a renamed or reshaped API, and every one is listed under
[Changes against Libellus](#changes-against-libellus), so Libellus' move is a checklist.

The layer has no `app/` folder: the package root is its source directory.

```
@fabkho/ui
  package.json          `main` is nuxt.config.ts, so `extends: '@fabkho/ui'` finds the layer
  nuxt.config.ts        the `#ui` alias and the router options hook
  testing/contract.mjs  the contract as a function, run by every app against its own tokens
  app.config.ts         the words the layer says itself (ui.text), in English
  router.options.ts     the system Back closes the top sheet (useBackDismiss)
  assets/css/ui.css     utilities, base styles, keyframes, Reduce Motion
  components/ui/*.vue   UiButton, UiRow, UiSheet, …
  composables/*.ts      useModalLayer, useBackDismiss, useSwipeDown, …
  utils/*.ts            motion, haptics, keyboard, hideOnScroll, cloth
  utils/chat/*.ts       the chat's pure logic: timeline, reply, voice
  plugins/              touch-active (`:active` on iOS)
  components/ui/*.stories.ts, .storybook/   Storybook: stories, config, two stand-in themes (not published)
```

## The contract

1. **The layer imports nothing from the app.** No stores, no `~/copy`, no Supabase, no `~/` or
   `@/` imports at all (inside a layer `~` is the *app's* source directory: the layer's own files
   import each other relatively, or through Nuxt's auto-imports). Copy comes in through props and
   slots; the few words the layer says itself come from the app config (below).
2. **Design tokens only through CSS variables and Tailwind theme names.** The app supplies the
   values: its `design/tokens.json` generated into `app/assets/css/tokens.generated.css`
   (`design/build.mjs`, Libellus' generator). [Every variable the layer reads](#the-variables-the-layer-needs)
   is listed below; the contract test ([Using the base](#using-the-base), step 6) fails when the layer
   reads one the app's tokens do not define.
3. **Decorations are theme properties.** Whether a cover lights the room (`UiAmbient`, the cover's
   halo and pool) is the theme's `--opacity-glow` / `--opacity-halo`, never a component's choice.
   Bookretreats sets both to 0 in Papier and Blau; Libellus keeps its values.
4. **No Reka, no vaul inside the layer**: these are Libellus' own components, which have none.
   (Bookretreats' member sheet, with its two detents and its fixed footer, is the one sheet that
   stays on vaul, in the app; it sits just under the layer's sheets, `z-35` / `z-36` against the
   layer's `z-40` / `z-50`, so a menu or a report rises over it.)
5. **Only colours change between themes, never layout.** Themes are `html[data-theme='<name>']`
   (the generated CSS); a component never asks which theme is on.

Both the layer and its users follow Libellus' motion rules (`docs/MOTION.md` there and, for
Bookretreats with its named exceptions, `docs/MOTION.md` here): durations and curves are tokens
(`--duration-*`, `--ease-*`), read in JavaScript through `durationToken` / `easingToken`.

## Using the base

One form, in each app (plan §3, "Consumption: one form"). **Never float on a branch**
(`github:fabkho/ui#main`): two deployed apps would pick up the base's newest state with no changelog
and no way back. A tag per release (release-please makes them), the lockfile pins the commit.

1. **`package.json`**: the tagged git dependency. Nothing is published to npm.

   ```json
   "dependencies": { "@fabkho/ui": "github:fabkho/ui#v0.1.0" }
   ```

   The app also has `nuxt`, `vue` and `vue-router` (peer dependencies; `thumbhash` comes with the
   base). While the repo is private the machine installing it (CI included) needs read access to it.
2. **`ui.config.ts`** (name free, one small file), and **`nuxt.config.ts`**:

   ```ts
   // ui.config.ts
   export const uiLayer = () => process.env.UI_LAYER || '@fabkho/ui'
   ```

   ```ts
   // nuxt.config.ts
   import { uiLayer } from './ui.config'

   export default defineNuxtConfig({
     extends: uiLayer(),
     vite: {
       // The base's one runtime dependency: pre-bundled up front, so the dev server never re-optimises
       // mid-run (the app's tests/vite-deps.test.ts scans node_modules/@fabkho/ui for it).
       optimizeDeps: { include: ['@fabkho/ui > thumbhash'] },
     },
   })
   ```

   `UI_LAYER=/path/to/ui` points the app at a local checkout of this repo (no `pnpm link`, no
   `overrides`). `extends: '@fabkho/ui'` resolves as a layer from `node_modules` because the
   package's `main` is `nuxt.config.ts` (c12 resolves the package name, then loads that file).
   `#ui` (`import type { IconName } from '#ui/components/ui/Icon.vue'`) is the base's folder, wherever
   it lives.
3. **`main.css`**, after `tailwindcss` and the app's tokens: one `@import` and nothing else.

   ```css
   @import 'tailwindcss';
   @import './tokens.generated.css';
   /* the app's fonts */
   @import '@fabkho/ui/assets/css/ui.css';
   ```

   Tailwind v4 does not scan `node_modules`, so `ui.css` carries `@source '../../components'`,
   relative to itself. **Checked**: a throwaway Nuxt 4.6.2 app under `/tmp`, the package installed with
   `file:`, one `UiButton` on its page, `nuxt generate`: the built CSS holds `bg-ink`, `text-on-ink`,
   `shadow-button` and the other classes that are written only in `components/ui/Button.vue`. With
   the `@source` line taken out of `ui.css` they are gone (the negative control), so it is the line that
   does it. It resolves the same through `UI_LAYER` and through `@import '#ui/assets/css/ui.css'`
   (the alias follows `UI_LAYER`; `@fabkho/ui/assets/…` always reads the installed copy, which is
   what to use in a checked-in `main.css`). **If it ever stops resolving** (a Tailwind change), the
   fallback is one line per app, next to the import: `@source '../../../node_modules/@fabkho/ui/components';`
   (path relative to `main.css`).
4. **Fonts** are the app's: the base names the families only through `--font-sans|mono|serif`.
   Libellus' (and Bookretreats') are Geist, Geist Mono and Newsreader from Fontsource.
5. **Copy** (`app.config.ts`): the base's own words are `ui.text.cancel` (a sheet's and a dialog's
   way out), `ui.text.offline` (UiButton `offline`) and `ui.text.etAl` (a cover's authors). The
   base's defaults are English; an app overrides them in its `app.config.ts`:

   ```ts
   export default defineAppConfig({ ui: { text: { cancel: 'Abbrechen', offline: 'Offline', etAl: 'u. a.' } } })
   ```

   An app with translations keeps them current with `updateAppConfig({ ui: { text: { … } } })`
   when the language changes (components read them through `useUiText()`).

   The chat's words are `ui.text.chat.*`, English by default like the keys above. Each app fills them
   from its own copy (Bookretreats from `copy/chat.ts`, BetterReads from i18n):

   | Key | Default | Used by |
   | --- | --- | --- |
   | `chat.locale` | `en` | `dayLabel`: BCP 47 tag the weekdays and months are spelled in (`Intl`) |
   | `chat.today`, `chat.yesterday` | Today, Yesterday | `dayLabel` |
   | `chat.reply.you` | You | `quoteName` |
   | `chat.reply.voice`, `.gif`, `.photo` | 🎤 Voice message, GIF, Photo | `quotePreview` |
   | `chat.reply.gone` | No longer available | `quotePreview` of a quote flagged `gone` |
   | `chat.media.photoRemoved`, `.gifRemoved` | Photo removed, GIF removed | `quotePreview` |
   | `chat.voice.bubble.removed` | Voice message removed | `quotePreview` |

   The chat components add the rest of `ui.text.chat` (the list is under [Chat](#chat)).
   `useUiText().value.chat` can be passed as the `DayWords` and `ReplyWords` the chat utils take.
6. **The contract test** in the app: `testing/contract.mjs` is the contract as a function; it takes the
   app's token CSS and returns what breaks it (empty lists mean it holds). This repo runs it against a
   small fixture (`tests/fixtures/tokens.css`), each app against its own generated file:

   ```ts
   // tests/ui-layer.test.ts
   import { readFileSync } from 'node:fs'
   import { expect, it } from 'vitest'
   import { layerContract } from '@fabkho/ui/testing/contract.mjs'

   it('the base reads only what this app defines', () => {
     const found = layerContract({ tokensCss: readFileSync('app/assets/css/tokens.generated.css', 'utf8') })
     expect(found).toEqual({ importsFromApp: [], missingVariables: [], missingCloths: [], rawCurves: [] })
   })
   ```

   The theme values stay the app's (for example "the glow is off in Papier and Blau" is Bookretreats'
   own test against its `design/tokens.json`).
7. **Router**: `router.options.ts` wraps the router's history so the system Back (Android's back
   gesture, the browser's Back) closes the top sheet or dialog instead of leaving the page
   (`useBackDismiss`). Nuxt merges it with the app's own `router.options.ts`; an app that sets its
   own `history` must wrap it the same way (`listenForBack(); return keepsForeignLayers(createWebHistory(base))`).
   Nuxt only looks for it in `<layer>/app/router.options.ts`, and this layer has no `app/` folder, so
   the layer's `nuxt.config.ts` adds the file with the `pages:routerOptions` hook. Without it the
   listener is added late, after the router's own, and a change of page made while a layer closes
   navigates back to the page it left.
8. **Types** from the base: `import type { IconName } from '#ui/components/ui/Icon.vue'`
   (`UiTab` from `TabBar.vue`, `SheetRestore` from `Sheet.vue`).

### The additive API policy

A release never renames or reshapes what an app already uses: a component, a prop, a slot, an emitted
event, a CSS utility or a token name. What changes is additive (a new optional prop, a new slot, a new
token or utility, a fixed bug). A token the base starts to read is a new entry in
[the variables list](#the-variables-the-layer-needs) and in the apps' tokens in the same bump, and the
contract test turns red in an app that lacks it. Every change is in `CHANGELOG.md` (release-please writes
it from the conventional commits), so an app's bump is a checklist. A breaking change is a major
version and needs the owner's say.

### Portable by default

*Components should always be structured in the way that it's easy to move them to the shared layer if
the need occurs* (owner's rule, plan §3). For every app component that could ever be generic:

1. **No app state in a presentational component.** No `~/stores`, Pinia, Supabase or i18n calls
   inside it. Data and copy arrive through props, slots, or `ui.text`-style text props. The page or
   a container component does the fetching and the translating.
2. **No app-coupled imports.** No `~/utils` or `~/composables` that themselves touch app state. Pure
   helpers are fine, ideally colocated with the component or generic.
3. **Role names, not domain names**, for anything generic (`SearchPalette`, not `BookSearchPalette`).
4. **Styling only through the token CSS variables.** No hard-coded colours, radii, durations or other
   theme values.
5. **One component = one file**, with its own props and emits types.

These apply to new and touched components in both apps; a component that follows them moves into this
repo by copying the file.

### Dependencies

Peer dependencies `nuxt`, `vue`, `vue-router`; one dependency, `thumbhash` (`utils/cloth.ts`). The base
uses Vue, Nuxt's auto-imports (`useAppConfig`, `useRoute`, `navigateTo`, …), vue-router's types and its
own files. No `@nuxtjs/i18n`, Pinia or Supabase. A headless library (Reka UI, `@floating-ui/dom`,
vaul) is allowed only inside one widget, behind the same `Ui*` API, tree-shakeable, tested here and
recorded here as an exception. **Exceptions today: none.**

### Developing it

`pnpm install`, `pnpm test` (Vitest, plain Node: the pure utils and the contract against a fixture;
components are checked in the apps and, rendered in a browser, in [Storybook](#storybook)). Commits are conventional (`feat:`, `fix:`, `perf:` …):
release-please keeps a release pull request open from them and tags `vX.Y.Z` when it is merged; the
first release is `0.1.0`, and while the version is `0.x` a `feat` bumps the minor.

## Storybook

Every base component in its states, in two themes, with an accessibility check on each story.

- **Open it**: https://fabkho.github.io/ui/ (rebuilt on every push to `main`; opens on a phone, the
  viewport menu has an iPhone 390×844 preset).
- **Run it locally**: `pnpm storybook` (http://localhost:6006). `pnpm build-storybook` builds the
  static site into `storybook-static/` (CI builds it on every pull request, so a story that no longer
  builds fails the PR). `pnpm test:storybook` renders every story in headless Chromium and runs axe on it
  (needs `pnpm exec playwright install chromium-headless-shell` once); it is the `Stories` job in CI. `pnpm test` stays
  the fast, browser-less Vitest.
- **How it runs**: `@storybook-vue/nuxt` (Storybook's Nuxt framework, from the `nuxt-modules/storybook`
  repo) with the layer as the Nuxt project, so stories see the layer's auto-imports, `app.config.ts`
  (`ui.text`), the `#ui` alias and Tailwind v4 with `assets/css/ui.css`, without a mock. Config is in
  `.storybook/` (`main.ts`, `preview.ts`, `tokens.css`, `storybook.css`); none of it is published.
- **Themes**: the toolbar's paint-brush switches `data-theme` on `<html>` between **paper** (light) and
  **night** (dark), which stand in for the apps. `.storybook/tokens.css` is a copy of what an app's
  generated tokens look like (Bookretreats' Papier values, Libellus' dark ones) and has to satisfy the
  contract (`tests/storybook-tokens.test.ts`). The globe switches `ui.text` between the English defaults
  and a German sample (`.storybook/german.ts`, the chat's words included). A story can start in a theme with `globals: { theme: 'night' }`.
- **Chat stories** (`Chat/…`: thread, bubble, quote, reactions, composer, voice bubble, GIF picker) draw
  their sample messages, pictures, a silent voice clip, a fake GIF provider (no network) and a stand-in
  microphone from `.storybook/chat-fixtures.ts`. `Chat/ChatThread` is a live conversation (react, answer,
  retry, send); look at it in the iPhone viewport.
- **Add a story**: next to the component, `components/ui/<Name>.stories.ts` (`files` in `package.json`
  leaves `*.stories.ts` out of the package). Copy `Button.stories.ts`: `title: 'Base/<Name>'`, one named
  story per state (sizes, variants, disabled, loading, empty, error, long text), and for an overlay
  (sheet, dialog, palette) an open button. A new or changed base component gets or updates its story in
  the same pull request; its docs page, controls and `Show code` come from the component's props
  (`autodocs` is on for every story).
- **The accessibility rule**: every story is checked by axe against WCAG 2.2 AA and best practices (the
  Accessibility panel in the browser; a failing test in CI). A story is green or it is fixed. Only a
  known problem in a component that cannot be fixed in the same change is marked
  `parameters: { a11y: { test: 'todo' } }` with a comment naming the rule: it then shows in the panel
  and stays out of CI's way, and the pull request says so. The check finds what a machine can find
  (contrast, names, roles); keyboard order, focus and reduced motion are still read by a person.
- **The other a11y tools** (what each does; the verdicts on the rest are in the pull request):
  - **axe in the test run** (`a11y.test: 'error'`, `@storybook/addon-a11y`): the WCAG 2.2 AA + best-practice
    check above. Colour contrast in both themes is covered here, because the night run repeats every story.
  - **Accessibility panel + vision simulator** (`@storybook/addon-a11y`, no extra install): the axe report
    per story in the browser, and the Vision tab that simulates colour blindness, blur and low contrast.
    Use it by hand where a colour carries meaning.
  - **Pseudo-states** (`storybook-addon-pseudo-states`): the toolbar's pseudo-state button forces `:hover`,
    `:focus-visible`, `:active` on a story's elements. It rewrites the stylesheets, so it shows the style,
    not the real state. `FocusVisible` in `Segmented.stories.ts` is the example: the focus ring is on screen
    for axe and for the eye.
  - **Reduced motion** (toolbar, "Motion: reduced"): answers `prefers-reduced-motion: reduce` to the layer's
    JavaScript and shortens the CSS transitions and animations, as the media query does. Check a motion
    story in both modes.
  - **Keyboard** (play functions with `userEvent` from `storybook/test`, run by `pnpm test:storybook`): tabs
    in, presses the arrows, asserts focus and `aria-checked`. `KeyboardPattern` in `Segmented.stories.ts`
    is the one to copy.
- **The rule for a new component**: a story per state, axe clean in both themes (`pnpm test:storybook` and
  `pnpm test:storybook:night`), and for an interactive widget a keyboard play function that follows the
  WAI-ARIA Authoring Practices pattern (radio group: arrows move focus and choice; tabs, menu, dialog and
  switch likewise). Reduced motion and the focus ring are checked by hand with the toolbar.

## What is in it

### Components (`Ui*`)

| Component | What it is |
|---|---|
| `UiButton` | The pill: `tone` primary (ink, one per screen) · secondary · quiet · plain · danger; `size` lg · md · sm; `to` makes it a link; `offline` shows "Offline" and stays disabled. |
| `UiRoundButton` | Round glass button for chrome over content (`icon` or slot, `label` for assistive tech). |
| `UiTopBar` | A pushed screen's top: round back button, `trailing` slot, optional small title; pinned under the status bar. |
| `UiRow` | A row in a group: icon, label, value or placeholder, chevron; `as="button"` or `to` (a link); `tone="danger"`; slots default (value), `lead` (in the icon's place) and `trailing`. |
| `UiRowGroup` | Inset grouped rows (iOS): quiet fill, hairline edge; rows draw their own dividers. |
| `UiSwitch` / `UiSwitchRow` | The switch's picture / a row that is a switch (`v-model`, `role=switch`). |
| `UiField` / `UiTextArea` | Text field / text area the Libellus way: small label, input-size type, one rule that lights in the accent. |
| `UiSegmented` | A segmented control; `compact` is the small one at a row's end (Libellus' Glass setting), `disabled` dims it while something is under way. |
| `UiDateRow` | A day in a row group: the platform's own date picker laid over the row (`v-model` `YYYY-MM-DD`, `text` the day in words, `icon`, `min`, `max`). |
| `UiCheckbox` | A ticked consent or choice: Libellus' round check over the native checkbox, the words in its slot (added for Bookretreats). |
| `UiPill` | A quiet toggle pill: hairline, ink when `pressed`, an optional `count`; `radio` for one of a choice of one. |
| `UiSheet` | Bottom sheet: grabber, Cancel · title · action row, swipe down, scrim, Escape, system Back; rides on the keyboard; `restore` puts it back as it was. |
| `UiConfirm` | A confirmation dialog over a scrim. |
| `UiReveal` | Something that opens in place (`show`): its room opens and it fades in. |
| `UiListMotion` | A list whose items come, go and move in place. |
| `UiMediaViewer` | A picture full screen (`open`, `url`, `label`, `dialogLabel`, `closeLabel`, `origin`; `failed` when the picture does not load, so an app can sign a short-lived URL anew): dark veil, close button, Esc / tap / swipe down / Back close it; the `origin` (a round face, or a rounded tile such as a photo in the Feed card: it starts with the origin's own corner radius) grows into it until it fills the screen and shrinks back on close or after a swipe down (`clip-path` + transform, see below); a cross-fade under Reduce Motion. Added for Bookretreats. |
| `UiAvatar` | Initials in mono in a hairline ring, or the photo over them. |
| `UiIcon` | The icon set on the 24 grid (`IconName`). |
| `UiEmptyState` | Empty state: the drawing (or the `art` slot), a serif line, a sentence, the way forward. |
| `UiProgress` | A thin progress bar. |
| `UiAmbient` | The light a cover throws into a card or page (off where the theme says so); `pool` and `strength` light it in the app's own colours (the Feed's pinned card). |
| `UiSkeleton` | A placeholder swelling with the loading wave. |
| `UiCover` | A cover in 2:3: the image, or a generated cloth from title and authors; `kind` book or screen. |
| `UiSearchPalette` | A search palette over the page (Libellus' search, without the morph out of the tab bar): veil, raised card on the keyboard, query row (glyph, field, clear, Cancel) at its bottom, the answers in the default slot above it; `v-model:open`, `v-model:query`, `label`, `placeholder`, `clear`, `cancel`, `status`, `testid`; everything else goes to the `<input>`; `cleared`. Focuses the query first, then rises and fades in (iOS: a field focused in a transparent layer leaves its list dead under the finger). Added for Bookretreats. |
| `UiTabBar` | The floating glass tab bar: `items`, dot and lock per tab, hides on scroll, tap again for the top; a slot `icon-<key>` draws a tab's own face in the icon's place. |
| `UiChatThread`, `UiBubble`, `UiDaySeparator`, `UiQuote`, `UiReactionBar`, `UiComposer`, `UiComposerChip`, `UiVoiceBubble`, `UiGifPicker` | The chat: see [Chat](#chat). |

### Chat

Bookretreats' 1:1 chat, moved into the base as it was (wave 4b: same look, motion, gestures and iOS
keyboard behaviour; from `pages/friends/[id].vue`, `components/chat/*`, `components/ReactionBar.vue`
and the voice composables). Role names, no domain words; copy from `ui.text.chat`, data and policy
through props, domain parts through slots. Every test id starts with `testid` (default `chat`, so
`chat.message`, `chat.bubble`, `chat.input`, … as before). Group chats and buddy reads build on it,
additively (runs keyed by sender, unread marker, "seen by", spoiler veil).

| Component | What it is | Props | Slots | Emits |
|---|---|---|---|---|
| `UiChatThread` | A conversation's screen, fixed on the keyboard (`useKeyboardViewport`, `pin`): the thread scrolls under the top bar's veil and the docked composer's floor; a drag or wheel on it closes the keyboard and the reaction bar; earlier messages load at the top (what was read stays put); it sticks to the newest (new messages, keyboard, composer and head growing); iOS 26's accessory bar shows the screen's colour; day separators from `timeline` ("Today" turns "Yesterday" at midnight); one reaction bar at a time (catcher, Escape, placement under the top bar; it closes when `conversationKey` changes); the marks under a bubble (time, "Read", "Sending …") in mono at `meta` size; `jumpTo(id)` pages to a quoted message, scrolls to it and lights it up. Generic over the item type. | `items` (oldest first; `key`, `createdAt`, `id?`, `mine?`, `kind?`), `status` (`loading`, `ready`, else the `state` slot), `label`, `sameRun` (default `sameSide`: same `mine`, never across a `kind: 'system'` line), `conversationKey`, `hasMore`, `olderStatus`, `loadOlder` (`() => Promise<boolean>`), `offline`, `error` (a line over the composer), `notice` (a line in the composer's place: read-only), `headShown`, `testid` | `top` (the bar's row), `head` (the conversation's beginning), `message` (`item`, `index`, `follows`, `signed`, `endsRun`, `reacting`, `placement`, `highlight`, `openReactions`, `closeReactions`), `day` (`label`), `loading-head`, `state`, `composer`, default (overlays) | — ; exposes `scroller`, `stick()`, `toNewest()`, `jumpTo(id)`, `openReactions`, `closeReactions` |
| `UiBubble` | One message: theirs a raised paper card on the left, mine ink on the right, the tail on the last of a run; pending lighter, "Sending …" when slow; tap to retry a failed one; long press / right click opens UiReactionBar, swipe right to reply (arrow, tick past 60 px, never from the left 20 px), double tap likes (heart pop), a photo/GIF opens on a tap; "Copy", "Reply"; a pill of reactions on the inner corner; the "React" button for keyboards and VoiceOver; the time on a long press (the reader's clock: `ui.text.chat.locale`); arrive motion when `fresh`. | `item` (`BubbleMessage`), `read`, `fresh`, `signed`, `sender`, `endsRun`, `canReact`, `emojis` (required: the app's set), `like` (default: the first of `emojis`), `quote` (`BubbleQuote`), `highlight`, `reacting`, `placement`, `wide`, `testid` | `sender`, `body` (`item`, `tail`, `quote`, `tapQuote`: an app's own kinds), `quote` (`quote`, `mine`, `tap`), `reactions` (`reactions`, `label`, `open`), `meta` (`item`, `time`, `showTime`, `failed`, `sending`, `read`) | `retry`, `open`, `reactOpen`, `reactClose`, `react`, `reply`, `quoteTap`, `mediaFailed` |
| `UiDaySeparator` | A day in the thread, mono eyebrow, centred. | `label`, `tag` (`li`), `testid` | — | — |
| `UiQuote` | The answered message on top of a bubble: accent stripe, name, two lines; a button to the original, or "Message deleted". | `quote`, `mine`, `testid` | — | `tap` |
| `UiReactionBar` | The glass capsule of reactions (APG toolbar: arrows, Home, End, Escape), plus "Reply" and "Copy". | `emojis`, `current`, `copyable`, `replyable`, `focusOnOpen`, `testid` | — | `pick`, `copy`, `reply`, `close` |
| `UiComposer` | The glass capsule: the field (grows to five lines, Return sends on a desktop keyboard), send or the microphone; the chips float above and fold away while the field has the keyboard; the quote bar while answering; recording (✕, live bars, timer, send; stops itself at `voiceMaxMs`). `compact`: a comment bar (field and send always, no microphone, a `note` pill beside the chips it is given). | `v-model`, `gifs`, `photoAccept`, `voiceMaxMs`, `compact`, `placeholder`, `label`, `max`, `note`, `noteLabel`, `quote`, `testid` | `actions` (the app's chips, UiComposerChip) | `send`, `photo`, `gif`, `voice` (`PreparedVoice`), `voiceError`, `cancelQuote`, `dismissNote`; exposes `focus`, `blur` |
| `UiComposerChip` | A glass chip over the composer, named by its visible words; a longer `label` must contain them (WCAG 2.5.3; warned in development). | `label`, `icon`, `mono` | default (the visible words), `icon` | `click` (native) |
| `UiVoiceBubble` | A voice message: play button concentric with the bubble, the waveform as progress, the time; one voice at a time (`useVoicePlayer`); unplayable types say so. | `item`, `tail`, `testid` | `quote` | `press`; exposes `toggle` |
| `UiGifPicker` | A tall sheet: search (400 ms debounce, newest request wins), topic chips, a two-column grid, "Load more", the provider's attribution. | `v-model:open`, `search` (`GifSearch`, the provider), `feeds` (`GifFeed[]`, opens on the first), `placeholder`, `attribution`, `testid` | `attribution` | `pick` (`gif`, the words that found it) |

Composables: `useVoiceRecorder({ maxMs })` (`MediaRecorder` + an `AnalyserNode`: `state`, `elapsedMs`,
`bars`, `problem`, `limitReached`, `supported`, `start`, `finish`, `cancel`) and `useVoicePlayer`
(one `Audio` for the app: `current`, `toggle`, `stop`; `canPlayHere`). Utils (not auto-imported):
`utils/chat/message.ts` (`BubbleMessage`, `BubbleMedia`, `BubbleReaction`, `BubbleQuote`, `Delivery`,
`reactionsLabel`, `reactionWho`, `reactionName`, `sameSide`, `mediaBox`), `utils/chat/gif.ts` (`GifItem`, `GifPage`, `GifResult`,
`GifSearch`, `GifFeed`, `gifColumns`, `latestRequest`), `utils/chat/words.ts` (`fillWords`),
`utils/chat/voice.ts` (+ `LIVE_BARS`, `liveRow`).

**What an app supplies.** The messages (Bookretreats' `ChatItem` fits `BubbleMessage` as it is), the
quotes it builds (`quoteName`, `quotePreview`), the store's actions on the emits (send, retry, react,
reply, sign a picture again, load older), the reaction set (`emojis`), the limits (`max`, `photoAccept`,
`voiceMaxMs`; `checkVoice` with its `VoiceLimits`), the GIF provider (`search`, `feeds`, `placeholder`,
`attribution`), its own kinds in `UiBubble`'s `body` slot (`wide`) and its system lines in the thread's
`message` slot, the top bar and the head in `UiChatThread`'s slots, its own chips in `UiComposer`'s
`actions`, and the words of `ui.text.chat` (`app.config.ts` or `updateAppConfig`). Bookretreats keeps the
phone card and sheet, the system lines, `copy/chat.ts`, `klipy.ts`, the store, the repositories and
`formatPhone`.

**`ui.text.chat`** (English defaults in `app.config.ts`). A `{name}` is a blank the component fills in
(`fillWords`); an app whose copy is functions hands one over filled with the placeholder:
`pick: chat.reactions.pick('{name}')`.

| Key | Default | Used by |
| --- | --- | --- |
| `loading` | Loading the conversation | UiChatThread (placeholder) |
| `offline` | No connection. We will try again in a moment. | UiChatThread |
| `olderLoading`, `olderFailed`, `olderRetry` | Loading earlier messages, Earlier messages could not be loaded., Try again | UiChatThread |
| `read`, `sending`, `failed`, `retryHint` | Read, Sending …, Not sent. Tap to try again., Tap to try again. | UiBubble |
| `composer.label`, `.placeholder`, `.send`, `.actions` | Message, Message, Send, Message actions (the chips' toolbar) | UiComposer |
| `composer.photo`, `.photoLabel`, `.gif`, `.gifLabel` | Photo, Send a photo from your gallery, GIF, Find and send a GIF | UiComposer's chips |
| `reply.bar`, `.cancel`, `.deleted`, `.show` | Reply, Discard reply, Message deleted, `{name}: {preview}. Go to message` | UiReactionBar, UiComposer, UiQuote |
| `media.photo`, `.photoMine`, `.gif`, `.gifMine`, `.open`, `.loading`, `.unavailable` | Photo, Your photo, GIF, Your GIF, View large, Loading picture, Picture not available right now | UiBubble |
| `voice.record`, `.recording`, `.stopped`, `.timer`, `.cancel`, `.send`, `.limit` | Record a voice message, Recording, Recording stopped, `{elapsed} of {max}`, Discard recording, Send voice message, That is as long as a recording can be. You can send it now. | UiComposer |
| `voice.problems.denied`, `.none`, `.busy`, `.unsupported`, `.failed` | (why the microphone did not start) | UiComposer (`voiceError`) |
| `voice.bubble.mine`, `.theirs`, `.play`, `.pause`, `.loading`, `.unplayable`, `.playFailed`, `.position` | Your voice message, Voice message, Play, Pause, Loading voice message, Your device cannot play this voice message., Playing did not work. Tap to try again., `{now} of {total}` | UiVoiceBubble |
| `gifPicker.title`, `.search`, `.feedsLabel`, `.results`, `.none`, `.more`, `.loading`, `.pick`, `.pickTitled`, `.retry` | Send a GIF, Search GIFs, GIF topics, `For “{q}”`, `No GIF for “{q}”.`, Load more, Loading GIFs, `Send GIF {n}`, `Send GIF: {title}`, Try again | UiGifPicker |
| `reactions.bar`, `.open`, `.names`, `.pick`, `.takeBack`, `.byYou`, `.byOther`, `.byBoth`, `.byMany`, `.pill`, `.copy`, `.copied` | Choose a reaction, React, ❤️ Heart … 🔥 Fire (an emoji without a name is read as itself), `React with {name}`, `Take back {name}`, `{name} from you`, `{name} from them` (one other), `{name} from both of you` (the reader and one other), `{name} from {count}` (more), `Reactions: {parts}`, Copy, Copied | UiReactionBar, UiBubble |

### Composables and utils (auto-imported)

- `useModalLayer` (+ `useModalShown`): a sheet or dialog makes the rest of the app inert, locks the
  scroll, moves focus in and back. `useBackDismiss` (+ `listenForBack`, `keepsForeignLayers`): the
  system Back closes it.
- `useSwipeDown`: follow the finger down, dismiss past a distance or a flick. A finger does it the iOS way
  (`useSheetTouch`, decisions in `utils/sheetDrag.ts`): content scrolled down scrolls under a downward drag,
  at its top the same drag moves the sheet, and a gesture that began on the sheet's own detent moves the
  sheet up first and scrolls once it is up.
- `useSheetTouch`: touch events (a pan on a scroller cancels the pointer, so pointer events never see a drag
  that starts in content) that decide per move between scrolling the content and moving the sheet
  (`routeMove`); for a sheet with its own detents too (the member sheet). Which one a gesture is, is settled
  where it begins: `routeMove`'s `startedAtTop` (the content's place as the finger came down) keeps a gesture
  that found the content scrolled the content's to the end — it scrolls to the top and rubber-bands there
  while the sheet stands still, instead of the sheet taking the live scroll over and losing its momentum (r10).
  Left alone: fields, `data-no-swipe`, a second finger, a gesture that goes sideways first.
- `useKeyboardInset` / `useKeyboardViewport`: how much of the window the on-screen keyboard covers,
  what it leaves in view (`room`) and whether one is up (`shown`); one shared reader for all users,
  which also sets `--keyboard-inset` on the root while any is active. `{ pin: true }` holds the page
  still while the layer is open (see [the keyboard](#the-keyboard)).
- `usePaletteKeyboard` (added for Bookretreats): a search palette on the keyboard — its lift and
  its height within the room left in view, on the same reading as `UiSheet`; `UiSearchPalette` (the book,
  Serien & Filme and author palettes) uses it.
- `useHideOnScroll`: chrome that slides away while reading down (utils/hideOnScroll.ts has the arithmetic).
- `useArrival`: the `arrive` motion once, after loading.
- `useUiText`: the layer's own words from the app config.
- `utils/motion.ts`: `parseDuration`, `durationToken`, `easingToken`, `prefersReducedMotion`, `timeAt`.
- `utils/haptics.ts`: `tick`, `stepTick`, `hapticsKind`.
- `utils/keyboard.ts`: the keyboard arithmetic (`readViewport`, the one measurement; `sheetLift`, `paletteLift`, `revealDelta`, …).
- `utils/cloth.ts`: `clothOf`, `glowOf`, `isBlankCover`, `formatAuthors`, `thumbhashDataUrl`, `CoverColors`.
- `utils/chat/*.ts` (the chat's pure logic, **not auto-imported**: the names are too generic for a global;
  import `#ui/utils/chat/<file>` from an app, a relative path from a component). No Vue, no clock, no
  words of their own (they come in from `ui.text.chat`):
  - `timeline.ts`: `dayKey`, `daysAgo`, `dayLabel(at, now, words)` (Intl for weekdays and months),
    `clockTime(at, locale?)` (the locale's clock through `Intl`), `timeline(items, now, keyOf, words)` (day separators, `TimelineRow`), `follows` /
    `endsRun(rows, index, sameRun)` (runs and tails; the app says what the same run is), `compareCreated`.
  - `reply.ts`: the swipe maths (`REPLY_THRESHOLD`, `REPLY_MAX`, `EDGE_PX`, `AXIS_PX`, `AXIS_RATIO`,
    `gestureAxis`, `canStartSwipe`, `replyArmed`, `replyTravel`, `replyProgress`) and the quote's words
    (`oneline`, `quotePreview(quoted, words)`, `quoteName(mine, name, words)`, `Quoted`, `ReplyWords`).
  - `voice.ts`: the recording types (`VOICE_TYPES`, `RECORDING_TYPES`, `voiceMime`, `voiceExtension`,
    `mimeOfPath`, `pickRecordingType`, `canPlayVoice`), the waveform and the clock (`PEAK_COUNT`,
    `peaksFrom`, `clock`), `micProblem`, `checkVoice(blob, durationMs, limits)`, `PreparedVoice`.
    The limits (longest and shortest recording, biggest file) are the app's policy, passed as `VoiceLimits`.
  - Stays in Bookretreats: `formatPhone` (spells a German number: domain), the send queue, the limits' values.
- `plugins/touch-active.client.ts`: one passive touch listener, so `:active` (press feedback) works on iOS.
- `plugins/stranded-viewport.client.ts` (added for Bookretreats): fixed chrome back in place after the keyboard (see [the keyboard](#the-keyboard)).
- `plugins/no-focus-zoom.client.ts`: on iOS only, `maximum-scale=1` on the viewport, so a field under 16 px does not zoom the page in when it takes the keyboard (pinch zoom stays).

### The keyboard

What stands on the keyboard (`UiSheet`, `UiConfirm`, a search palette, a chat screen) uses
`useKeyboardViewport`, and the app's viewport meta has to say
`interactive-widget=resizes-content`:

- **Chrome on Android** then shrinks the page to what the keyboard leaves: fixed things at the
  bottom stand on the keyboard by themselves, `100dvh` shrinks, the inset reads 0. Without the
  directive Chrome lays the keyboard over the page and pans to the field, and a sheet's header goes
  off the top (Libellus measured this before its #58).
- **iOS** ignores the directive and lays the keyboard over the page; the inset is how much of the
  window it covers, and the layer lifts itself by it (`sheetLift`, `paletteLift`) and never grows
  past `room`. With `pin`, iOS's own pan to the field is stopped: a tap on a field that does not have
  the focus yet is focused with `preventScroll` (the caret lands at the end of its text for that
  tap), and a pan that still happens is put back (at once, or once a finger's pan has settled) to
  where the window was when a field took the keyboard (`pinHold`; r10: a screen pinned from the start
  held the scroll of the page it was opened from, and the Feed post's comment bar went behind the
  keyboard's accessory pill for any post below the fold).
  A pan the pin cannot put back is counted: iOS also pans the visual viewport where the window
  cannot scroll (the root is `overflow: hidden` under a modal layer), and a layer that took it as 0
  went up by the keyboard and the pan together (r10: the book palette ~155 pt over the keyboard, its
  top off the screen). Only inside the event that reports it is `offsetTop` not trusted (in the
  installed app it reads 0 there, WebKit bug 237851); the reader keeps the pan it had for that one
  reading and looks again every frame until nothing has moved for 300 ms (`readViewport`).
- **iOS 26's form accessory bar** (‹ › ✓, the floating pill over the keyboard) cannot be hidden by a page. It is
  outside the visual viewport (counted as keyboard, so what stands on `--keyboard-inset` sits above it) and it draws a
  snapshot of whatever page content lies under it; no CSS (`backdrop-filter`, `z-index`, `opacity`) reaches it, only
  content does (1ar.io, "The iOS keyboard gap"). So a layer that stands on the keyboard continues its own plain surface
  below its bottom edge: `UiSheet` (`data-keyboard`, an `::after` of three touch targets in `surface-sheet`) and the chat
  screen (`::after` in `surface`). Nothing but that colour is under the pill.
- The keyboard is measured as Tamagui's Sheet does (verified on iOS 26: `visualViewport` 714 → 404, `innerHeight`
  714 → 561 and wobbling, `documentElement.clientHeight` steady): `clientHeight − (offsetTop + height)`, and a change
  under `MIN_KEYBOARD_HEIGHT` (80) is no keyboard. `layoutHeightOf` takes the larger of `innerHeight` and `clientHeight`,
  which is `clientHeight` wherever `innerHeight` shrinks.
- **What the keyboard leaves behind** (r10): iOS 26 can leave the visual viewport panned once the keyboard
  has gone, and the installed app on 26.0 can keep a shrunk layout viewport; fixed chrome then stands far up
  the screen (the tab bar ~330 pt up). `plugins/stranded-viewport.client.ts` starts `watchStrandedViewport`
  (WebKit on an iPhone only): 300 ms after things are still it tries a scroll nudge, then subtracts what pan
  is left from the floating chrome's and the sheets' bottom (`--viewport-pan`, read by `float-bottom` and
  `screen-bottom`), and flips the page's display to have a shrunk viewport measured again
  (`strandedViewport` in utils/keyboard.ts decides).
- A field under 16 px makes iOS zoom the page in on focus and keep it zoomed (`no-focus-zoom`
  prevents that; the layer's own fields are larger).

Measured in the iOS Simulator (Safari tab and Home Screen app) and Chrome on the Android emulator
for the chat and its sheets (issue t3-keyboard): no pan, no zoom, the field and the action in view.

### CSS (`assets/css/ui.css`)

- The device's insets, read once: `--safe-area-top|bottom|left|right`, `--bar-top`, `--float-bottom`
  (iOS: floating chrome sits `tabBarDrop` into the home-indicator inset).
- Utilities: `screen-inset`, `bar-top`, `safe-bottom`, `safe-x`, `float-bottom`, `screen-bottom` (added for Bookretreats: `bottom: 0` less a stranded pan; never name a utility `<property>-<token>` after a spacing token — `bottom-screen` was read as `bottom-<spacing-screen>` and left sheets 20 px short, r10), `clear-tab-bar`,
  `edge`, `edge-faint`, `glass`, `figures`, `eyebrow`, `book-title`, `title-wrap`, `scrollbar-none`,
  `skeleton`, `wave`, `arrive`.
- Keyframes: `placeholder-wave`, `arrive`, `page-fade-in`, `page-fade-out`, `page-rise`, `page-sink`.
- Base: the room's colour and type on `<html>`/`<body>`, no sideways scrolling, thin ghost-ink
  scroll bars, `::selection`, the focus ring (`accentInk`).
- Reduce Motion: every animation and transition finishes at once (1 ms), so state still changes.

## The variables the layer needs

The app's `tokens.generated.css` has to define these (Tailwind theme names in brackets where the
layer uses the utility rather than the variable). The contract test (`testing/contract.mjs`) fails when the layer
reads a variable the generated file lacks.

- **Colour** (`--color-*`, `bg-*` / `text-*` / `border-*`): `surface`, `surface-raised`,
  `surface-sheet`, `glass`, `fill`, `fill-strong`, `hairline`, `hairline-strong`, `ink`,
  `ink-muted`, `ink-faint`, `ink-ghost`, `on-ink`, `accent`, `accent-ink`, `accent-soft`,
  `lamp-light`, `lamp-cone`, `error`, `error-soft` (UiGifPicker), `scrim`, `cloth1` … `cloth6`, `cloth-ink`.
- **Elevation** (`shadow-*`): `button`, `cover`, `float`, `sheet`, `raised`, `palette` (the chat).
- **Opacity**: `--opacity-glow`, `--opacity-halo` (the theme's decorations).
- **Blur** (`--blur-*`): `glass`, `chrome`, `halo`.
- **Spacing** (`--spacing-*`, `p-*`, `gap-*`, …): `xxs`, `xs`, `sm`, `ms`, `inset`, `md`, `ml`,
  `lg`, `xl`, `xxl`, `screen`, `bar-top`, `tab-bar-drop`, `float-above`, `grabber`.
- **Radius** (`rounded-*`): `cover-sm`, `cover`, `cover-lg`, `sm`, `md`, `lg`, `xl`, `sheet`, `pill`, `tail` (a bubble's small corner).
- **Size** (`--size-*`): `touch`, `max-content`, `avatar`, `tab`, `tab-compact`, `tab-bar`, `tab-icon`, `button`,
  `button-md`, `button-sm`, `row`, `menu`, `switch`, `switch-thumb`, `grabber`, `grabber-height`,
  `empty-art`, `cover-xxs`, `cover-xs`, `cover-sm`, `cover-md`, `cover-lg`, `cover-xl`, `checkbox` (UiCheckbox),
  `composer`, `reaction`, `field`, `avatar-xl` (the chat).
- **Stroke** (`--stroke-*`): `hairline`, `rule`, `focus`, `icon`, `icon-bold`.
- **Type**: `--font-sans`, `--font-mono`, `--font-serif`; `--font-weight-medium`,
  `--font-weight-semibold`; the text styles (`text-*`, each with `--line-height`,
  `--letter-spacing` and, where it has one, `--font-weight`): `title`, `headline`, `input`,
  `callout`, `body-large`, `body`, `subhead`, `caption`, `footnote`, `meta`, `eyebrow`.
- **Motion**: `--duration-instant`, `quick`, `standard`, `exit`, `sheet`, `sheet-exit`,
  `keyboard`, `wave`, `gentle` (the chat); `--ease-standard`, `exit`, `sheet`, `keyboard`, `wave`.
- **Theme scheme**: `color-scheme` per theme (the generated file sets it).

## Changes against Libellus

What Libellus has to do when it moves onto the layer (its own `components/ui/`, the matching
composables, utils and the parts of `main.css` go; the layer comes in):

**Renamed or moved (Libellus adapts a line or an import)**

- [ ] **Copy**: the components no longer call `useI18n()`. Libellus sets `ui.text` (`cancel` ←
  `common.cancel`, `offline` ← `common.offline`, `etAl` ← `common.etAl`) with
  `updateAppConfig` whenever the locale changes (a watcher in app.vue or a plugin).
- [ ] **`utils/cover.ts` split**: `clothOf`, `CLOTH_COUNT`, `thumbhashDataUrl`, `glowOf`, `Glow`,
  `NEUTRAL_GLOW`, `MIN_SHOWN_SIDE`, `isBlankCover` and the `CoverColors` type moved to the layer's
  `utils/cloth.ts`; `formatAuthors` from `utils/books.ts` too. Libellus keeps the source-specific
  rest (`coverSrc`, `coverFallbacks`, `APPLE_BOX`, `OPENLIBRARY_SIZE`, `CoverSize`) and removes the
  moved names (auto-imports would otherwise clash). `data/books.ts` imports `CoverColors` from the layer.
- [ ] **`SheetRestore`** is exported by `Sheet.vue` (`#ui/components/ui/Sheet.vue`);
  `composables/useSheetRestore.ts` imports it from there.
- [ ] **History state key** of `useBackDismiss`: `uiLayer` (was `libellusLayer`); `e2e/support.ts`
  reads `history.state.uiLayer`.
- [ ] **Router**: the layer's `router.options.ts` (added by the hook in its `nuxt.config.ts`) installs `listenForBack` + `keepsForeignLayers`;
  Libellus' own `history` option in `app/router.options.ts` goes (its scroll behaviour stays).
- [ ] **`main.css`**: the layer's `ui.css` replaces Libellus' safe-area variables, the utilities,
  the base layer (minus `color-scheme`, which the generated tokens set per theme), the scroll bars,
  the `page-*` keyframes and the Reduce Motion rule. Libellus keeps its fonts, its profile-push
  view transition (`html[data-profile-transition] …`) and the `color-scheme` rules of its dark
  room (`[data-theme='dark']`, `prefers-color-scheme`), and adds the `@import` as above.
- [ ] **`plugins/touch-active.client.ts`** comes from the layer; Libellus' copy goes.
- [ ] **Tests** for the moved utils live here: `tests/ui-keyboard.test.ts`,
  `ui-hide-on-scroll.test.ts` and `ui-haptics.test.ts` are Libellus' own with the import paths
  changed; `ui-layer.test.ts` pins the contract and `utils/cloth.ts`. `motion.test.ts` follows in
  step 3 with the motion tokens.

**Added (nothing to do; available to Libellus)**

- `UiAvatar`: `lazy` (the photo loads with `loading="lazy"`; a photo that fails to load is dropped, the initials stay), `size` (xs 30 · sm 32, the default and Libellus' only size · md 40 · lg 40 · xl 72),
  `solid` (the fill laid on the room colour, opaque over a cover) and `fallback` (a second URL to draw when `photo` is refused: Bookretreats draws the 256 px face of a member's photo and falls back to the stored 1024 px one, `data/avatarFace.ts`; when that fails too the initials stay), plus a `fallback` event, emitted when that switch happens, so the caller can remember a missing face and not ask for it again (`MemberAvatar`).
- `UiCover`: `kind` (`book`, the default, or `screen`: a series' or film's poster, without the spine crease); `size` `xxs` (24 px wide, 36 px tall: a strip of covers in a 48 px row, 6 px of air above and below; the cloth has no type, as under `xs`).
- `UiEmptyState`: an `art` slot for an illustration of the app's own (the lamp is the default).
- `UiRow`: `as="a"`, a row that is a link out of the app (`href`, `target`, `rel` pass through to the anchor).
- `UiRowGroup`: `as` (`div`, the default, or `ul`).
- `UiField`: `hint`, a quiet line under the rule (described-by), which the error replaces while there is one.
- `UiRow`: a `lead` slot in the icon's place (a face or a mark the icon set lacks); `icon` stays its default.
- `UiIcon`: Bookretreats' icons on the same grid — `map`, `people`, `chat`, `orga`, `person`,
  `gear`, `send`, `eyeOff`, `bell`, `heart`, `eye`, `download`, `doc`, `book`, `shield`, `star`,
  `cake`, `ticket`, `history`, `userPlus`, `quote`, `drop`, `clock`, `ban`, `unlock`, `checkCircle`, `calendarOff`, `external` (↗, a link that leaves the app), `mic`, `play`, `pause` (the voice message's), `paw` (Haustiere), `link` (verbunden: the Orga's connection counts), `feed` (a post card: the Feed's tab), `pin` (a pushpin: the pinned announcement), `poll` (three bars of different length: the Feed's poll kind), `reply` (the curved arrow that answers a message: Bookretreats' chat)
  (`share` is Libellus' own, newer than the snapshot the layer started from).
- `UiAmbient`: `pool` (`{ a, b }`, two CSS colours) and `strength` (a CSS opacity, default `--opacity-glow`): the card is lit in
  colours the app names, at the strength it names. Bookretreats lights one card with them, the Feed's pinned announcement
  (`announcePoolA/B`, `--opacity-announce`; docs/DESIGN.md §11). Libellus does not need them.
- `UiTabBar`: five tabs (an admin's) take `--size-tab-compact` (62) each instead of `--size-tab` (72), so the capsule fits a 390 pt phone.
- `UiCheckbox`: a consent or choice that is ticked, Libellus' import check (a hairline ring, ticked an accent disc
  with the tick) as a component over a native checkbox; the words in its slot.
- `UiConfirm`: `tone` (`danger`, the default, or `primary`: the action in ink, for one that can be taken back). A default slot under the sentence, for what the question needs besides it (the Orga's ban takes a reason there).
- `UiSearchPalette`: new in the layer. Libellus' search palette is its app's (`components/shell/SearchOverlay.vue`, with the morph out of the tab bar and the palette room); this is its frame without the morph, opened in Libellus' order (focus first, the animation after). Libellus can build its overlay on it once the morph is a variant of it.
- `UiMediaViewer` and `utils/flip.ts` (`flipTransform`, `coverCrop`, `morphFrames`): new, no Libellus counterpart (Libellus shows no cover large). A picture full screen that grows out of the round face it was opened from and shrinks back into it.
  `morphFrames` takes the face's own corner radius (`faceRadius`, px; additive): a rounded tile starts as that tile, never rounder than the circle, so avatars are unchanged; the viewer reads it from the origin's computed `border-top-left-radius`. Added with the Feed's photo posts.
  `useSwipeDown`'s `dismiss` now gets the distance the drag had gone, by mouse and by finger alike (additive; the viewer's leave starts from there; its swipe-down takes `useSheetTouch` like the sheets).
  `failed` (additive): the picture did not load, so the app can sign a short-lived URL anew (the chat's pictures; the chat's own viewer is this one now).
- The chat (`UiChatThread`, `UiBubble`, `UiDaySeparator`, `UiQuote`, `UiReactionBar`, `UiComposer`, `UiComposerChip`,
  `UiVoiceBubble`, `UiGifPicker`, `useVoiceRecorder`, `useVoicePlayer`, `utils/chat/*`): new, no Libellus counterpart
  (Bookretreats' chat, moved as it was; see [Chat](#chat)). BetterReads' buddy reads build on it.
  *Why `clip-path` + transform on the real image and not the View Transitions API* (evaluated, `view-transitions-vue`):
  a view transition shows bitmap snapshots of the whole page, so the picture could only be *scaled* (the crop-to-fill → full-frame
  and circle → rounded-corner change would be a keyframed `clip-path` on pseudo-elements of a blurry bitmap); it
  freezes the page behind (the vaul sheet under it stops taking input and its own transform animations would be
  captured mid-flight), can only be started once at a time (a close in the middle of the opening, or following the finger of a
  swipe and then morphing home, is not possible), and needs Safari 18+ (installed iOS PWAs on older iOS and
  Android WebViews fall back to nothing). FLIP on the real element works everywhere, stays interruptible (a close in the middle
  reverses the opening animation) and keeps the image crisp. The geometry is pure (`morphFrames`: the avatar's cover crop of
  the photo → `inset()` + `round` for the start frame, `inset(0 round r)` for the end, one even scale + translate; Vitest in
  `tests/ui-flip.test.ts`). The image box is the photo's own (`max-width/height: 100%`, its natural aspect), so contain and the full
  frame are one box. Also fixed: a leaving element's template refs are already cleared, the old close animation never found its image.
- `UiSheet` (via `useSwipeDown`): a downward drag that starts in scrolling content scrolls it while it is not at its top and moves the sheet once it is — in a gesture that came down on content already at its top; one that found the content scrolled stays the content's (iOS's rubber band, r10). Libellus' `useSwipeDown` takes a drag in content only from `scrollTop` 0 and with pointer events, which the browser cancels as soon as it pans, so there only the header ever moved the sheet. New: `useSheetTouch`, `utils/sheetDrag.ts`.
- `UiSheet`: `cancel` (`false` leaves Cancel out, for a sheet that is only read and closed by its action).
- `UiSheet`: scrim and panel are `pointer-events-auto`. A sheet that rises over a Reka/vaul dialog (Bookretreats' member sheet) is teleported to `body`, where the dialog's lock has set `pointer-events: none`; without it the sheet could be seen but not tapped.
- `UiSheet`: with the keyboard up (iOS), its surface goes on below the bottom edge (`data-keyboard`), so iOS 26's form
  accessory bar shows plain sheet colour ([the keyboard](#the-keyboard)). Libellus has no such handling.
- `utils/keyboard.ts`: `keyboardInsetOf` ignores a covered height under `MIN_KEYBOARD_HEIGHT` (80), after Tamagui's Sheet.
- `useKeyboardViewport` / `useKeyboardInset`: an `options` argument with `pin` (the page holds still under
  a layer on the keyboard, [the keyboard](#the-keyboard)), `shown` (a keyboard is up, also where it resized
  the page), one shared reader for all users, and `--keyboard-inset` on the root while any is active;
  `keyboardShown` and `pinHold` in `utils/keyboard.ts`. `UiSheet`, `UiConfirm` and Bookretreats' palette, chat and Feed post pin.
- `UiConfirm`: stands on the keyboard as a sheet does (lift, `room` cap, the card scrolls and keeps the
  focused field in view), for a field in its slot.
- `plugins/no-focus-zoom.client.ts`: no zoom on focus on iOS. Libellus' fields are 16 px or larger, so it
  has not needed it; it does as soon as one is smaller.
- `UiPill`: `radio` (`role=radio` + `aria-checked` instead of `aria-pressed`, for a choice of one), and the
  press (scale 0.97 over `instant`) and a `quick` fade between on and off that Libellus' pill lacks.
- `UiDateRow`: Libellus' `components/ui/DateRow.vue` (a day in a RowGroup: the native date picker laid invisibly over
  the whole row), ported without Libellus' i18n and `useDays` (the layer has no copy): `text` is the day in words as
  the app formats it (the ISO day without), `icon` the mark (default `calendar`; Bookretreats' Geburtstag row takes
  `cake`), `placeholder` what an empty day says (none by default). Same `v-model` (`YYYY-MM-DD` or ''), `min`, `max`,
  `invalid`, `testid` on the input.
- `UiSegmented`: a `model` that matches none of the options lights none of them (nothing chosen yet: Lesesprache
  before she has set one); the first option stays the one tab stop.
- `UiSkeleton`: the `skeleton wave` placeholder as a component (`wave` offset, `as`).
- `UiTabBar`: a generic tab bar (Libellus' `components/shell/TabBar.vue` carries its own tabs and
  the search morph, so it may keep it; the shared one takes tabs as `items` and extra controls in
  its slot).
- `UiTabBar`: a slot `icon-<key>` (`{ active }`) for a tab that draws something of its own instead of its icon
  (Bookretreats' Profil tab shows her face, Instagram's way: the active state is the face's own ring, so the
  accent dot under such a tab is left out).
- `UiSegmented`: `compact` (ported from Libellus, where it is the Profile's Glass setting: 32 high, footnote
  size, `sm` corners, options 44 high to touch), `disabled`, and an option's own `testid`, for a control whose
  options keep test ids they had as buttons.
- `useUiText`, `app.config.ts` (`ui.text`).

**Fixed**

- `UiAvatar`'s photo fade used `duration-standard`, which is no Tailwind utility (durations have no
  theme namespace), so a new photo appeared without the fade; now `duration-(--duration-standard)`.
- `barAfterScroll` (`utils/hideOnScroll.ts`) hid the tab bar on any page that scrolled at all: on a
  page only a little longer than the screen it went after a few pixels and came back before she was
  done reading. It now keeps the bar while `end` (what the page scrolls past the screen) stays
  under `MIN_END_PX` (640, about one screen of a phone), and hides as before from there on;
  `useHideOnScroll` and `UiTabBar` are unchanged. Libellus has the same rule to take
  (issue #82).

**Generator (`design/build.mjs`)** — Libellus' with one change: themes are named in `THEMES`
(Bookretreats: `papier` and `blau`) instead of light/dark/sepia; a themed value has
one entry per theme, every theme gets `[data-theme='<name>']`, the default (`DEFAULT_THEME`: Blau)
sits on `:root`, and the Swift output takes it. Also: `letterSpacing` maps to Tailwind's `tracking`
namespace, a `spring` group is unitless
(like `opacity`), and Swift keywords as token names are escaped. Libellus may keep its own generator.

## Adding to the layer

- Something goes into the layer only if another app could use it unchanged: no Bookretreats copy,
  data or store. App-specific parts (the auth frame, the code input, profile and member components)
  stay in the app. The chat is in the base (plan decision 4: it moved as it was, and group chats and
  buddy reads build on it): its domain parts — Bookretreats' phone card and sheet, its system lines,
  its copy, its GIF provider, its store — stay in the app and fill the components' slots and props.
- A new variable the layer reads goes into this README's list and into the app's tokens in the
  same bump (the contract test holds the two together).
- Anything that differs from Libellus goes into [Changes against Libellus](#changes-against-libellus).
