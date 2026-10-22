import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import { expect, userEvent, within } from 'storybook/test'
import UiCheckList from './CheckList.vue'
import UiAvatar from './Avatar.vue'
import { PEOPLE } from '../../../.storybook/chat-fixtures'

const OPTIONS = PEOPLE.map(({ id, label, sublabel, initials, photo }) => ({ id, label, sublabel, face: { initials, photo } }))

const meta = {
  title: 'Base/CheckList',
  component: UiCheckList,
  args: { label: 'Members', options: OPTIONS.map(({ face, ...o }) => o), modelValue: [] },
  parameters: {
    docs: {
      description: {
        component:
          'A list to choose several from (members of a group, friends of a buddy read): a filter field, a native checkbox per option with an optional face and sublabel, and a live count line. An APG checkbox group (a fieldset of native checkboxes), not a multi-select listbox: Tab and Space work everywhere and VoiceOver on iOS handles it. `min` and `max` show in the count line; at `max` the rest is disabled.',
      },
    },
  },
  decorators: [() => ({ template: '<div class="w-[min(100vw-2rem,380px)]"><story /></div>' })],
  render: (args) => ({
    components: { UiCheckList },
    setup() {
      const chosen = ref<string[]>([...(args.modelValue ?? [])])
      return { args, chosen }
    },
    template: '<UiCheckList v-bind="args" v-model="chosen" />',
  }),
} satisfies Meta<typeof UiCheckList>
export default meta
type Story = StoryObj<typeof meta>

/** Nothing chosen: the count line says "0 selected". */
export const Default: Story = {}

/** Some chosen, with sublabels. */
export const Chosen: Story = { args: { modelValue: ['ida', 'clara'] } }

/** The `face` slot gets the option: here `UiAvatar`, or `UiAvatarStack`, the app's own avatar. Decoration: the name is the label. */
export const WithFaces: Story = {
  args: { options: OPTIONS, modelValue: ['berit'] },
  render: (args) => ({
    components: { UiCheckList, UiAvatar },
    setup() {
      const chosen = ref<string[]>([...(args.modelValue ?? [])])
      return { args, chosen }
    },
    template: `<UiCheckList v-bind="args" v-model="chosen">
      <template #face="{ option }"><UiAvatar :initials="option.face.initials" :photo="option.face.photo" size="md" decorative /></template>
    </UiCheckList>`,
  }),
}

/** `min`: the count line asks for more while fewer are chosen; it goes away at the minimum. */
export const Minimum: Story = {
  args: { min: 2, modelValue: ['ida'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toHaveTextContent('1 selected Choose at least 2.')
    await userEvent.click(canvas.getByRole('checkbox', { name: /Clara/ }))
    await expect(canvas.getByRole('status')).toHaveTextContent('2 selected')
    await expect(canvas.getByRole('status')).not.toHaveTextContent('at least')
  },
}

/** `max`: at the limit the unticked rows are disabled; a ticked one can still be taken back. */
export const Maximum: Story = {
  args: { max: 2, modelValue: ['ida', 'berit'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toHaveTextContent('2 of 2 selected')
    await expect(canvas.getByRole('checkbox', { name: /Clara/ })).toBeDisabled()
    await userEvent.click(canvas.getByRole('checkbox', { name: /Ida/ }))
    await expect(canvas.getByRole('checkbox', { name: /Clara/ })).toBeEnabled()
    await expect(canvas.getByRole('status')).toHaveTextContent('1 of 2 selected')
  },
}

/** The filter hides rows (case and accents ignored); the choice stays, and the count counts all of it. */
export const Filtered: Story = {
  args: { modelValue: ['ida'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Filter' }), 'jose')
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(1)
    await expect(canvas.getByRole('checkbox', { name: /José/ })).toBeInTheDocument()
    await expect(canvas.getByRole('status')).toHaveTextContent('1 selected')
  },
}

/** A filter that finds nobody says so in the live count line. */
export const NoMatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Filter' }), 'zzz')
    await expect(canvas.queryAllByRole('checkbox')).toHaveLength(0)
    await expect(canvas.getByRole('status')).toHaveTextContent('Nothing matches.')
  },
}

/** `noFilter`: a short list without the field. */
export const WithoutFilter: Story = { args: { noFilter: true, modelValue: ['clara'] } }

/**
 * Keyboard (APG checkbox group): Tab goes field, then each checkbox in turn; Space ticks and unticks; the count line is a live
 * region, so the number is read after each change.
 */
export const Keyboard: Story = {
  args: { max: 3 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.tab()
    await expect(canvas.getByRole('searchbox', { name: 'Filter' })).toHaveFocus()
    await userEvent.tab()
    await expect(canvas.getByRole('checkbox', { name: /Ida/ })).toHaveFocus()
    await userEvent.keyboard(' ')
    await expect(canvas.getByRole('checkbox', { name: /Ida/ })).toBeChecked()
    await userEvent.tab()
    await userEvent.tab()
    await expect(canvas.getByRole('checkbox', { name: /Clara/ })).toHaveFocus()
    await userEvent.keyboard(' ')
    await expect(canvas.getByRole('status')).toHaveTextContent('2 of 3 selected')
    await userEvent.keyboard(' ')
    await expect(canvas.getByRole('checkbox', { name: /Clara/ })).not.toBeChecked()
    await expect(canvas.getByRole('status')).toHaveTextContent('1 of 3 selected')
    // One group, named.
    await expect(canvas.getByRole('group', { name: 'Members' })).toBeVisible()
  },
}

export const German: Story = { args: { min: 2, modelValue: ['ida'] }, globals: { locale: 'de' } }
export const Night: Story = { args: { modelValue: ['ida', 'clara'], min: 3 }, globals: { theme: 'night' } }
export const NightFaces: Story = { ...WithFaces, globals: { theme: 'night' } }
