import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect } from 'storybook/test'
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

/** `grain="image"` (the default): the grain is a background image, a data URI tile. */
export const GrainImage: Story = {
  args: { grain: 'image' },
  play: async ({ canvasElement }) => {
    const grain = canvasElement.querySelector<HTMLElement>('.grain')!
    await expect(grain.tagName).toBe('SPAN')
    await expect(getComputedStyle(grain).backgroundImage).toContain('data:image/svg+xml')
    await expect(canvasElement.querySelector('svg')).toBeNull()
  },
}

/**
 * `grain="inline"`: the grain is an inline SVG, not a background image. Chrome reports a background image as a Largest
 * Contentful Paint candidate, and the 160 px tile was a page's; an inline SVG is none. The same filter: the same grain
 * in Chromium, and in WebKit at 1×; WebKit at 2× and 3× draws it at the device's resolution (a crisper grain).
 * Each instance has its own filter ids, so two cards never share one.
 */
export const GrainInline: Story = {
  args: { grain: 'inline' },
  render: args => ({
    components: { UiAmbient },
    setup: () => ({ args }),
    template: `
      <div class="grid max-w-xl gap-md">
        <div class="relative h-40 overflow-hidden rounded-lg bg-surface-raised"><UiAmbient v-bind="args" /></div>
        <div class="relative h-40 overflow-hidden rounded-lg bg-surface-raised"><UiAmbient v-bind="args" shape="page" /></div>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const grains = [...canvasElement.querySelectorAll<SVGElement>('svg.grain')]
    await expect(grains).toHaveLength(2)
    for (const grain of grains) await expect(getComputedStyle(grain).backgroundImage).toBe('none')
    const ids = [...canvasElement.querySelectorAll('filter, pattern')].map(element => element.id)
    await expect(new Set(ids).size).toBe(4)
  },
}

export const Night: Story = { args: { strength: null }, globals: { theme: 'night' } }
