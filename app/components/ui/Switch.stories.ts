import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiSwitch from './Switch.vue'

/** Presentational only: the control that owns the state (see SwitchRow) carries `role="switch"` and `aria-checked`. */
const meta = {
  title: 'Base/Switch',
  component: UiSwitch,
  args: { on: false },
} satisfies Meta<typeof UiSwitch>
export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}
export const On: Story = { args: { on: true } }

export const Night: Story = {
  globals: { theme: 'night' },
  render: () => ({
    components: { UiSwitch },
    template: '<div class="flex gap-md"><UiSwitch :on="false" /><UiSwitch :on="true" /></div>',
  }),
}
