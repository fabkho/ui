import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiAmbient from './Ambient.vue'

const COLORS = { dominant: '#c2410c', secondary: '#1d4e89' }

// The theme's own glow is off on paper (`--opacity-glow: 0`) and full in the dark, so the stories
// set `strength` where the light itself is the point.
const meta = {
  title: 'Base/Ambient',
  component: UiAmbient,
  parameters: { layout: 'padded' },
  args: { colors: COLORS, cloth: null, shape: 'card', pool: null, strength: '1' },
  render: args => ({
    components: { UiAmbient },
    setup: () => ({ args }),
    template: `
      <div class="relative h-64 w-full max-w-xl overflow-hidden rounded-lg bg-surface-raised p-lg">
        <UiAmbient v-bind="args" />
        <p class="relative text-ink text-subhead">Dune, by Frank Herbert</p>
        <p class="relative text-ink-muted text-caption">The light is thrown by the cover's own colours.</p>
      </div>`,
  }),
} satisfies Meta<typeof UiAmbient>
export default meta
type Story = StoryObj<typeof meta>

/** Light from the cover's two precomputed colours, lighting a card. */
export const Card: Story = {}

/** `shape="page"`: a tall pool at the top of a page header. */
export const Page: Story = {
  args: { shape: 'page' },
  render: args => ({
    components: { UiAmbient },
    setup: () => ({ args }),
    template: `
      <div class="relative h-96 w-full max-w-xl overflow-hidden bg-surface p-lg">
        <UiAmbient v-bind="args" />
        <p class="relative text-ink text-heading">Page header</p>
      </div>`,
  }),
}

/** No colours known yet: a warm neutral lights the room. */
export const NoColors: Story = { args: { colors: null } }

/** A Placeholder cover has no colours worth using: the cloth's colour, as CSS, lights it. */
export const Cloth: Story = { args: { colors: null, cloth: '#3b2430' } }

/** `pool`: two colours the app names, replacing the cover's. */
export const Pool: Story = { args: { pool: { a: '#e3b878', b: '#b8782a' } } }

/** `strength` replaces the theme's opacity: here a half-strength glow. */
export const Strength: Story = { args: { strength: '0.5' } }

/** The theme's own `--opacity-glow`: nothing on paper, full strength in the dark. */
export const ThemeDefault: Story = { args: { strength: null } }

export const Night: Story = { args: { strength: null }, globals: { theme: 'night' } }
