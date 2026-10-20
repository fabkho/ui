import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { reactive } from 'vue'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import UiCover from './Cover.vue'

const SIZES = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl'] as const

/** A small inline SVG, shaped like a printed cover (2:3) or any other ratio (no network). */
function svg(width: number, height: number, background: string, ink: string, text: string): string {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${background}"/><circle cx="${width / 2}" cy="${height * 0.4}" r="${width * 0.22}" fill="${ink}"/><text x="${width / 2}" y="${height * 0.85}" font-family="Georgia, serif" font-size="${width * 0.1}" fill="${ink}" text-anchor="middle">${text}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(markup)}`
}

const IMAGE = svg(200, 300, '#c2410c', '#fde7c8', 'DUNE')
const WIDE_IMAGE = svg(300, 200, '#1d4e89', '#d6e6f7', 'LANDSCAPE')
const COLORS = { dominant: '#c2410c', secondary: '#fde7c8' }

const meta = {
  title: 'Base/Cover',
  component: UiCover,
  parameters: { docs: { description: { component: 'The cover of a book in its 2:3 shape at one of the token widths, with a cloth Placeholder when there is no image.' } } },
  args: {
    title: 'Dune',
    authors: ['Frank Herbert'],
    src: IMAGE,
    fallbacks: [],
    srcset: null,
    sizes: undefined,
    thumbhash: null,
    colors: COLORS,
    size: 'lg',
    glow: false,
    eager: true,
    priority: false,
    decorative: false,
    whole: false,
    kind: 'book',
    tilt: false,
  },
  argTypes: { size: { control: 'inline-radio', options: SIZES }, kind: { control: 'inline-radio', options: ['book', 'screen'] } },
} satisfies Meta<typeof UiCover>
export default meta
type Story = StoryObj<typeof meta>

/** An image in the book's 2:3 shape, with a printed-book finish: a faint spine crease and a hairline edge. */
export const Image: Story = {}

/** No image: the Placeholder cover, cloth-bound, with title and author set in type and a thin inset rule. */
export const Placeholder: Story = { args: { src: null, colors: null } }

/** A long title steps down in size and ends in an ellipsis; the author wraps to two lines at most. */
export const LongTitle: Story = {
  args: {
    src: null,
    colors: null,
    size: 'xl',
    title: 'The Unbearable Lightness of Being: A Novel in Seven Parts, Revised and Expanded',
    authors: ['Milan Kundera', 'Michael Henry Heim', 'Linda Asher'],
  },
}

/** A medium-length title is set a notch smaller. Many authors are cut to "u. a." / "et al." (`ui.text.etAl`). */
export const ManyAuthors: Story = {
  args: { src: null, colors: null, size: 'xl', title: 'Gödel, Escher, Bach: An Eternal Golden Braid', authors: ['Douglas Hofstadter', 'Daniel Dennett', 'Roger Penrose'] },
}

/** Under `md` there is no type at all: cloth, rule and mark carry it, and the title stays the accessible name. */
export const SmallPlaceholder: Story = {
  args: { src: null, colors: null, size: 'sm' },
}

/** `glow`: the lamp light behind the cover, a blurred copy of the image (visible in the dark theme). */
export const Glow: Story = { args: { glow: true, size: 'xl' }, parameters: { layout: 'padded' } }

/** `thumbhash`: a stored hash (here none) sits under the image while it loads; `colors.dominant` is the next fallback. */
export const Loading: Story = {
  args: { src: 'data:image/png;base64,', colors: COLORS, fallbacks: [] },
}

/** `fallbacks` are tried in turn when `src` fails, before the Placeholder. */
export const Fallbacks: Story = {
  args: { src: 'data:image/png;base64,broken', fallbacks: [IMAGE] },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getByRole('img', { name: 'Dune' })).toHaveAttribute('src', IMAGE))
  },
}

const BROKEN = 'data:image/png;base64,broken'
/** A source's blank stand-in (OpenLibrary's 1 × 1 GIF): it loads, but it is no cover. */
const BLANK = svg(1, 1, '#ffffff', '#ffffff', '')

/** A chain: the first fails, the second is a blank stand-in, the third is the cover. Each is tried in turn. */
export const FallbackChain: Story = {
  args: { src: BROKEN, fallbacks: [BLANK, IMAGE] },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getByRole('img', { name: 'Dune' })).toHaveAttribute('src', IMAGE))
  },
}

/** Every image of the chain failed (or was blank): the Placeholder, still named by the title. */
export const AllFailed: Story = {
  args: { src: BROKEN, fallbacks: [BLANK] },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('img')).toBeNull())
    await expect(within(canvasElement).getByRole('img', { name: 'Dune' })).toHaveClass('cloth')
  },
}

