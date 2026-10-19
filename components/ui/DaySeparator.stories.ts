import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiDaySeparator from './DaySeparator.vue'

// A day separator is a list item (a thread is a list), so each story puts it in the list it belongs to.
const meta = {
  title: 'Chat/DaySeparator',
  component: UiDaySeparator,
  args: { label: 'Today', tag: 'li', testid: 'chat' },
  render: args => ({
    components: { UiDaySeparator },
    setup: () => ({ args }),
    template: '<ol class="w-[min(100vw-2rem,380px)] py-md"><UiDaySeparator v-bind="args" /></ol>',
  }),
} satisfies Meta<typeof UiDaySeparator>
export default meta
type Story = StoryObj<typeof meta>

/** The label comes from `dayLabel` (`ui.text.chat.today` / `yesterday`); here it is just the words. */
export const Today: Story = {}
export const Yesterday: Story = { args: { label: 'Yesterday' } }
export const Weekday: Story = { args: { label: 'Monday' } }
export const OlderDay: Story = { args: { label: 'March 4' } }

/** `tag`: outside a list, any element will do. */
export const AsDiv: Story = {
  args: { tag: 'div' },
  render: args => ({
    components: { UiDaySeparator },
    setup: () => ({ args }),
    template: '<div class="w-[min(100vw-2rem,380px)] py-md"><UiDaySeparator v-bind="args" /></div>',
  }),
}

/** In a thread: between two runs of bubbles. */
export const InAThread: Story = {
  render: () => ({
    components: { UiDaySeparator },
    template: `
      <ol class="flex w-[min(100vw-2rem,380px)] flex-col gap-sm py-md">
        <li class="self-start rounded-lg bg-surface-raised px-inset py-sm text-body edge">See you tomorrow!</li>
        <UiDaySeparator label="Yesterday" />
        <li class="self-end rounded-lg bg-ink px-inset py-sm text-body text-on-ink">Good morning.</li>
        <UiDaySeparator label="Today" />
      </ol>`,
  }),
}

export const German: Story = { args: { label: 'Gestern' }, globals: { locale: 'de' } }
export const Night: Story = { globals: { theme: 'night' } }
