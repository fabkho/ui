import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, within } from 'storybook/test'
import { ref } from 'vue'
import UiDateRow from './DateRow.vue'
import UiRowGroup from './RowGroup.vue'

const meta = {
  title: 'Base/DateRow',
  component: UiDateRow,
  parameters: { layout: 'padded' },
  args: { label: 'Finished on', testid: 'finished', modelValue: '2025-10-03' },
  render: args => ({
    components: { UiDateRow, UiRowGroup },
    setup() {
      const value = ref(args.modelValue)
      return { args, value }
    },
    template: '<UiRowGroup class="max-w-(--size-menu)"><UiDateRow v-bind="args" v-model="value" /></UiRowGroup>',
  }),
} satisfies Meta<typeof UiDateRow>
export default meta
type Story = StoryObj<typeof meta>

/** Without `text` the ISO day is shown. */
export const Default: Story = {}

/** The app formats the day in words and passes it as `text`. */
export const WithText: Story = { args: { text: 'Today · 3 Oct' } }

/** Cleared: `placeholder` says what an empty day means. */
export const Empty: Story = { args: { modelValue: '', placeholder: 'Choose a day' } }

export const CustomIcon: Story = { args: { label: 'Birthday', icon: 'cake', text: '14 March 1990', modelValue: '1990-03-14', testid: 'birthday' } }

/**
 * An impossible day (here: in the future) shows in the error colour, and not by colour alone (WCAG 1.4.1): a
 * struck-through calendar stands before it, and the input says `aria-invalid`.
 */
export const Invalid: Story = {
  args: { modelValue: '2099-01-01', text: '1 Jan 2099', invalid: true, max: '2025-12-31' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText('Finished on')).toBeInvalid()
    await expect(canvas.getByTestId('finishedInvalid')).toBeVisible()
  },
}

export const Night: Story = { args: { text: 'Today · 3 Oct' }, globals: { theme: 'night' } }
