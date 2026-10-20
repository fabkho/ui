import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiIcon from './Icon.vue'
import UiRow from './Row.vue'
import UiRowGroup from './RowGroup.vue'

const meta = {
  title: 'Base/Row',
  component: UiRow,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'One row in a RowGroup: an optional icon (or `lead` slot), the label, the value or a placeholder on the right, and an optional chevron; a plain div, a button, or a link (in-app with `to`, or out of the app with `as="a"`).',
      },
    },
  },
  args: { label: 'Language', value: 'English', chevron: false, mono: false, tone: 'default', as: 'div' },
  render: args => ({
    components: { UiRow, UiRowGroup },
    setup: () => ({ args }),
    template: '<UiRowGroup class="max-w-(--size-menu)"><UiRow v-bind="args" /></UiRowGroup>',
  }),
} satisfies Meta<typeof UiRow>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithIcon: Story = { args: { icon: 'globe' } }
export const WithChevron: Story = { args: { icon: 'globe', chevron: true } }

/** No value yet: the placeholder in the quiet colour. */
export const Placeholder: Story = { args: { label: 'Nickname', value: undefined, placeholder: 'Not set' } }

/** `mono` sets the value in tabular figures at the caption size. */
export const Mono: Story = { args: { label: 'Booking number', value: 'BR-2025-04182', mono: true, icon: 'ticket' } }

export const Danger: Story = { args: { label: 'Delete account', value: undefined, icon: 'trash', tone: 'danger', as: 'button', 'data-testid': 'delete' } as object }

/** `as="button"` makes the whole row tappable; it then needs a `data-testid`. */
export const AsButton: Story = { args: { as: 'button', chevron: true, icon: 'globe', 'data-testid': 'language' } as object }

/** `as="a"` is a link out of the app: `href`, `target` and `rel` fall through. */
export const AsLink: Story = {
  args: { as: 'a', label: 'House rules', value: undefined, icon: 'doc', chevron: true, href: '#rules', 'data-testid': 'rules' } as object,
}

/** Long values truncate rather than wrap; the label keeps its width. */
export const LongValue: Story = {
  args: { label: 'Address', value: 'Hauptstraße 123, Gartenhaus im Hinterhof, 80331 München, Deutschland' },
}

/** The `lead` slot stands in for the icon (a face, a mark of the app's own); `trailing` sits after the value. */
export const Slots: Story = {
  render: () => ({
    components: { UiRow, UiRowGroup, UiIcon },
    template: `
      <UiRowGroup class="max-w-(--size-menu)">
        <UiRow label="Ada Lovelace" value="Host">
          <template #lead><span class="flex size-(--size-button-sm) items-center justify-center rounded-pill bg-fill-strong text-caption">AL</span></template>
          <template #trailing><UiIcon name="star" :size="15" class="text-accent-ink" /></template>
        </UiRow>
      </UiRowGroup>`,
  }),
}

export const Night: Story = { globals: { theme: 'night' }, args: { icon: 'globe', chevron: true } }
