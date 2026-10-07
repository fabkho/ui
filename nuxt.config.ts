import { fileURLToPath } from 'node:url'

// The shared UI layer (README.md): Libellus' design system as a Nuxt layer.
// Nuxt picks it up from `~~/layers/ui` by itself; its components register as
// `Ui*` (components/ui/Button.vue → UiButton), its composables and utils are
// auto-imported, and app.config.ts carries the few words it says itself.
// `#ui` reaches its files from the app (`import type { IconName } from '#ui/components/ui/Icon.vue'`).
//
// The router options (`router.options.ts`, the system Back closing the top sheet)
// are not found by themselves: Nuxt looks for `<layer>/app/router.options.ts`, and
// this layer has no `app/` folder (its root is its source directory). The hook adds
// the file right behind Nuxt's own, so the app's options still come after it.
export default defineNuxtConfig({
  $meta: { name: 'ui' },
  alias: { '#ui': fileURLToPath(new URL('./', import.meta.url)) },
  hooks: {
    'pages:routerOptions'(context) {
      context.files.splice(1, 0, { path: fileURLToPath(new URL('./router.options.ts', import.meta.url)) })
    },
  },
})
