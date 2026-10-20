import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiRow from './Row.vue'
import UiRowGroup from './RowGroup.vue'

const meta = {
  title: 'Base/RowGroup',
  component: UiRowGroup,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Inset grouped rows on a quiet fill with a hairline edge, iOS style: the rows inside draw their own inset dividers.',
      },
    },
  },
  args: { as: 'div' },
  render: args => ({
    components: { UiRowGroup, UiRow },
    setup: () => ({ args }),
    template: `
      <UiRowGroup v-bind="args" class="max-w-(--size-menu)">
        <UiRow icon="person" label="Name" value="Ada Lovelace" />
        <UiRow icon="mail" label="Email" value="ada@example.com" />
        <UiRow icon="globe" label="Language" value="English" />
      </UiRowGroup>`,
  }),
} satisfies Meta<typeof UiRowGroup>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** `as="ul"` for rows that are list items. */
export const AsList: Story = {
  args: { as: 'ul' },
  render: args => ({
    components: { UiRowGroup, UiRow },
    setup: () => ({ args }),
    template: `
      <UiRowGroup v-bind="args" class="max-w-(--size-menu)">
        <UiRow as="li" label="Morning yoga" value="07:30" />
        <UiRow as="li" label="Breakfast" value="09:00" />
        <UiRow as="li" label="Lake walk" value="11:00" />
      </UiRowGroup>`,
  }),
}

export const SingleRow: Story = {
  render: () => ({
    components: { UiRowGroup, UiRow },
    template: '<UiRowGroup class="max-w-(--size-menu)"><UiRow label="Version" value="1.4.2" mono /></UiRowGroup>',
  }),
}

export const Night: Story = { globals: { theme: 'night' } }
