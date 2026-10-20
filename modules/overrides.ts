import { fileURLToPath } from 'node:url'
import { defineNuxtModule, getLayerDirectories, useLogger } from 'nuxt/kit'
import { describeOverride, layerOverrides, sameFolder } from '../testing/overrides.mjs'

/**
 * Overrides are visible (README): Nuxt gives the app's own files priority over a layer's, so a forgotten copy of
 * a base component, composable or util would shadow the base unnoticed. In dev every one is logged once at start:
 * `[@fabkho/ui] UiCover is overridden by the app (app/components/ui/Cover.vue)`. The list an app's test allows is
 * `layerOverrides()` in testing/overrides.mjs, which this module runs too.
 *
 * A module of the layer's own `modules/` folder, which Nuxt registers for the apps that extend it. It is not in
 * `layerFiles` (the contract's and the app's dependency scans read the browser code): it runs in Node, at build.
 */
export default defineNuxtModule({
  meta: { name: '@fabkho/ui/overrides' },
  setup(_options, nuxt) {
    if (!nuxt.options.dev) return
    const layers = getLayerDirectories(nuxt)
    const here = fileURLToPath(new URL('../', import.meta.url))
    const own = layers.findIndex((layer) => sameFolder(layer.root, here))
    // The base is the project itself (Storybook, the base's own checkout), or the first layer: nothing is above it.
    if (own < 1) return
    const logger = useLogger('@fabkho/ui')
    for (const layer of layers.slice(0, own)) {
      const who = sameFolder(layer.root, nuxt.options.rootDir) ? 'the app' : `the layer ${layer.root}`
      for (const override of layerOverrides({ app: layer.app, layer: here })) {
        logger.info(describeOverride(override, who, nuxt.options.rootDir))
      }
    }
  },
})
