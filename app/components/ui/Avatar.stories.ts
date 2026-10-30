import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import { expect, waitFor, within } from 'storybook/test'
import { largeText, fitsTheScreen } from '../../../.storybook/large-text'
import UiAvatar from './Avatar.vue'

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/** A small inline photo, standing in for a member's picture (no network). */
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#8a6a4a"/><circle cx="64" cy="50" r="22" fill="#e9d2b4"/><path d="M20 128c0-30 20-48 44-48s44 18 44 48z" fill="#e9d2b4"/></svg>',
)}`

const meta = {
  title: 'Base/Avatar',
  component: UiAvatar,
  args: { initials: 'FK', photo: null, fallback: null, size: 'sm', solid: false, lazy: false },
  argTypes: { size: { control: 'inline-radio', options: SIZES } },
  parameters: {
    docs: {
      description: {
        component: 'A member\'s circle: initials in mono, or her photo drawn over them inside a hairline ring.',
      },
    },
  },
} satisfies Meta<typeof UiAvatar>
export default meta
type Story = StoryObj<typeof meta>

/** Initials in mono inside a hairline ring. Drawing only: the button around it carries the label. */
export const Initials: Story = {}

/** `label`: an avatar that stands for someone says who: an image (`role="img"`) with that name. */
export const Named: Story = {
  args: { label: 'Mara Keller', initials: 'MK' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: 'Mara Keller' })).toBeVisible()
  },
}

/** `decorative`: the name is right beside it, so it is hidden from assistive tech even with a `label`. Without a `label` it always is. */
export const Decorative: Story = {
  args: { label: 'Mara Keller', decorative: true, initials: 'MK' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('img')).toBeNull()
    await expect(canvasElement.querySelector('[aria-hidden="true"]')).not.toBeNull()
  },
}

/** A photo the avatar mounts with draws at once: no fade, and the initials are invisible under it, so an undecoded image never shows them. */
export const Photo: Story = {
  args: { photo: PHOTO, size: 'lg' },
  play: async ({ canvasElement }) => {
    const img = canvasElement.querySelector('[data-avatar-photo]')!
    await expect(img.classList.contains('opacity-0')).toBe(false)
    await expect(img.className).not.toContain('transition-opacity')
    await expect(canvasElement.querySelector('[data-avatar-initials]')!.classList.contains('invisible')).toBe(true)
  },
}

/** A photo that arrives while the avatar is on screen fades in over the visible initials once decoded. */
export const PhotoArrives: Story = {
  args: { initials: 'FK', size: 'lg' },
  render: args => ({
    components: { UiAvatar },
    setup: () => ({ args, PHOTO, photo: ref<string | null>(null) }),
    template: `
      <div class="flex items-center gap-md">
        <UiAvatar v-bind="args" :photo="photo" />
        <button type="button" data-arrive @click="photo = PHOTO">Arrive</button>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const initials = canvasElement.querySelector('[data-avatar-initials]')!
    await expect(initials.classList.contains('invisible')).toBe(false)
    canvasElement.querySelector<HTMLButtonElement>('[data-arrive]')!.click()
    await waitFor(() => expect(canvasElement.querySelector('[data-avatar-photo]')).not.toBeNull())
    await expect(canvasElement.querySelector('[data-avatar-photo]')!.className).toContain('transition-opacity')
    await expect(initials.classList.contains('invisible')).toBe(false)
  },
}

/** `photo` fails to load: `fallback` is drawn instead (and the `fallback` event fires). */
export const FallbackPhoto: Story = { args: { photo: 'data:image/png;base64,broken', fallback: PHOTO, size: 'lg' } }

/** Both fail (a 404): the photo is dropped and the initials stay. */
export const BothFail: Story = { args: { photo: 'data:image/png;base64,broken', fallback: 'data:image/png;base64,alsobroken', size: 'lg' } }

/** `lazy`: the photo loads lazily, for third-party photos in lists. */
export const Lazy: Story = { args: { photo: PHOTO, lazy: true } }

/** `solid`: the quiet fill laid on the room colour, so the circle is opaque where it overlaps something. */
export const Solid: Story = {
  render: () => ({
    components: { UiAvatar },
    template: `
      <div class="flex items-center">
        <UiAvatar initials="AB" size="md" solid />
        <UiAvatar initials="CD" size="md" solid class="-ml-sm" />
        <UiAvatar initials="EF" size="md" solid class="-ml-sm" />
      </div>`,
  }),
}

/** Every size, with initials and with a photo. */
export const AllSizes: Story = {
  render: () => ({
    components: { UiAvatar },
    setup: () => ({ SIZES, PHOTO }),
    template: `
      <div class="flex flex-col gap-md">
        <div class="flex items-center gap-md"><UiAvatar v-for="size in SIZES" :key="size" initials="FK" :size="size" /></div>
        <div class="flex items-center gap-md"><UiAvatar v-for="size in SIZES" :key="size" initials="FK" :photo="PHOTO" :size="size" /></div>
      </div>`,
  }),
}

export const Night: Story = {
  globals: { theme: 'night' },
  render: AllSizes.render,
}

/** Initials that have to fit: the circle holds them as a cap of its own size, however large the text is. */
const initialsFit = (canvasElement: HTMLElement) => {
  const circles = [...canvasElement.querySelectorAll<HTMLElement>('.avatar')]
  expect(circles.length).toBeGreaterThan(0)
  for (const circle of circles) {
    const range = document.createRange()
    range.selectNodeContents(circle.firstChild as Node)
    const text = range.getBoundingClientRect()
    const box = circle.getBoundingClientRect()
    expect(text.width, 'initials within the circle').toBeLessThanOrEqual(box.width)
    expect(text.height, 'initials within the circle').toBeLessThanOrEqual(box.height)
  }
}

/** Large text (200 %): the circles keep their size and the initials are capped to what they hold. */
export const LargeText: Story = {
  decorators: [largeText],
  render: AllSizes.render,
  play: async ({ canvasElement }) => {
    initialsFit(canvasElement)
    await expect(fitsTheScreen()).toBe(true)
  },
}

export const LargeTextNight: Story = { ...LargeText, globals: { theme: 'night' } }
