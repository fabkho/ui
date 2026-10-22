# @fabkho/ui

The shared UI base of Bookretreats and BetterReads: a Nuxt layer with the `Ui*` components, composables,
utils and a Tailwind v4 stylesheet, themed only through CSS variables. It started as Libellus' design system
(fabkho/libellus) and keeps its names: props, slots, events, utilities and token names are not renamed; a
change is additive and listed in [CHANGELOG.md](CHANGELOG.md).

**Documentation is Storybook: https://fabkho.github.io/ui/.** Every component has a page there with its
description, props, slots and events, its states in two themes, and an accessibility check. This README
covers only what Storybook does not: installing the base, the contract an app must meet, and the rules.

## Install

`package.json`, pinned to a release tag (never a branch; the lockfile pins the commit):

```json
"dependencies": { "@fabkho/ui": "github:fabkho/ui#v0.6.0" }
```

Nothing is published to npm. The app also has `nuxt`, `vue` and `vue-router` (peer dependencies).

`ui.config.ts` and `nuxt.config.ts`:

```ts
// ui.config.ts
export const uiLayer = () => process.env.UI_LAYER || '@fabkho/ui'
```

```ts
// nuxt.config.ts
import { uiLayer } from './ui.config'
export default defineNuxtConfig({
  extends: uiLayer(),
  vite: { optimizeDeps: { include: ['@fabkho/ui > thumbhash'] } },
})
```

`UI_LAYER=/path/to/ui` points an app at a local checkout (no `pnpm link`). Base files are imported as
`#layers/ui/app/...`, e.g. `import type { IconName } from '#layers/ui/app/components/ui/Icon.vue'`,
`#layers/ui/app/utils/chat/timeline`; the stylesheet is `@import '#layers/ui/app/assets/css/ui.css'`
(or `@fabkho/ui/app/assets/css/ui.css` in a checked-in `main.css`, which always reads the installed copy).

`main.css`: `@import 'tailwindcss'`, the app's generated tokens, the app's fonts, then
`@import '@fabkho/ui/app/assets/css/ui.css'`. `ui.css` carries its own `@source`, so Tailwind scans the
layer's components.

## The contract an app meets

1. **Tokens.** The app defines every CSS variable the layer reads (its generated token file). The list is in
   `testing/contract.mjs`; the app's test runs it against its own tokens:

   ```ts
   import { readFileSync } from 'node:fs'
   import { expect, it } from 'vitest'
   import { layerContract } from '@fabkho/ui/testing/contract.mjs'

   it('the base reads only what this app defines', () => {
     const found = layerContract({ tokensCss: readFileSync('app/assets/css/tokens.generated.css', 'utf8') })
     expect(found).toEqual({ importsFromApp: [], missingVariables: [], missingCloths: [], rawCurves: [] })
   })
   ```

   Families: colours (`--color-*`, incl. `cloth1…6`), elevation (`shadow-*`), `--opacity-glow` and `--opacity-halo`,
   blur, spacing, radius, sizes, strokes, `--font-sans|mono|serif`, text styles, `--duration-*` and `--ease-*`,
   `color-scheme`. Optional, with fallbacks: `--glass-solid`, `--glass-scale`, `--veil-solid`, `--size-target`, `--avatar-stack-ring` (the ring round a stack of faces),
   `--hit-up`, `--hit-down`. Themes are `html[data-theme='<name>']`; only colours change between them.
2. **Copy** (`app.config.ts`, `ui.text`). English defaults; an app overrides them:

   ```ts
   export default defineAppConfig({ ui: { text: { cancel: 'Abbrechen', offline: 'Offline', etAl: 'u. a.', more: 'Mehr', less: 'Weniger' } } })
   ```

   An app with a language switch keeps them current with `updateAppConfig`. The chat's words are
   `ui.text.chat.*` (Storybook's chat pages list them); `useUiText()` reads them in components.
3. **Other app config keys**, all optional:
   - `ui.icons`: SVG shapes on the 24-unit grid under an `IconName`; a name left out keeps the layer's drawing.
   - `ui.cover.sources(src, size)` and `ui.cover.artworkOf(url)`: how an app's cover CDN sizes and names its images.
   - `ui.ambient.grain`: `image` (default) or `inline`.
4. **Overrides are visible.** Nuxt gives an app's file priority over a base file of the same name (an app's
   `app/components/ui/Cover.vue` replaces `UiCover`). The base logs each one once in dev, and `layerOverrides()`
   from `@fabkho/ui/testing/overrides.mjs` lists them (plain Node). An app's test pins the list it means:

   ```ts
   import { layerOverrides } from '@fabkho/ui/testing/overrides.mjs'
   const overrides = layerOverrides({ app: 'app', layer: process.env.UI_LAYER }).map((o) => o.name)
   expect(overrides).toEqual([]) // the allow-list: the names the app replaces on purpose
   ```

