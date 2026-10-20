import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, within } from 'storybook/test'
import UiDaySeparator from './DaySeparator.vue'

// A day separator is a list item (a thread is a list), so each story puts it in the list it belongs to.
const meta = {
  title: 'Chat/DaySeparator',
  component: UiDaySeparator,
  parameters: { docs: { description: { component: 'The day a group of messages belongs to, centred and quiet in the eyebrow type, as a heading inside the thread list item.' } } },
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

/**
 * A day is a heading (WCAG 1.3.1): a screen reader's reader jumps from day to day, and the messages after it
 * belong to it. The heading sits inside the list item, so the thread's list stays a list. `level` sets which one (2 by default).
 */
export const AsHeading: Story = {
  args: { label: 'Yesterday' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { name: 'Yesterday', level: 2 })).toBeVisible()
    await expect(canvas.getByRole('listitem')).toContainElement(canvas.getByRole('heading'))
  },
}

export const HeadingLevel: Story = {
  args: { label: 'Monday', level: 3 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { name: 'Monday', level: 3 })).toBeVisible()
  },
}

/** In a thread: between two runs of bubbles. */
export const InAThread: Story = {
  play: async ({ canvasElement }) => {
    const days = within(canvasElement).getAllByRole('heading')
    await expect(days.map(day => day.textContent)).toEqual(['Yesterday', 'Today'])
  },
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
