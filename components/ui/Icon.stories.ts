import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiIcon, { type IconName } from './Icon.vue'

/** Every `IconName`, in the order of the union in Icon.vue. */
const NAMES: IconName[] = [
  'home', 'library', 'search', 'back', 'plus', 'minus', 'more', 'close', 'check', 'grip', 'chevron', 'down', 'calendar', 'lock',
  'mail', 'repeat', 'slash', 'stack', 'globe', 'pencil', 'flag', 'arrow', 'sun', 'moon', 'signOut', 'trash', 'offline', 'sync',
  'import', 'camera', 'torch', 'ebook', 'read', 'contents', 'translate', 'define', 'copy', 'leading0', 'leading1', 'leading2',
  'leading3', 'margins0', 'margins1', 'margins2', 'margins3', 'map', 'people', 'chat', 'orga', 'person', 'gear', 'send', 'eyeOff',
  'bell', 'heart', 'eye', 'download', 'doc', 'book', 'shield', 'star', 'cake', 'ticket', 'history', 'userPlus', 'quote', 'drop',
  'share', 'clock', 'ban', 'unlock', 'checkCircle', 'calendarOff', 'external', 'mic', 'play', 'pause', 'paw', 'link', 'feed', 'pin',
  'poll', 'reply',
]

const meta = {
  title: 'Base/Icon',
  component: UiIcon,
  args: { name: 'home', size: 22, bold: false },
  argTypes: { name: { control: 'select', options: NAMES }, size: { control: { type: 'range', min: 12, max: 64, step: 2 } } },
} satisfies Meta<typeof UiIcon>
export default meta
type Story = StoryObj<typeof meta>

/** One icon on the 24-unit grid. It is decorative (`aria-hidden`): the control around it carries the label. */
export const Default: Story = {}

/** `bold` is the active tab's weight. */
export const Bold: Story = { args: { name: 'library', bold: true } }

/** The size is in px; the stroke stays a hairline at any size (in the 24-unit grid). */
export const Large: Story = { args: { name: 'heart', size: 48 } }

/** It takes the colour of its text (`currentColor`). */
export const Coloured: Story = {
  args: { name: 'bell' },
  render: args => ({
    components: { UiIcon },
    setup: () => ({ args }),
    template: '<span class="text-accent-ink"><UiIcon v-bind="args" /></span>',
  }),
}

/** Every icon name with its label. Use the controls to try `size` and `bold` on all of them. */
export const AllIcons: Story = {
  parameters: { layout: 'padded' },
  render: args => ({
    components: { UiIcon },
    setup: () => ({ args, NAMES }),
    template: `
      <ul class="grid list-none grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-md p-0 text-ink">
        <li v-for="name in NAMES" :key="name" class="flex flex-col items-center gap-sm rounded-md bg-surface-raised px-sm py-md">
          <UiIcon :name="name" :size="args.size" :bold="args.bold" />
          <span class="text-caption text-ink-muted">{{ name }}</span>
        </li>
      </ul>`,
  }),
}

/** The same grid at 32 px, bold. */
export const AllIconsBold: Story = { ...AllIcons, args: { size: 32, bold: true } }

export const Night: Story = { ...AllIcons, globals: { theme: 'night' } }
