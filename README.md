# The UI layer

Libellus' design system (fabkho/libellus, `web/app/components/ui/`, its composables, utils and
`main.css`, at commit `f9764be`) as a Nuxt layer, so Bookretreats runs on it now and Libellus can
move onto it later without renaming anything (issue #70; port plan step 2,
`docs/design-variants/port-plan.md` on the prototype branch).

**Compatibility with Libellus comes first.** Component names, props, slots, emitted events, CSS
utility names and token names are Libellus'. Improvements are additive (a new optional prop, a new
slot, a new token, a fixed bug), never a renamed or reshaped API, and every one is listed under
[Changes against Libellus](#changes-against-libellus), so Libellus' move is a checklist.

Nuxt 4 picks the layer up from `~~/layers/ui` by itself (no `extends`). The layer has no `app/`
folder: its root is its source directory.

```
layers/ui/
  nuxt.config.ts        the `#ui` alias, nothing else
  app.config.ts         the words the layer says itself (ui.text), in English
  router.options.ts     the system Back closes the top sheet (useBackDismiss)
  assets/css/ui.css     utilities, base styles, keyframes, Reduce Motion
  components/ui/*.vue   UiButton, UiRow, UiSheet, …
  composables/*.ts      useModalLayer, useBackDismiss, useSwipeDown, …
  utils/*.ts            motion, haptics, keyboard, hideOnScroll, cloth
  plugins/              touch-active (`:active` on iOS)
```

## The contract

1. **The layer imports nothing from the app.** No stores, no `~/copy`, no Supabase, no `~/` or
   `@/` imports at all (inside a layer `~` is the *app's* source directory: the layer's own files
   import each other relatively, or through Nuxt's auto-imports). Copy comes in through props and
   slots; the few words the layer says itself come from the app config (below).
2. **Design tokens only through CSS variables and Tailwind theme names.** The app supplies the
   values: its `design/tokens.json` generated into `app/assets/css/tokens.generated.css`
   (`design/build.mjs`, Libellus' generator). [Every variable the layer reads](#the-variables-the-layer-needs)
   is listed below; `tests/ui-layer.test.ts` fails when the layer reads one the app does not define.
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

## Using it in an app

- **Tailwind** (`app/assets/css/main.css`), after `tailwindcss` and the app's tokens:

  ```css
  @import 'tailwindcss';
  @import './tokens.generated.css';
  /* the app's fonts */
  @import '../../../layers/ui/assets/css/ui.css';
  @source '../../../layers/ui';
  ```

  `@source` makes Tailwind read the layer's components for the classes they use; `ui.css` brings
  the utilities and base styles listed below, resolved against the app's tokens.
- **Fonts** are the app's: the layer names the families only through `--font-sans|mono|serif`.
  Libellus' (and Bookretreats') are Geist, Geist Mono and Newsreader from Fontsource.
- **Copy** (`app.config.ts`): the layer's own words are `ui.text.cancel` (a sheet's and a dialog's
  way out), `ui.text.offline` (UiButton `offline`) and `ui.text.etAl` (a cover's authors). The
  layer's defaults are English; an app overrides them in its `app.config.ts`:

  ```ts
  export default defineAppConfig({ ui: { text: { cancel: 'Abbrechen', offline: 'Offline', etAl: 'u. a.' } } })
  ```

  An app with translations keeps them current with `updateAppConfig({ ui: { text: { … } } })`
  when the language changes (components read them through `useUiText()`).
- **Router**: `router.options.ts` wraps the router's history so the system Back (Android's back
  gesture, the browser's Back) closes the top sheet or dialog instead of leaving the page
  (`useBackDismiss`). Nuxt merges it with the app's own `router.options.ts`; an app that sets its
  own `history` must wrap it the same way (`listenForBack(); return keepsForeignLayers(createWebHistory(base))`).
  Nuxt only looks for it in `<layer>/app/router.options.ts`, and this layer has no `app/` folder, so
  the layer's `nuxt.config.ts` adds the file with the `pages:routerOptions` hook. Without it the
  listener is added late, after the router's own, and a change of page made while a layer closes
  navigates back to the page it left.
- **Types** from the layer: `import type { IconName } from '#ui/components/ui/Icon.vue'`
  (`UiTab` from `TabBar.vue`, `SheetRestore` from `Sheet.vue`).

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
| `UiMediaViewer` | A picture full screen (`open`, `url`, `label`, `dialogLabel`, `closeLabel`, `origin`): dark veil, close button, Esc / tap / swipe down / Back close it; grows out of `origin` (FLIP, a cross-fade under Reduce Motion). Added for Bookretreats. |
| `UiAvatar` | Initials in mono in a hairline ring, or the photo over them. |
| `UiIcon` | The icon set on the 24 grid (`IconName`). |
| `UiEmptyState` | Empty state: the drawing (or the `art` slot), a serif line, a sentence, the way forward. |
| `UiProgress` | A thin progress bar. |
| `UiAmbient` | The light a cover throws into a card or page (off where the theme says so). |
| `UiSkeleton` | A placeholder swelling with the loading wave. |
| `UiCover` | A cover in 2:3: the image, or a generated cloth from title and authors; `kind` book or screen. |
| `UiTabBar` | The floating glass tab bar: `items`, dot and lock per tab, hides on scroll, tap again for the top; a slot `icon-<key>` draws a tab's own face in the icon's place. |

### Composables and utils (auto-imported)

- `useModalLayer` (+ `useModalShown`): a sheet or dialog makes the rest of the app inert, locks the
  scroll, moves focus in and back. `useBackDismiss` (+ `listenForBack`, `keepsForeignLayers`): the
  system Back closes it.
- `useSwipeDown`: follow the finger down, dismiss past a distance or a flick. A finger does it the iOS way
  (`useSheetTouch`, decisions in `utils/sheetDrag.ts`): content scrolled down scrolls under a downward drag,
  at its top the same drag moves the sheet, and one gesture can pass from one to the other.
- `useSheetTouch`: touch events (a pan on a scroller cancels the pointer, so pointer events never see a drag
  that starts in content) that decide per move between scrolling the content and moving the sheet
  (`routeMove`); for a sheet with its own detents too (the member sheet). Left alone: fields, `data-no-swipe`,
  a second finger, a gesture that goes sideways first.
- `useKeyboardInset` / `useKeyboardViewport`: how much of the window the on-screen keyboard covers,
  what it leaves in view (`room`) and whether one is up (`shown`); one shared reader for all users,
  which also sets `--keyboard-inset` on the root while any is active. `{ pin: true }` holds the page
  still while the layer is open (see [the keyboard](#the-keyboard)).
- `usePaletteKeyboard` (added for Bookretreats): a search palette on the keyboard — its lift and
  its height within the room left in view, on the same reading as `UiSheet`; the book, Serien &
  Filme and author palettes use it.
- `useHideOnScroll`: chrome that slides away while reading down (utils/hideOnScroll.ts has the arithmetic).
- `useArrival`: the `arrive` motion once, after loading.
- `useUiText`: the layer's own words from the app config.
- `utils/motion.ts`: `parseDuration`, `durationToken`, `easingToken`, `prefersReducedMotion`, `timeAt`.
- `utils/haptics.ts`: `tick`, `stepTick`, `hapticsKind`.
- `utils/keyboard.ts`: the keyboard arithmetic (`readViewport`, the one measurement; `sheetLift`, `paletteLift`, `revealDelta`, …).
- `utils/cloth.ts`: `clothOf`, `glowOf`, `isBlankCover`, `formatAuthors`, `thumbhashDataUrl`, `CoverColors`.
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
  tap), and a pan that still happens is put back (at once, or once a finger's pan has settled).
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
  `bottom-screen`), and flips the page's display to have a shrunk viewport measured again
  (`strandedViewport` in utils/keyboard.ts decides).
- A field under 16 px makes iOS zoom the page in on focus and keep it zoomed (`no-focus-zoom`
  prevents that; the layer's own fields are larger).

Measured in the iOS Simulator (Safari tab and Home Screen app) and Chrome on the Android emulator
for the chat and its sheets (issue t3-keyboard): no pan, no zoom, the field and the action in view.

### CSS (`assets/css/ui.css`)

- The device's insets, read once: `--safe-area-top|bottom|left|right`, `--bar-top`, `--float-bottom`
  (iOS: floating chrome sits `tabBarDrop` into the home-indicator inset).
- Utilities: `screen-inset`, `bar-top`, `safe-bottom`, `safe-x`, `float-bottom`, `bottom-screen` (added for Bookretreats: `bottom: 0` less a stranded pan), `clear-tab-bar`,
  `edge`, `edge-faint`, `glass`, `figures`, `eyebrow`, `book-title`, `title-wrap`, `scrollbar-none`,
  `skeleton`, `wave`, `arrive`.
- Keyframes: `placeholder-wave`, `arrive`, `page-fade-in`, `page-fade-out`, `page-rise`, `page-sink`.
- Base: the room's colour and type on `<html>`/`<body>`, no sideways scrolling, thin ghost-ink
  scroll bars, `::selection`, the focus ring (`accentInk`).
- Reduce Motion: every animation and transition finishes at once (1 ms), so state still changes.

## The variables the layer needs

The app's `tokens.generated.css` has to define these (Tailwind theme names in brackets where the
layer uses the utility rather than the variable). `tests/ui-layer.test.ts` fails when the layer
reads a variable the generated file lacks.

- **Colour** (`--color-*`, `bg-*` / `text-*` / `border-*`): `surface`, `surface-raised`,
  `surface-sheet`, `glass`, `fill`, `fill-strong`, `hairline`, `hairline-strong`, `ink`,
  `ink-muted`, `ink-faint`, `ink-ghost`, `on-ink`, `accent`, `accent-ink`, `accent-soft`,
  `lamp-light`, `lamp-cone`, `error`, `scrim`, `cloth1` … `cloth6`, `cloth-ink`.
- **Elevation** (`shadow-*`): `button`, `cover`, `float`, `sheet`.
- **Opacity**: `--opacity-glow`, `--opacity-halo` (the theme's decorations).
- **Blur** (`--blur-*`): `glass`, `chrome`, `halo`.
- **Spacing** (`--spacing-*`, `p-*`, `gap-*`, …): `xxs`, `xs`, `sm`, `ms`, `inset`, `md`, `ml`,
  `lg`, `xl`, `xxl`, `screen`, `bar-top`, `tab-bar-drop`, `float-above`, `grabber`.
- **Radius** (`rounded-*`): `cover-sm`, `cover`, `cover-lg`, `sm`, `md`, `xl`, `sheet`, `pill`.
- **Size** (`--size-*`): `touch`, `max-content`, `avatar`, `tab`, `tab-bar`, `tab-icon`, `button`,
  `button-md`, `button-sm`, `row`, `menu`, `switch`, `switch-thumb`, `grabber`, `grabber-height`,
  `empty-art`, `cover-xxs`, `cover-xs`, `cover-sm`, `cover-md`, `cover-lg`, `cover-xl`, `checkbox` (UiCheckbox).
- **Stroke** (`--stroke-*`): `hairline`, `rule`, `focus`, `icon`, `icon-bold`.
- **Type**: `--font-sans`, `--font-mono`, `--font-serif`; `--font-weight-medium`,
  `--font-weight-semibold`; the text styles (`text-*`, each with `--line-height`,
  `--letter-spacing` and, where it has one, `--font-weight`): `title`, `headline`, `input`,
  `callout`, `body-large`, `body`, `subhead`, `caption`, `footnote`, `meta`, `eyebrow`.
- **Motion**: `--duration-instant`, `quick`, `standard`, `exit`, `sheet`, `sheet-exit`,
  `keyboard`, `wave`; `--ease-standard`, `exit`, `sheet`, `keyboard`, `wave`.
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
  room (`[data-theme='dark']`, `prefers-color-scheme`), and adds `@import` + `@source` as above.
- [ ] **`plugins/touch-active.client.ts`** comes from the layer; Libellus' copy goes.
- [ ] **Tests** for the moved utils live here: `tests/ui-keyboard.test.ts`,
  `ui-hide-on-scroll.test.ts` and `ui-haptics.test.ts` are Libellus' own with the import paths
  changed; `ui-layer.test.ts` pins the contract and `utils/cloth.ts`. `motion.test.ts` follows in
  step 3 with the motion tokens.

**Added (nothing to do; available to Libellus)**

- `UiAvatar`: `lazy` (the photo loads with `loading="lazy"`; a photo that fails to load is dropped, the initials stay), `size` (xs 30 · sm 32, the default and Libellus' only size · md 40 · lg 40 · xl 72)
  and `solid` (the fill laid on the room colour, opaque over a cover).
- `UiCover`: `kind` (`book`, the default, or `screen`: a series' or film's poster, without the spine crease); `size` `xxs` (24 px wide, 36 px tall: a strip of covers in a 48 px row, 6 px of air above and below; the cloth has no type, as under `xs`).
- `UiEmptyState`: an `art` slot for an illustration of the app's own (the lamp is the default).
- `UiRow`: `as="a"`, a row that is a link out of the app (`href`, `target`, `rel` pass through to the anchor).
- `UiRowGroup`: `as` (`div`, the default, or `ul`).
- `UiField`: `hint`, a quiet line under the rule (described-by), which the error replaces while there is one.
- `UiRow`: a `lead` slot in the icon's place (a face or a mark the icon set lacks); `icon` stays its default.
- `UiIcon`: Bookretreats' icons on the same grid — `map`, `people`, `chat`, `orga`, `person`,
  `gear`, `send`, `eyeOff`, `bell`, `heart`, `eye`, `download`, `doc`, `book`, `shield`, `star`,
  `cake`, `ticket`, `history`, `userPlus`, `quote`, `drop`, `clock`, `ban`, `unlock`, `checkCircle`, `calendarOff`, `external` (↗, a link that leaves the app), `mic`, `play`, `pause` (the voice message's), `paw` (Haustiere)
  (`share` is Libellus' own, newer than the snapshot the layer started from).
- `UiCheckbox`: a consent or choice that is ticked, Libellus' import check (a hairline ring, ticked an accent disc
  with the tick) as a component over a native checkbox; the words in its slot.
- `UiConfirm`: `tone` (`danger`, the default, or `primary`: the action in ink, for one that can be taken back). A default slot under the sentence, for what the question needs besides it (the Orga's ban takes a reason there).
- `UiMediaViewer` and `utils/flip.ts` (`flipTransform`): new, no Libellus counterpart (Libellus shows no cover large). A picture full screen that grows out of the element it was opened from.
- `UiSheet` (via `useSwipeDown`): a downward drag that starts in scrolling content scrolls it while it is not at its top and moves the sheet once it is (iOS). Libellus' `useSwipeDown` takes a drag in content only from `scrollTop` 0 and with pointer events, which the browser cancels as soon as it pans, so there only the header ever moved the sheet. New: `useSheetTouch`, `utils/sheetDrag.ts`.
- `UiSheet`: `cancel` (`false` leaves Cancel out, for a sheet that is only read and closed by its action).
- `UiSheet`: with the keyboard up (iOS), its surface goes on below the bottom edge (`data-keyboard`), so iOS 26's form
  accessory bar shows plain sheet colour ([the keyboard](#the-keyboard)). Libellus has no such handling.
- `utils/keyboard.ts`: `keyboardInsetOf` ignores a covered height under `MIN_KEYBOARD_HEIGHT` (80), after Tamagui's Sheet.
- `useKeyboardViewport` / `useKeyboardInset`: an `options` argument with `pin` (the page holds still under
  a layer on the keyboard, [the keyboard](#the-keyboard)), `shown` (a keyboard is up, also where it resized
  the page), one shared reader for all users, and `--keyboard-inset` on the root while any is active;
  `keyboardShown` in `utils/keyboard.ts`. `UiSheet`, `UiConfirm` and Bookretreats' palette and chat pin.
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
  data or store. App-specific parts (the auth frame, the code input, the chat composer, profile and
  member components) stay in the app.
- A new variable the layer reads goes into this README's list and into the app's tokens in the
  same change (`tests/ui-layer.test.ts` holds the two together).
- Anything that differs from Libellus goes into [Changes against Libellus](#changes-against-libellus).
