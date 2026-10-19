import type { StorybookConfig } from '@storybook-vue/nuxt'
import tailwindcss from '@tailwindcss/vite'

// Storybook runs on the layer itself: the repo root is the Nuxt project, so the stories see the
// layer's auto-imports, its app.config.ts (`ui.text`), the `#ui` alias and its components, with
// nothing mocked. Tailwind v4 is the one thing a layer does not bring (the apps do), so it is added here.
const config: StorybookConfig = {
  framework: '@storybook-vue/nuxt',
  stories: ['../components/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  core: { disableTelemetry: true },
  async viteFinal(config) {
    config.plugins = [...(config.plugins ?? []), tailwindcss()]
    return config
  },
}

export default config
