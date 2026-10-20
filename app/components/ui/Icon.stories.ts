import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { onBeforeUnmount } from 'vue'
import UiIcon, { type IconName } from './Icon.vue'

/** Every `IconName`, in the order of the union in Icon.vue. */
const NAMES: IconName[] = [
  'home', 'library', 'search', 'back', 'plus', 'minus', 'more', 'close', 'check', 'grip', 'chevron', 'down', 'calendar', 'lock',
  'mail', 'repeat', 'slash', 'stack', 'globe', 'pencil', 'flag', 'arrow', 'sun', 'moon', 'signOut', 'trash', 'offline', 'sync',
  'import', 'camera', 'torch', 'ebook', 'read', 'contents', 'translate', 'define', 'copy', 'leading0', 'leading1', 'leading2',
  'leading3', 'margins0', 'margins1', 'margins2', 'margins3', 'map', 'people', 'chat', 'orga', 'person', 'gear', 'send', 'eyeOff',
  'bell', 'heart', 'eye', 'download', 'doc', 'book', 'shield', 'star', 'cake', 'ticket', 'history', 'userPlus', 'quote', 'drop',
  'share', 'clock', 'ban', 'unlock', 'checkCircle', 'calendarOff', 'external', 'mic', 'play', 'pause', 'paw', 'link', 'feed', 'pin',
  'poll', 'reply', 'bookmark', 'bookmarkPlus', 'hardcover', 'paperback', 'tablet', 'audiobook',
]

const meta = {
  title: 'Base/Icon',
  component: UiIcon,
  parameters: { docs: { description: { component: 'One icon of the set, drawn on a 24-unit grid in the current text colour and decorative to assistive tech.' } } },
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

/**
 * An app draws its own `people` through `ui.icons` (app.config.ts). The story sets it for its own render and puts
 * the layer's drawing back when it leaves, so the other stories keep theirs.
 */
const LAYER_PEOPLE = `<circle cx="9.3" cy="8.8" r="3.3" /><path d="M3.8 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M15.4 6.1a3.3 3.3 0 0 1 .3 6.4M17 14.9c2.1.5 3.5 2.3 3.5 4.6" />`
const OWN_PEOPLE = '<circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" />'
export const AppOverride: Story = {
  args: { name: 'people', size: 48 },
  render: args => ({
    components: { UiIcon },
    setup() {
      updateAppConfig({ ui: { icons: { people: OWN_PEOPLE } } })
      onBeforeUnmount(() => updateAppConfig({ ui: { icons: { people: LAYER_PEOPLE } } }))
      return { args }
    },
    template: '<UiIcon v-bind="args" />',
  }),
}
