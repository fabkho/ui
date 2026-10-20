import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import UiMediaViewer from './MediaViewer.vue'
import UiButton from './Button.vue'
import UiSheet from './Sheet.vue'

// The viewer covers the whole screen. Every story shows a button that opens it, and the stories are drawn in an
// iframe in the docs page (`inline: false`).
/** A landscape and a portrait placeholder, as inline SVG data URIs (no network). */
const svg = (width: number, height: number, from: string, to: string, text: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
      <circle cx="${width * 0.72}" cy="${height * 0.3}" r="${Math.min(width, height) * 0.12}" fill="#f1e3c8" opacity="0.85"/>
      <path d="M0 ${height} L${width * 0.35} ${height * 0.55} L${width * 0.6} ${height * 0.8} L${width * 0.8} ${height * 0.6} L${width} ${height * 0.85} V${height} Z" fill="#000" opacity="0.35"/>
      <text x="${width / 2}" y="${height * 0.2}" text-anchor="middle" font-family="sans-serif" font-size="${Math.min(width, height) / 12}" fill="#f1e3c8">${text}</text>
    </svg>`,
  )}`

const LANDSCAPE = svg(1200, 800, '#22303f', '#4a3220', 'Retreat terrace, 6 am')
const PORTRAIT = svg(800, 1200, '#3b2430', '#2c3a2e', 'Reading by the lake')

const meta = {
  title: 'Base/MediaViewer',
  component: UiMediaViewer,
  args: {
    open: false,
    url: LANDSCAPE,
    label: 'The retreat terrace at sunrise, with chairs and a pot of tea',
    dialogLabel: 'Photo viewer',
    closeLabel: 'Close photo',
    origin: null,
    testid: 'viewer',
  },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 560 } } },
  render: args => ({
    components: { UiMediaViewer, UiButton },
    setup: () => ({ args, open: ref(false) }),
    template: `
      <div class="flex min-h-[520px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">View photo</UiButton>
        <UiMediaViewer v-bind="args" :open="open" @close="open = false" />
      </div>`,
  }),
} satisfies Meta<typeof UiMediaViewer>
export default meta
type Story = StoryObj<typeof meta>

/** A landscape picture, as large as the screen allows in its own proportions. A tap on the picture or beside it, Escape or a swipe down closes it. */
export const Landscape: Story = {}

/** A portrait picture is fitted to the screen's height. */
export const Portrait: Story = { args: { url: PORTRAIT, label: 'A person reading on a jetty by the lake' } }

/**
 * `origin`: the round face (or rounded tile) the picture grows out of, and shrinks back into on close. Here
 * an avatar button opens it; with Reduce Motion on, or without an origin, it is a cross-fade instead.
 */
export const GrowsFromOrigin: Story = {
  render: args => ({
    components: { UiMediaViewer },
    setup: () => ({ args, open: ref(false), face: ref<HTMLElement | null>(null) }),
    template: `
      <div class="flex min-h-[520px] items-center justify-center bg-surface">
        <button
          ref="face"
          type="button"
          class="size-(--size-avatar-xl) overflow-hidden rounded-pill edge"
          aria-label="Open photo of Mara"
          @click="open = true"
        >
          <img :src="args.url" alt="" class="size-full object-cover" />
        </button>
        <UiMediaViewer v-bind="args" :origin="face" :open="open" @close="open = false" />
      </div>`,
  }),
}

/** Without a `url` there is nothing to show: the viewer stays closed, even with `open` set. */
export const WithoutUrl: Story = { args: { url: null } }

/**
 * The dialog pattern (APG): focus goes to the close button, Tab and Shift+Tab stay in the dialog, and when it
 * closes focus returns to the button that opened it.
 */
export const FocusTrap: Story = {
  play: async ({ canvasElement }) => {
    const opener = within(canvasElement).getByRole('button', { name: 'View photo' })
    await userEvent.click(opener)
    const dialog = await within(document.body).findByRole('dialog', { name: 'Photo viewer' })
    const closer = within(dialog).getByRole('button', { name: 'Close photo' })
    await waitFor(() => expect(closer).toHaveFocus())
    await userEvent.tab()
    await expect(closer).toHaveFocus()
    await userEvent.tab({ shift: true })
    await expect(closer).toHaveFocus()
    // Focus that lands behind the dialog is brought back.
    opener.focus()
    await expect(closer).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(opener).toHaveFocus(), { timeout: 3000 })
  },
}

/** The viewer opened from inside a sheet: Tab stays on the viewer's close button, not the sheet's controls, and Escape gives focus back to the one that opened it. */
export const TabStaysOverASheet: Story = {
  render: args => ({
    components: { UiMediaViewer, UiButton, UiSheet },
    setup: () => ({ args, sheet: ref(false), open: ref(false) }),
    template: `
      <div class="flex min-h-[520px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="sheet = true">Open sheet</UiButton>
        <UiSheet v-model:open="sheet" title="Retreat photos" testid="photosSheet">
          <UiButton tone="secondary" @click="open = true">View photo</UiButton>
        </UiSheet>
        <UiMediaViewer v-bind="args" :open="open" @close="open = false" />
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const sheet = await within(document.body).findByRole('dialog', { name: 'Retreat photos' })
    const opener = within(sheet).getByRole('button', { name: 'View photo' })
    await userEvent.click(opener)
    const dialog = await within(document.body).findByRole('dialog', { name: 'Photo viewer' })
    const closer = within(dialog).getByRole('button', { name: 'Close photo' })
    await waitFor(() => expect(closer).toHaveFocus())
    for (const shift of [false, true, false]) {
      await userEvent.tab({ shift })
      await expect(closer).toHaveFocus()
    }
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(opener).toHaveFocus(), { timeout: 3000 })
    await userEvent.keyboard('{Escape}')
  },
}

/** Starts open, for looking at the viewer at rest. */
export const Open: Story = {
  play: async () => {
    const dialog = await within(document.body).findByRole('dialog', { name: 'Photo viewer' })
    await waitFor(() => expect(dialog.getAnimations({ subtree: true })).toHaveLength(0))
  },
  render: args => ({
    components: { UiMediaViewer, UiButton },
    setup: () => ({ args, open: ref(true) }),
    template: `
      <div class="flex min-h-[520px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">View photo</UiButton>
        <UiMediaViewer v-bind="args" :open="open" @close="open = false" />
      </div>`,
  }),
}

/** The dark theme, open, with the portrait picture. */
export const Night: Story = {
  args: { url: PORTRAIT, label: 'A person reading on a jetty by the lake' },
  globals: { theme: 'night' },
  play: Open.play,
  render: Open.render,
}
