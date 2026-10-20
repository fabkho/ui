import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import UiProgress from './Progress.vue'
import UiButton from './Button.vue'

const meta = {
  title: 'Base/Progress',
  component: UiProgress,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A hairline progress bar for how far through a book the reader is: it draws the fill, and carries the same value for assistive tech, while the words beside it are the caller\'s.',
      },
    },
  },
  args: { fraction: 0.45, label: 'Reading progress', valueText: 'Page 216 of 480' },
  argTypes: { fraction: { control: { type: 'range', min: 0, max: 1, step: 0.01 } } },
  render: args => ({
    components: { UiProgress },
    setup: () => ({ args }),
    template: '<div class="w-full max-w-sm"><UiProgress v-bind="args" /></div>',
  }),
} satisfies Meta<typeof UiProgress>
export default meta
type Story = StoryObj<typeof meta>

/** A hairline bar. The words ("Page 216 of 480") are the caller's; this is the picture and, for assistive tech, the value. */
export const Default: Story = {}
export const Empty: Story = { args: { fraction: 0, valueText: 'Not started' } }
export const Finished: Story = { args: { fraction: 1, valueText: 'Finished' } }

/** `fraction` outside 0–1 is clamped. */
export const Clamped: Story = { args: { fraction: 1.7, valueText: 'Finished' } }

/** The fill grows over `standard` when the value changes. */
export const Interactive: Story = {
  render: () => ({
    components: { UiProgress, UiButton },
    setup() {
      const fraction = ref(0.2)
      const step = () => (fraction.value = fraction.value >= 1 ? 0 : Math.min(1, fraction.value + 0.2))
      return { fraction, step }
    },
    template: `
      <div class="flex w-full max-w-sm flex-col gap-md">
        <UiProgress :fraction="fraction" label="Reading progress" :value-text="Math.round(fraction * 100) + ' %'" />
        <div class="flex items-center justify-between">
          <span class="figures text-ink-muted text-caption">{{ Math.round(fraction * 100) }} %</span>
          <UiButton tone="secondary" size="sm" @click="step">Read more</UiButton>
        </div>
      </div>`,
  }),
}

export const Night: Story = { args: { fraction: 0.6, valueText: 'Page 288 of 480' }, globals: { theme: 'night' } }
