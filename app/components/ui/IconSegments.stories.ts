import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'
import UiIconSegments, { type IconSegment } from './IconSegments.vue'

const FORMATS: IconSegment<string>[] = [
  { value: 'hardcover', label: 'Hardcover', icon: 'hardcover' },
  { value: 'paperback', label: 'Paperback', icon: 'paperback' },
  { value: 'ebook', label: 'Ebook', icon: 'tablet' },
  { value: 'audiobook', label: 'Audiobook', icon: 'audiobook' },
]

/** The group is named by a visible label (`labelledby`); the host owns the choice and answers `choose`. */
const meta = {
  title: 'Base/IconSegments',
  component: UiIconSegments,
  parameters: { docs: { description: { component: 'A radio group of icon segments in which the chosen one unfolds its name beside its icon while the others stay icons.' } } },
  args: { options: FORMATS, value: 'paperback', labelledby: 'format-label', testid: 'format', required: false, invalid: false, disabled: false },
  render: args => ({
    components: { UiIconSegments },
    setup() {
      const value = ref(args.value)
      return { args, value }
    },
    template: `
      <div class="w-(--size-menu)">
        <p id="format-label" class="eyebrow mb-xs">Format</p>
        <UiIconSegments v-bind="args" :value="value" @choose="value = $event" />
      </div>`,
  }),
} satisfies Meta<typeof UiIconSegments>
export default meta
type Story = StoryObj<typeof meta>

/** The chosen segment unfolds its name beside its icon; the others stay icons. */
export const Default: Story = {}

/** A `value` of `null` lights none of them: a choice not made yet. */
export const NoChoiceYet: Story = { args: { value: null } }

/** Three segments, the way Read as uses it. */
export const ThreeSegments: Story = {
  args: {
    options: [
      { value: 'print', label: 'Print', icon: 'paperback' },
      { value: 'ebook', label: 'Ebook', icon: 'tablet' },
      { value: 'audio', label: 'Audio', icon: 'audiobook' },
    ],
    value: 'ebook',
  },
}

/** Dimmed, and it takes no taps while something it started is under way. */
export const Disabled: Story = { args: { disabled: true } }

/** `required` and `invalid` are said to assistive tech (`aria-required`, `aria-invalid`) on the group. */
export const Invalid: Story = { args: { value: null, required: true, invalid: true } }

/** With no visible label to point at, `label` names the group. */
export const NamedByLabel: Story = {
  args: { labelledby: undefined, label: 'Format' },
  render: args => ({
    components: { UiIconSegments },
    setup() {
      const value = ref(args.value)
      return { args, value }
    },
    template: '<div class="w-(--size-menu)"><UiIconSegments v-bind="args" :value="value" @choose="value = $event" /></div>',
  }),
}

export const Night: Story = { globals: { theme: 'night' } }

/**
 * The keyboard pattern for a radio group (APG): Tab lands on the chosen segment (one tab stop), the arrows move the
 * choice and the focus together, and they wrap.
 */
export const KeyboardPattern: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [hardcover, paperback, ebook] = canvas.getAllByRole('radio')
    await expect(canvas.getByRole('radiogroup')).toHaveAccessibleName('Format')
    await userEvent.tab()
    await expect(paperback).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(ebook).toHaveFocus()
    await expect(ebook).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    await expect(hardcover).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    await expect(canvas.getAllByRole('radio').at(-1)).toHaveFocus()
    await expect(canvas.getAllByRole('radio').at(-1)).toHaveAttribute('aria-checked', 'true')
  },
}

/** With none chosen, the first segment is the tab stop. */
export const KeyboardWithNoChoice: Story = {
  args: { value: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first, second] = canvas.getAllByRole('radio')
    await userEvent.tab()
    await expect(first).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(second).toHaveFocus()
    await expect(second).toHaveAttribute('aria-checked', 'true')
  },
}

/** The focus ring of a keyboard user, forced on with the pseudo-states addon. */
export const FocusVisible: Story = { parameters: { pseudo: { focusVisible: ['.segment'] } } }
