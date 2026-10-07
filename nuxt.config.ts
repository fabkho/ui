import { fileURLToPath } from 'node:url'

// The shared UI layer (README.md): Libellus' design system as a Nuxt layer.
// Nuxt picks it up from `~~/layers/ui` by itself; its components register as
// `Ui*` (components/ui/Button.vue → UiButton), its composables and utils are
// auto-imported, and app.config.ts carries the few words it says itself.
// `#ui` reaches its files from the app (`import type { IconName } from '#ui/components/ui/Icon.vue'`).
export default defineNuxtConfig({
  $meta: { name: 'ui' },
  alias: { '#ui': fileURLToPath(new URL('./', import.meta.url)) },
})
