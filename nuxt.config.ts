// The shared UI layer (README.md): Libellus' design system as a Nuxt layer, in the shape Nuxt documents
// (https://nuxt.com/docs/4.x/guide/going-further/layers): the source is `app/`, which Nuxt scans by itself.
// Its components register as `Ui*` (app/components/ui/Button.vue → UiButton), its composables and utils are
// auto-imported, `app/app.config.ts` carries the few words it says itself, `app/router.options.ts` the system
// Back that closes the top sheet, and `modules/overrides.ts` logs what an app replaces of the base. The layer's
// name (`$meta`) makes `#layers/ui` the way to reach its files from an app or a test
// (`import type { IconName } from '#layers/ui/app/components/ui/Icon.vue'`); it follows `UI_LAYER`, as the layer does.
export default defineNuxtConfig({
  $meta: { name: 'ui' },
})
