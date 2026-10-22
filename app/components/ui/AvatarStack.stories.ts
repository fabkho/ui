import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, within } from 'storybook/test'
import UiAvatarStack from './AvatarStack.vue'
import UiAvatar from './Avatar.vue'
import { PEOPLE } from '../../../.storybook/chat-fixtures'

const FACES = PEOPLE.map(({ initials, label, photo }) => ({ initials, label, photo }))

const meta = {
  title: 'Base/AvatarStack',
  component: UiAvatarStack,
  args: { faces: FACES.slice(0, 3), max: 4, size: 'sm', layout: 'row', label: 'Ida, Berit and Clara' },
  argTypes: { size: { control: 'inline-radio', options: ['xs', 'sm', 'md'] }, layout: { control: 'inline-radio', options: ['row', 'pair'] } },
  parameters: {
    docs: {
      description: {
        component:
          'Faces that overlap, as a group shows who is in it: a row with a "+N" circle past `max`, or a diagonal pair (a group chat\'s mark). One accessible name for the whole stack; the app can draw its own avatar in the scoped slot `face`. The ring takes `--avatar-stack-ring`.',
      },
    },
  },
} satisfies Meta<typeof UiAvatarStack>
export default meta
type Story = StoryObj<typeof meta>

/** A row of overlapping faces, one image for assistive tech. */
export const Row: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // One name for the stack, not one per face.
    await expect(canvas.getAllByRole('img')).toHaveLength(1)
    await expect(canvas.getByRole('img', { name: 'Ida, Berit and Clara' })).toBeVisible()
  },
}

/** More than `max`: the rest is a "+N" circle. */
export const Overflow: Story = {
  args: { faces: FACES, max: 3, label: 'Five readers' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('+2')).toBeVisible()
  },
}

/** Without a `label` the name is made of the faces' labels and `ui.text.chat.more`. */
export const NamedByFaces: Story = {
  args: { faces: FACES, max: 2, label: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: 'Ida Berg, Berit Holm and 3 more' })).toBeVisible()
  },
}

/** One face. */
export const Single: Story = { args: { faces: FACES.slice(1, 2), label: 'Berit' } }

/** The group chat's mark: two faces on the diagonal. */
export const Pair: Story = { args: { layout: 'pair', faces: FACES.slice(0, 2), label: 'Ida and Berit' } }

/** `size`: xs 30, sm 32, md 40, row and pair. */
export const Sizes: Story = {
  render: (args) => ({
    components: { UiAvatarStack },
    setup: () => ({ args }),
    template: `<div class="flex flex-col gap-md">
      <div v-for="size in ['xs', 'sm', 'md']" :key="size" class="flex items-center gap-lg">
        <UiAvatarStack v-bind="args" :size="size" :label="'Row ' + size" />
        <UiAvatarStack v-bind="args" :size="size" layout="pair" :label="'Pair ' + size" />
      </div>
    </div>`,
  }),
}

/** `--avatar-stack-ring`: the ring takes the colour of what the stack lies on, so the overlap reads as an edge. */
export const RingOnTint: Story = {
  args: { faces: FACES, max: 4, label: 'Five readers' },
  decorators: [() => ({ template: '<div class="rounded-md bg-accent-soft p-lg" style="--avatar-stack-ring: var(--color-accent-soft)"><story /></div>' })],
}

/** The scoped slot `face`: an app draws its own avatar (here a `UiAvatar` with a different size). It stays decoration inside the one image. */
export const CustomFace: Story = {
  render: (args) => ({
    components: { UiAvatarStack, UiAvatar },
    setup: () => ({ args }),
    template: `<UiAvatarStack v-bind="args">
      <template #face="{ face, index }">
        <UiAvatar :initials="face.initials" size="md" solid decorative :data-index="index" />
      </template>
    </UiAvatarStack>`,
  }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('img')).toHaveLength(1)
  },
}

export const German: Story = { args: { faces: FACES, max: 2, label: undefined }, globals: { locale: 'de' } }
export const Night: Story = { args: { faces: FACES, max: 3, label: 'Five readers' }, globals: { theme: 'night' } }
export const NightPair: Story = { args: { layout: 'pair', faces: FACES.slice(0, 2), label: 'Ida and Berit' }, globals: { theme: 'night' } }
