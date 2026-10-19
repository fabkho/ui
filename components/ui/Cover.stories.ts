import type { Meta, StoryObj } from '@storybook-vue/nuxt'
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
  args: {
    title: 'Dune',
    authors: ['Frank Herbert'],
    src: IMAGE,
    fallbacks: [],
    thumbhash: null,
    colors: COLORS,
    size: 'lg',
    glow: false,
    eager: true,
    priority: false,
    decorative: false,
    whole: false,
    kind: 'book',
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

export const Night: Story = { args: { glow: true, size: 'xl' }, globals: { theme: 'night' }, parameters: { layout: 'padded' } }
