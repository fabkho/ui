import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, within } from 'storybook/test'
import { ref } from 'vue'
import UiTextArea from './TextArea.vue'

const meta = {
  title: 'Base/TextArea',
  component: UiTextArea,
  args: { id: 'review', label: 'Your review', modelValue: '' },
  argTypes: { modelValue: { control: 'text' } },
  render: args => ({
    components: { UiTextArea },
    setup() {
      const value = ref(args.modelValue)
      return { args, value }
    },
    template: '<div class="w-(--size-menu)"><UiTextArea v-bind="args" v-model="value" /></div>',
  }),
} satisfies Meta<typeof UiTextArea>
export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { placeholder: 'What stayed with you?' } as object }
export const Filled: Story = {
  args: { modelValue: 'A quiet week, long breakfasts and a very good teacher. I would come back tomorrow.' },
}

/**
 * The hint sits beside the label, after a dot. It describes the field (`aria-describedby`), so the name stays
 * "Your review" and a screen reader adds "optional" after it.
 */
export const WithHint: Story = {
  args: { hint: 'optional', placeholder: 'What stayed with you?' } as object,
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole('textbox', { name: 'Your review' })
    await expect(field).toHaveAccessibleDescription('· optional')
  },
}

/** `error`: the message under the text, in the error colour; the field says `aria-invalid` and is described by it, before the hint. */
export const WithError: Story = {
  args: { hint: 'optional', error: 'Reviews need at least ten words.', errorTestid: 'reviewError', modelValue: 'Nice.' } as object,
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole('textbox', { name: 'Your review' })
    await expect(field).toBeInvalid()
    await expect(field).toHaveAccessibleDescription('Reviews need at least ten words. · optional')
  },
}

/** It grows with the text up to six lines, then scrolls. */
export const LongText: Story = {
  args: {
    modelValue:
      'Day one: arrival, tea on the terrace and a short walk down to the lake.\nDay two: the morning session was gentle, the afternoon free.\nDay three: a long hike with a picnic.\nDay four: rain, so we stayed in and read.\nDay five: the market, then the evening dinner.\nDay six: the best sunrise of the week.\nDay seven: goodbyes and a very long drive home.',
  },
}

/** Attributes such as `maxlength` or `disabled` go to the textarea. */
export const Disabled: Story = { args: { modelValue: 'Reviews close two weeks after the retreat.', disabled: true } as object }

export const Night: Story = { args: { modelValue: 'A quiet week.', hint: 'optional' }, globals: { theme: 'night' } }