const FRAME = (box: string) => svg(Number(box.split('x')[0]), Number(box.split('x')[1]), '#c2410c', '#fde7c8', box)
const NARROW = FRAME('120x180')
const MEDIUM = FRAME('240x360')
const WIDE = FRAME('600x900')

/**
 * `srcset` and `sizes`: the sizes `src` is offered at and the width the cover renders at, so the browser takes the
 * narrowest one that is sharp (a 140 px cover on a 1× screen gets 240 w here, not 600 w). The halo and the backing
 * ask for the same set, so all three are one download. A source that cannot render sizes (Open Library) sets neither.
 */
export const Srcset: Story = {
  args: { src: NARROW, srcset: `${NARROW} 120w, ${MEDIUM} 240w, ${WIDE} 600w`, sizes: '140px', size: 'xl', glow: true },
  play: async ({ canvasElement }) => {
    const image = within(canvasElement).getByRole('img', { name: 'Dune' }) as HTMLImageElement
    await expect(image).toHaveAttribute('sizes', '140px')
    await waitFor(() => expect(image.currentSrc).not.toBe(''))
    await expect(image.getAttribute('srcset')).toContain('600w')
    await expect(canvasElement.querySelector('.halo')).toHaveAttribute('srcset', image.getAttribute('srcset')!)
  },
}

/** The srcset is for `src` only: once `src` fails the cover falls back to a plain image of the chain. */
export const SrcsetThenFallback: Story = {
  args: { src: BROKEN, srcset: `${BROKEN} 120w, ${BROKEN} 600w`, sizes: '140px', fallbacks: [IMAGE], size: 'xl' },
  play: async ({ canvasElement }) => {
    const image = () => within(canvasElement).getByRole('img', { name: 'Dune' })
    await waitFor(() => expect(image()).toHaveAttribute('src', IMAGE))
    await expect(image()).not.toHaveAttribute('srcset')
    await expect(image()).not.toHaveAttribute('sizes')
  },
}

/**
 * `ui.cover.sources` (app config): an app that has one rule for all its covers says it once, instead of at every call
 * site. The cover below is given only `src` and `size`; the app's rule offers the fallbacks and the srcset. A prop wins.
 */
export const AppSources: Story = {
  args: { src: BROKEN, size: 'xl' },
  render: args => ({
    components: { UiCover },
    setup: () => {
      updateAppConfig({
        ui: {
          cover: {
            sources: (src: string) => (src === BROKEN ? { fallbacks: [NARROW], srcset: null } : { fallbacks: [], srcset: null }),
            artworkOf: (url: string) => url,
          },
        },
      })
      // The layer's own default is empty: the next story starts without the app's rule.
      onBeforeUnmount(() => {
        const config = useAppConfig().ui.cover as Record<string, unknown>
        for (const key of Object.keys(config)) delete config[key]
      })
      return { args }
    },
    template: `<UiCover v-bind="args" />`,
  }),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(within(canvasElement).getByRole('img', { name: 'Dune' })).toHaveAttribute('src', NARROW))
  },
}

/**
 * `identity` and `artworkOf`: a cover shows its subject's cover and follows it. The artwork's size lives in the URL's
 * fragment here: another size of the artwork in view takes over once it has loaded (the image never goes blank in
 * between); another artwork, or another `identity` at the same artwork (a new edition), starts the cover afresh.
 */
