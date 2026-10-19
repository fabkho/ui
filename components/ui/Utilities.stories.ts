import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, within } from 'storybook/test'
import UiIcon from './Icon.vue'

/** The stylesheet's utilities (`assets/css/ui.css`) that need to be seen at work: glass, the veil, and the three small-target helpers. */
const meta = {
  title: 'Base/CSS utilities',
  parameters: { layout: 'padded' },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

/** A busy picture for the glass to sit on. */
const BEHIND = 'background-image: repeating-linear-gradient(45deg, var(--color-accent) 0 12px, var(--color-cloth2) 12px 24px, var(--color-cloth4) 24px 36px)'

/**
 * `glass` reads two optional variables, the app's Glass setting: `--glass-solid` takes the tint towards the room's sheet
 * colour (0 % is the design, 100 % is solid) and `--glass-scale` scales the blur radius (1 is the design). An app that sets
 * neither (the first panel) looks as it always did; the second is a medium setting, the third is Glass off.
 */
export const Glass: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-md" :style="'${BEHIND}'">
        <div v-for="panel in [
          { name: 'No setting (the design)', style: '' },
          { name: 'Medium: --glass-solid 55%, --glass-scale 0.5', style: '--glass-solid: 55%; --glass-scale: 0.5' },
          { name: 'Off: --glass-solid 100%', style: '--glass-solid: 100%; backdrop-filter: none; -webkit-backdrop-filter: none' },
        ]" :key="panel.name" class="glass rounded-lg p-md text-subhead text-ink" :style="panel.style">{{ panel.name }}</div>
      </div>`,
  }),
}

export const GlassNight: Story = { ...Glass, globals: { theme: 'night' } }

/** `veil-tint` is the veil behind the search palette: the theme's `veil`, solid in the room's colour as far as `--veil-solid` takes it. */
export const VeilTint: Story = {
  render: () => ({
    template: `
      <div class="flex gap-md">
        <div v-for="solid in ['0%', '45%', '100%']" :key="solid" class="relative flex-1 overflow-hidden rounded-lg" :style="'${BEHIND}'">
          <div class="veil-tint p-md text-subhead text-ink" :style="'--veil-solid: ' + solid">--veil-solid {{ solid }}</div>
        </div>
      </div>`,
  }),
}

/**
 * `icon-action`: an icon button at a row's right edge, drawn 24 px (WCAG 2.5.8) with a 44 px touch box around it. A pair
 * sets `--hit-up` and `--hit-down` on each, so their boxes split at the midpoint instead of overlapping.
 */
export const IconAction: Story = {
  render: () => ({
    components: { UiIcon },
    template: `
      <div class="flex w-(--size-menu) items-center justify-between rounded-md bg-fill px-md py-ms">
        <span class="text-subhead text-ink">A friend's review</span>
        <span class="flex flex-col gap-xs">
          <button type="button" class="icon-action text-ink-muted" style="--hit-up: 10px; --hit-down: 6px" aria-label="Want to read"><UiIcon name="bookmarkPlus" :size="20" /></button>
          <button type="button" class="icon-action text-ink-muted" style="--hit-up: 6px; --hit-down: 10px" aria-label="Like"><UiIcon name="heart" :size="20" /></button>
        </span>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const [want] = within(canvasElement).getAllByRole('button')
    const icon = want!.getBoundingClientRect()
    await expect(icon.width).toBeGreaterThanOrEqual(24)
    await expect(icon.height).toBeGreaterThanOrEqual(24)
    // The touch box is the ::after: at least `--size-touch` wide.
    await expect(parseFloat(getComputedStyle(want!, '::after').width)).toBeGreaterThanOrEqual(44)
  },
}

/** `stretched`: the row's button holds its words and its `::after` covers the row, so the whole row taps, and what else it has sits above it. */
export const Stretched: Story = {
  render: () => ({
    setup: () => ({ onOpen: fn() }),
    template: `
      <div class="relative flex w-(--size-menu) items-center gap-md rounded-md bg-fill px-md py-ms">
        <span class="relative z-1 flex size-(--size-button-sm) items-center justify-center rounded-pill bg-fill-strong text-caption">AL</span>
        <button type="button" class="stretched text-left text-subhead text-ink" @click="onOpen">Ada read 3 books this week</button>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button')
    await userEvent.tab()
    await expect(button).toHaveFocus()
    // The tap box is the whole row.
    const row = button.parentElement!.getBoundingClientRect()
    const box = getComputedStyle(button, '::after')
    await expect(box.position).toBe('absolute')
    await expect(parseFloat(box.width)).toBeCloseTo(row.width, 0)
  },
}

/** `tap-text`: a control drawn as small text that never makes its row taller; its 44 px touch box is invisible. */
export const TapText: Story = {
  render: () => ({
    components: { UiIcon },
    template: `
      <div class="flex w-(--size-menu) items-center justify-between rounded-md bg-fill px-md py-xs">
        <span class="text-subhead text-ink">Ada</span>
        <button type="button" class="tap-text text-ink-muted"><UiIcon name="heart" :size="14" />12</button>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button')
    await expect(parseFloat(getComputedStyle(button, '::after').height)).toBeGreaterThanOrEqual(44)
    await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(24)
  },
}

export const Night: Story = { ...TapText, globals: { theme: 'night' } }
