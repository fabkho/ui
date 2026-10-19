import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import UiPill from './Pill.vue'

const meta = {
  title: 'Base/Pill',
  component: UiPill,
  args: { pressed: false, count: undefined, radio: false },
  render: args => ({
    components: { UiPill },
    setup() {
      // Stateful: a click flips it. The `pressed` control sets where it starts.
      const on = ref(args.pressed)
      watch(() => args.pressed, (value) => (on.value = value))
      return { args, on }
    },
    template: '<UiPill :pressed="on" :count="args.count" :radio="args.radio" @click="on = !on">Read</UiPill>',
  }),
} satisfies Meta<typeof UiPill>
export default meta
type Story = StoryObj<typeof meta>

/** A hairline pill. A button with `aria-pressed`; the drawn pill is 32 px, the touch target stays 44. */
export const Off: Story = {}

/** Pressed: filled with ink. */
export const On: Story = { args: { pressed: true } }

/** The count sits in mono beside the words, quieter than them. */
export const WithCount: Story = { args: { count: 12 } }

export const PressedWithCount: Story = { args: { pressed: true, count: 12 } }

/** A count of zero still shows (only `undefined` hides it). */
export const ZeroCount: Story = { args: { count: 0 } }

/** The pill never grows past its container: long words are truncated. */
export const LongText: Story = {
  render: () => ({
    components: { UiPill },
    template: `
      <div class="w-48">
        <UiPill :pressed="false" :count="128">Currently reading, started this year</UiPill>
      </div>`,
  }),
}

/** A row of toggles (the Library's filters): any number can be on. */
export const Toggles: Story = {
  render: () => ({
    components: { UiPill },
    setup() {
      const filters = ref([
        { name: 'Want to read', count: 24, on: true },
        { name: 'Reading', count: 3, on: false },
        { name: 'Finished', count: 118, on: true },
        { name: 'Abandoned', count: 0, on: false },
      ])
      return { filters }
    },
    template: `
      <div class="flex flex-wrap gap-sm" role="group" aria-label="Shelves">
        <UiPill v-for="filter in filters" :key="filter.name" :pressed="filter.on" :count="filter.count" @click="filter.on = !filter.on">{{ filter.name }}</UiPill>
      </div>`,
  }),
}

/** `radio`: one of a choice of one, inside a `radiogroup`; it says `role=radio` and `aria-checked`. */
export const Radio: Story = {
  render: () => ({
    components: { UiPill },
    setup() {
      const options = ['Title', 'Author', 'Recently added', 'Rating']
      const chosen = ref('Title')
      return { options, chosen }
    },
    template: `
      <div class="flex flex-wrap gap-sm" role="radiogroup" aria-label="Sort by">
        <UiPill v-for="option in options" :key="option" radio :pressed="chosen === option" @click="chosen = option">{{ option }}</UiPill>
      </div>`,
  }),
}

/** A radio choice with counts. */
export const RadioWithCount: Story = {
  render: () => ({
    components: { UiPill },
    setup() {
      const options = [{ name: '2024', count: 31 }, { name: '2025', count: 47 }, { name: '2026', count: 9 }]
      const chosen = ref('2025')
      return { options, chosen }
    },
    template: `
      <div class="flex flex-wrap gap-sm" role="radiogroup" aria-label="Year">
        <UiPill v-for="option in options" :key="option.name" radio :pressed="chosen === option.name" :count="option.count" @click="chosen = option.name">{{ option.name }}</UiPill>
      </div>`,
  }),
}

export const Night: Story = { ...Toggles, globals: { theme: 'night' } }