export const Identity: Story = {
  render: args => ({
    components: { UiCover },
    setup: () => {
      const state = reactive({ src: `${IMAGE}#small`, identity: 'edition-1' })
      const other = svg(200, 300, '#1d4e89', '#d6e6f7', 'OTHER')
      return {
        args,
        state,
        artworkOf: (url: string) => url.split('#')[0]!,
        sizeUp: () => (state.src = `${IMAGE}#large`),
        newEdition: () => (state.identity = 'edition-2'),
        otherArtwork: () => (state.src = other),
      }
    },
    template: `
      <div class="flex flex-col items-start gap-md">
        <UiCover v-bind="args" :src="state.src" :identity="state.identity" :artwork-of="artworkOf" />
        <div class="flex gap-sm text-caption text-ink">
          <button type="button" class="min-h-11 rounded-md border border-line px-md" @click="sizeUp">Another size</button>
          <button type="button" class="min-h-11 rounded-md border border-line px-md" @click="newEdition">New edition</button>
          <button type="button" class="min-h-11 rounded-md border border-line px-md" @click="otherArtwork">Another artwork</button>
        </div>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const sheet = () => canvasElement.querySelector<HTMLElement>('[data-cover]')!
    const image = () => canvas.getByRole('img', { name: 'Dune' })
    await waitFor(() => expect(image()).toHaveClass('opacity-100'))
    // Another size of the artwork in view: the image stays in view while it swaps.
    await userEvent.click(canvas.getByRole('button', { name: 'Another size' }))
    await expect(image()).toHaveClass('opacity-100')
    await waitFor(() => expect(image()).toHaveAttribute('src', `${IMAGE}#large`))
    // Another artwork replaces it once it has loaded.
    await userEvent.click(canvas.getByRole('button', { name: 'Another artwork' }))
    await waitFor(() => expect(image().getAttribute('src')).not.toContain('#'))
    await waitFor(() => expect(image()).toHaveClass('opacity-100'))
    await expect(sheet()).toBeTruthy()
  },
}

/** `whole`: an image clearly off 2:3 is fitted into the slot on a blurred copy of itself, so nothing is cut off. */
export const Whole: Story = { args: { src: WIDE_IMAGE, whole: true, size: 'xl' } }

/** Without `whole` the same image is cropped to fill the slot. */
export const WideCropped: Story = { args: { src: WIDE_IMAGE, whole: false, size: 'xl' } }

/** `kind="screen"`: a poster has no spine crease. */
export const Screen: Story = { args: { kind: 'screen', title: 'Dune: Part Two', authors: [] } }

/** `decorative`: the title is written beside the cover, so the cover adds nothing for assistive tech. */
export const Decorative: Story = {
  render: args => ({
    components: { UiCover },
    setup: () => ({ args }),
    template: `
      <a href="#book" class="flex items-center gap-md text-ink">
        <UiCover v-bind="args" decorative size="md" />
        <span class="text-subhead">Dune</span>
      </a>`,
  }),
}

/** Every size, with an image and as Placeholder. */
export const AllSizes: Story = {
  parameters: { layout: 'padded' },
  render: args => ({
    components: { UiCover },
    setup: () => ({ args, SIZES }),
    template: `
      <div class="flex flex-col gap-lg">
        <div class="flex flex-wrap items-end gap-md"><UiCover v-for="size in SIZES" :key="size" v-bind="args" :size="size" /></div>
        <div class="flex flex-wrap items-end gap-md"><UiCover v-for="size in SIZES" :key="size" v-bind="args" :src="null" :colors="null" :size="size" /></div>
      </div>`,
  }),
}

/** The sheet inside a cover: what leans. */
const sheetOf = (canvasElement: HTMLElement) => canvasElement.querySelector<HTMLElement>('[data-cover]')!

/**
 * `tilt` (the Book page's hero): the sheet leans towards the finger, up to eight degrees at the edge, and comes back flat
 * when it lets go. Off with Reduce Motion and while anything moves; off by default.
 */
export const Tilt: Story = {
  args: { tilt: true, size: 'xl', glow: true },
  play: async ({ canvasElement }) => {
    const sheet = sheetOf(canvasElement)
    const root = sheet.parentElement!
    const box = root.getBoundingClientRect()
    const flat = 'perspective(700px) rotateX(0.000deg) rotateY(0.000deg)'
    // A finger on the cover's top right corner: the top and right edges come near.
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: box.right, clientY: box.top }))
    await waitFor(() => expect(sheet.style.transform).toMatch(/rotateX\(-[1-9]/))
    await expect(sheet.style.willChange).toBe('transform')
    root.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: box.right, clientY: box.top }))
    // Let go: the inline lean is gone at once and a Web Animation brings the sheet back to flat.
    await expect(sheet.style.transform).not.toBe(flat)
    await waitFor(() => expect(sheet.style.willChange).toBe(''))
    await expect(within(canvasElement).getByRole('img', { name: 'Dune' })).toHaveAttribute('draggable', 'false')
  },
}

/** Without `tilt`, a press does nothing to the cover. */
export const NoTiltByDefault: Story = {
  args: { size: 'xl' },
  play: async ({ canvasElement }) => {
    const sheet = sheetOf(canvasElement)
    const root = sheet.parentElement!
    const box = root.getBoundingClientRect()
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8, pointerType: 'touch', clientX: box.right, clientY: box.top }))
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    await expect(sheet.style.transform).toBe('')
    await expect(root).not.toHaveClass('tilt')
  },
}

export const Night: Story = { args: { glow: true, size: 'xl' }, globals: { theme: 'night' }, parameters: { layout: 'padded' } }
