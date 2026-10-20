import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import UiRowGroup from './RowGroup.vue'
import UiSwitchRow from './SwitchRow.vue'

const meta = {
  title: 'Base/SwitchRow',
  component: UiSwitchRow,
  parameters: { layout: 'padded', docs: { description: { component: 'A setting that is on or off, as a row in a row group: the label (and an icon), the switch at the right, the whole row the control.' } } },
  args: { label: 'Dark mode', icon: 'moon', modelValue: false },
  render: args => ({
    components: { UiSwitchRow, UiRowGroup },
    setup() {
      const on = ref(args.modelValue)
      return { args, on }
    },
    template: '<UiRowGroup class="max-w-(--size-menu)"><UiSwitchRow v-bind="args" v-model="on" testid="dark" /></UiRowGroup>',
  }),
} satisfies Meta<typeof UiSwitchRow>
export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}
export const On: Story = { args: { modelValue: true } }
export const WithoutIcon: Story = { args: { icon: undefined, label: 'Send me trip reminders' } }

/** Several switch rows in a group, with the dividers between them. */
export const InGroup: Story = {
  render: () => ({
    components: { UiSwitchRow, UiRowGroup },
    setup: () => ({ dark: ref(true), push: ref(false), mail: ref(true) }),
    template: `
      <UiRowGroup class="max-w-(--size-menu)">
        <UiSwitchRow v-model="dark" label="Dark mode" icon="moon" testid="dark" />
        <UiSwitchRow v-model="push" label="Push notifications" icon="bell" testid="push" />
        <UiSwitchRow v-model="mail" label="Email digest" icon="mail" testid="mail" />
      </UiRowGroup>`,
  }),
}

export const Night: Story = { args: { modelValue: true }, globals: { theme: 'night' } }
