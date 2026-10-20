import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import UiField from './Field.vue'

const meta = {
  title: 'Base/Field',
  component: UiField,
  parameters: { docs: { description: { component: 'A labelled text field with a rule that lights up in the accent colour while it has the keyboard and turns to the error colour when the value is rejected.' } } },
  args: { id: 'field', label: 'Your name', modelValue: '' },
  argTypes: { modelValue: { control: 'text' } },
  render: args => ({
    components: { UiField },
    setup() {
      const value = ref(args.modelValue)
      return { args, value }
    },
    template: '<div class="w-(--size-menu)"><UiField v-bind="args" v-model="value" /></div>',
  }),
} satisfies Meta<typeof UiField>
export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { placeholder: 'Ada Lovelace' } as object }
export const Filled: Story = { args: { modelValue: 'Ada Lovelace' } }

/** A quiet line under the rule that says what the field is for. */
export const WithHint: Story = { args: { id: 'nickname', label: 'Nickname', hint: 'Shown to the other guests on your retreat.' } }

/** The error takes the hint's place, the rule turns red and the input is `aria-invalid`. */
export const WithError: Story = {
  args: {
    id: 'email-error',
    label: 'Email address',
    modelValue: 'ada@',
    hint: 'We never share it.',
    error: 'Please enter a valid email address.',
  },
}

/** `disabled`, like `type`, `autocomplete` or `inputmode`, is an attribute that falls through to the input. */
export const Disabled: Story = { args: { id: 'booking', label: 'Booking number', modelValue: 'BR-20418', disabled: true } as object }

export const Email: Story = {
  args: { id: 'email', label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' } as object,
}

export const Password: Story = {
  args: { id: 'password', label: 'Password', type: 'password', autocomplete: 'current-password', modelValue: 'hunter2hunter2' } as object,
}

export const Night: Story = {
  args: { id: 'night', label: 'Email address', modelValue: 'ada@', error: 'Please enter a valid email address.' },
  globals: { theme: 'night' },
}
