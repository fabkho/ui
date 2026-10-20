import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiRoundButton from './RoundButton.vue'

/** Chrome that floats over content: the glass blurs what is behind it, so the stories sit on a busy backdrop. */
const meta = {
  title: 'Base/RoundButton',
  component: UiRoundButton,
  args: { icon: 'back', label: 'Back' },
  decorators: [
    () => ({
      template:
        '<div class="rounded-md bg-linear-to-br from-accent to-surface-raised p-xl"><story /></div>',
    }),
  ],
} satisfies Meta<typeof UiRoundButton>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Close: Story = { args: { icon: 'close', label: 'Close' } }

/** Attributes such as `disabled` fall through to the button. */
export const Disabled: Story = { args: { disabled: true } as object }

/** The default slot takes a face that is not an icon (the reader's Aa); `label` is still what assistive tech says. */
export const TextFace: Story = {
  args: { icon: undefined, label: 'Text settings' },
  render: args => ({
    components: { UiRoundButton },
    setup: () => ({ args }),
    template: '<UiRoundButton v-bind="args"><span class="text-caption">Aa</span></UiRoundButton>',
  }),
}

/** The Glass setting (an app's `--glass-solid` 100 %, `--glass-scale` 0): no transparency, the sheet's own colour. An app that sets neither gets the glass above. */
export const GlassOff: Story = {
  render: args => ({
    components: { UiRoundButton },
    setup: () => ({ args }),
    template: '<div style="--glass-solid: 100%; --glass-scale: 0"><UiRoundButton v-bind="args" /></div>',
  }),
}

export const Night: Story = { globals: { theme: 'night' } }
