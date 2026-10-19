import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import UiListMotion from './ListMotion.vue'
import UiButton from './Button.vue'

const TITLES = ['Dune', 'Neuromancer', 'Solaris', 'The Left Hand of Darkness', 'Hyperion', 'Kindred', 'Piranesi', 'Blindsight']

const meta = {
  title: 'Base/ListMotion',
  component: UiListMotion,
  parameters: { layout: 'padded' },
  args: { tag: 'ul' },
  render: args => ({
    components: { UiListMotion, UiButton },
    setup() {
      let next = 4
      const items = ref(TITLES.slice(0, 4).map((title, id) => ({ id, title })))
      const add = () => {
        if (next >= TITLES.length) next = 0
        items.value.splice(1, 0, { id: Date.now(), title: TITLES[next++]! })
      }
      const remove = (id: number) => (items.value = items.value.filter(item => item.id !== id))
      const shuffle = () => (items.value = [...items.value].sort(() => Math.random() - 0.5))
      return { args, items, add, remove, shuffle }
    },
    template: `
      <div class="flex w-full max-w-sm flex-col gap-md">
        <div class="flex gap-sm">
          <UiButton tone="secondary" size="sm" @click="add">Add an item</UiButton>
          <UiButton tone="secondary" size="sm" @click="shuffle">Shuffle</UiButton>
        </div>
        <UiListMotion :tag="args.tag" class="m-0 flex list-none flex-col gap-sm p-0">
          <li v-for="item in items" :key="item.id" class="flex items-center justify-between rounded-md bg-surface-raised px-md py-ms text-ink text-body">
            {{ item.title }}
            <UiButton tone="plain" size="sm" @click="remove(item.id)">Remove<span class="sr-only"> {{ item.title }}</span></UiButton>
          </li>
        </UiListMotion>
        <p v-if="!items.length" class="text-ink-muted text-body">The shelf is empty.</p>
      </div>`,
  }),
} satisfies Meta<typeof UiListMotion>
export default meta
type Story = StoryObj<typeof meta>

/** Add, remove and shuffle: a leaving item fades while its room closes, a new one opens its room and fades in, items that only change places move there. */
export const Default: Story = {}

/** The list rendered as a plain `div` instead of the default `ul` of the story above. */
export const AsDiv: Story = {
  args: { tag: 'div' },
  render: args => ({
    components: { UiListMotion, UiButton },
    setup() {
      const items = ref(TITLES.slice(0, 3).map((title, id) => ({ id, title })))
      const remove = (id: number) => (items.value = items.value.filter(item => item.id !== id))
      return { args, items, remove }
    },
    template: `
      <UiListMotion :tag="args.tag" class="flex w-full max-w-sm flex-col gap-sm">
        <div v-for="item in items" :key="item.id" class="flex items-center justify-between rounded-md bg-surface-raised px-md text-ink text-body">
          {{ item.title }}
          <UiButton tone="plain" size="sm" @click="remove(item.id)">Remove<span class="sr-only"> {{ item.title }}</span></UiButton>
        </div>
      </UiListMotion>`,
  }),
}

export const Night: Story = { globals: { theme: 'night' } }