5. **Router.** `router.options.ts` makes the system Back close the top sheet or dialog (`useBackDismiss`). An app
   with its own `history` wraps it the same way: `listenForBack(); return keepsForeignLayers(createWebHistory(base))`.
6. **Releases.** Nothing is pushed into an app. Each app pulls a release with a bump pull request that its owner
   reviews; the app keeps its pinned tag until then, and can pin an older one again (the rollback).

## Rules

- **Portable by default.** A component that could ever be generic has no app state (no stores, Pinia,
  Supabase or i18n calls), no app-coupled imports, role names rather than domain names, styling only through
  tokens, and one component per file with its own props and emits types. A component that follows this moves
  here by copying the file.
- **Library first.** Before writing a utility or a widget's logic, look for a maintained library that fits the
  dependency cap. Peer dependencies `nuxt`, `vue`, `vue-router`; one runtime dependency, `thumbhash`. A headless
  library is allowed only inside one widget, behind the same `Ui*` API, and recorded here as an exception
  (**none today**). Focus in modal layers is done without a library (`utils/focusWrap.ts`).
- **Accessibility.** WCAG 2.2 AA and the WAI-ARIA Authoring Practices pattern for each widget: roles, accessible
  names, keyboard support, focus management, `prefers-reduced-motion`, 44×44 px targets.
- **Mobile first: VoiceOver, touch and gestures before desktop and keyboard.** Every swipe, drag and long press has a
  single-tap alternative that a screen reader reaches (WCAG 2.5.1, 2.5.7); text at 200 % reflows without cutting
  anything (1.4.4, 1.4.10). Touch, safe areas, bottom sheets and the keyboard come first; desktop is not a target.
- **A story per component.** A new or changed component ships with its story (every state, both themes, axe clean,
  keyboard play function for an interactive widget). Stories are the docs; the component's JSDoc and the story's
  `docs.description` feed them.
- **Motion** comes from the tokens (`--duration-*`, `--ease-*`), never a literal; Reduce Motion finishes every
  transition at once.

## Chat and the send queue

The chat's components and pure logic (`utils/chat/*`) are in the base. The send queue (outbox, optimistic send,
retry, `client_id`) is **not**: it stays in Bookretreats' store (trappist decision 14). When BetterReads' buddy
reads need a chat, one of three ways is chosen in that work, not here: copy the queue into the app; a
framework-free composable in the base (the transport is passed in, no Pinia, no Supabase); or a dedicated chat
layer on top of `@fabkho/ui`. Until then the base gets no queue.

**Added for group chats (additive, next minor):** `UiAvatarStack` (row with "+N", or a diagonal pair; one name for the
stack; the ring from `--avatar-stack-ring`; scoped slot `face`), `UiBubble` slot `face` (beside theirs on the last bubble
of a run), `actions` + `action` on `UiReactionBar` and `UiBubble` (the app's own entries, e.g. "Report"), `UiCheckList`
(filter, `min`/`max`, count line, `face` slot; an APG checkbox group) and the words `ui.text.chat.more` and `ui.text.checkList`.

## Developing it

- `pnpm install`
- `pnpm test`: Vitest in plain Node (the pure utils, the contract against a fixture).
- `pnpm storybook` (http://localhost:6006) and `pnpm build-storybook`: the docs site. `pnpm test:storybook`
  (and `:night`) renders every story in headless Chromium and runs axe (`pnpm exec playwright install chromium-headless-shell` once).
- Commits are conventional (`feat:`, `fix:`, `docs:` …); release-please opens the release pull request and tags
  `vX.Y.Z` when it is merged. While the version is `0.x`, a `feat` bumps the minor.
- Under plain Node: `import { voiceMime } from '@fabkho/ui/pure/voice'` (`app/utils/chat/*.js`, no Nuxt imports).
