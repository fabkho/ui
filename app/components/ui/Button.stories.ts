import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiButton from './Button.vue'

const TONES = ['primary', 'secondary', 'quiet', 'plain', 'danger'] as const
const SIZES = ['lg', 'md', 'sm'] as const

const meta = {
  title: 'Base/Button',
  component: UiButton,
  argTypes: {
    tone: { control: 'select', options: TONES },
    size: { control: 'inline-radio', options: SIZES },
    type: { control: 'inline-radio', options: ['button', 'submit'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'The pill action of the app, in five tones and three sizes, whose touch target never shrinks below 44 px; its label goes in the default slot.',
      },
    },
  },
  args: { tone: 'primary', size: 'lg', block: false, disabled: false, offline: false, type: 'button' },
  render: args => ({
    components: { UiButton },
    setup: () => ({ args }),
    template: '<UiButton v-bind="args">Save changes</UiButton>',
  }),
} satisfies Meta<typeof UiButton>
export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}
export const Secondary: Story = { args: { tone: 'secondary' } }
export const Quiet: Story = { args: { tone: 'quiet' } }
export const Plain: Story = { args: { tone: 'plain' } }
export const Danger: Story = { args: { tone: 'danger' } }
export const Small: Story = { args: { size: 'sm' } }
export const Block: Story = { args: { block: true }, parameters: { layout: 'padded' } }
export const Disabled: Story = { args: { disabled: true } }
/** The action writes and the device has no connection: it says "Offline" (`ui.text.offline`) instead of what it does. */
export const Offline: Story = { args: { offline: true } }

/** Every tone at every size. */
export const AllTones: Story = {
  render: () => ({
    components: { UiButton },
    setup: () => ({ TONES, SIZES }),
    template: `
      <div class="flex flex-col gap-md">
        <div v-for="size in SIZES" :key="size" class="flex flex-wrap items-center gap-md">
          <UiButton v-for="tone in TONES" :key="tone" :tone="tone" :size="size">{{ tone }}</UiButton>
        </div>
      </div>`,
  }),
}
