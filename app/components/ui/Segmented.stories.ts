import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'
import UiIcon from './Icon.vue'
import UiRow from './Row.vue'
import UiSegmented from './Segmented.vue'

const OPTIONS = [
  { value: 'pages', label: 'Pages' },
  { value: 'scroll', label: 'Scroll' },
]

const meta = {
  title: 'Base/Segmented',
  component: UiSegmented,
  parameters: { docs: { description: { component: 'A choice of a few options side by side in one group, a radiogroup whose chosen option is lit by a surface that slides to it.' } } },
  args: { options: OPTIONS, label: 'Reading mode', modelValue: 'pages', compact: false, disabled: false },
  render: args => ({
    components: { UiSegmented },
    setup() {
      const value = ref(args.modelValue)
      return { args, value }
    },
    template: '<div class="w-(--size-menu)"><UiSegmented v-bind="args" v-model="value" /></div>',
  }),
} satisfies Meta<typeof UiSegmented>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ThreeOptions: Story = {
  args: {
    label: 'Line spacing',
    modelValue: 'normal',
    options: [
      { value: 'tight', label: 'Tight' },
      { value: 'normal', label: 'Normal' },
      { value: 'loose', label: 'Loose' },
    ],
  },
}

/** The small one that sits at the right of a row (32 high, footnote size). */
export const Compact: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    components: { UiSegmented, UiRow },
    setup: () => ({ value: ref('pages'), OPTIONS }),
    template: `
      <div class="max-w-(--size-menu) rounded-md bg-fill">
        <UiRow label="Reading mode">
          <UiSegmented v-model="value" :options="OPTIONS" label="Reading mode" compact />
        </UiRow>
      </div>`,
  }),
}

/** The whole group is dimmed and takes no taps while something it started is under way. */
export const Disabled: Story = { args: { disabled: true } }

/** A `v-model` that matches no option lights none: a choice not made yet. */
export const NoChoiceYet: Story = { args: { modelValue: '' } }

/** The `option` slot draws each face ({ option, selected }); the label stays what assistive tech says. */
export const IconOptions: Story = {
  args: {
    label: 'Margins',
    modelValue: 'margins1',
    options: [
      { value: 'margins0', label: 'No margins' },
      { value: 'margins1', label: 'Narrow margins' },
      { value: 'margins2', label: 'Wide margins' },
    ],
  },
  render: args => ({
    components: { UiSegmented, UiIcon },
    setup() {
      const value = ref(args.modelValue)
      return { args, value }
    },
    template: `
      <div class="w-(--size-menu)">
        <UiSegmented v-bind="args" v-model="value">
          <template #option="{ option }"><UiIcon :name="option.value" :size="20" /></template>
        </UiSegmented>
      </div>`,
  }),
}

export const Night: Story = { globals: { theme: 'night' } }

/**
 * The keyboard pattern for a radio group (APG): Tab lands on the chosen option, the arrows move the choice
 * and the focus together, and they wrap. Copy this play function for any interactive widget.
 */
export const KeyboardPattern: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [pages, scroll] = canvas.getAllByRole('radio')
    await userEvent.tab()
    await expect(pages).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(scroll).toHaveFocus()
    await expect(scroll).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{ArrowRight}')
    await expect(pages).toHaveFocus()
    await expect(pages).toHaveAttribute('aria-checked', 'true')
  },
}

/** The focus ring of a keyboard user, forced on with the pseudo-states addon so axe and the eye both see it. */
export const FocusVisible: Story = {
  args: { modelValue: 'scroll' },
  parameters: { pseudo: { focusVisible: ['.option'] } },
}
