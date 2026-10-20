import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import UiCheckbox from './Checkbox.vue'

const meta = {
  title: 'Base/Checkbox',
  component: UiCheckbox,
  args: { modelValue: false },
  parameters: {
    docs: {
      description: {
        component:
          'A consent or a choice that is ticked: a hairline ring that turns into a lamp-lit disc with a check, with the words beside it as the default slot (which may hold a link).',
      },
    },
  },
  render: args => ({
    components: { UiCheckbox },
    setup() {
      const checked = ref(args.modelValue)
      return { args, checked }
    },
    template: '<UiCheckbox v-model="checked" v-bind="$attrs">I agree to the terms of stay.</UiCheckbox>',
  }),
} satisfies Meta<typeof UiCheckbox>
export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = {}
export const Checked: Story = { args: { modelValue: true } }

/** The words are the slot and may hold a link; the whole row (at least 44 high) is the label. */
export const WithLink: Story = {
  render: () => ({
    components: { UiCheckbox },
    setup: () => ({ checked: ref(false) }),
    template: `
      <UiCheckbox v-model="checked">
        I have read the <a href="#terms" class="text-accent-ink underline">house rules</a> and the <a href="#privacy" class="text-accent-ink underline">privacy policy</a>.
      </UiCheckbox>`,
  }),
}

/** Long copy wraps beside the box; the box stays aligned with the first line. */
export const LongText: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    components: { UiCheckbox },
    setup: () => ({ checked: ref(true) }),
    template: `
      <div class="max-w-(--size-menu)">
        <UiCheckbox v-model="checked">
          Yes, please send me occasional emails about new retreats, early-bird prices and changes to the programme I have booked. I can unsubscribe at any time with one click.
        </UiCheckbox>
      </div>`,
  }),
}

/** Attributes such as `disabled` or `required` go to the native input. */
export const Disabled: Story = {
  render: () => ({
    components: { UiCheckbox },
    setup: () => ({ on: ref(true), off: ref(false) }),
    template: `
      <div class="flex flex-col gap-sm">
        <UiCheckbox v-model="off" disabled>Disabled, unchecked</UiCheckbox>
        <UiCheckbox v-model="on" disabled>Disabled, checked</UiCheckbox>
      </div>`,
  }),
}

export const Night: Story = { args: { modelValue: true }, globals: { theme: 'night' } }
