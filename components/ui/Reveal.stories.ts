import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import UiReveal from './Reveal.vue'
import UiButton from './Button.vue'

const meta = {
  title: 'Base/Reveal',
  component: UiReveal,
  parameters: { layout: 'padded' },
  args: { show: false },
  render: args => ({
    components: { UiReveal, UiButton },
    setup() {
      const open = ref(args.show)
      watch(() => args.show, (value) => (open.value = value))
      return { open }
    },
    template: `
      <div class="flex w-full max-w-sm flex-col gap-md">
        <UiButton tone="secondary" size="md" @click="open = !open">{{ open ? 'Hide figures' : 'Show figures' }}</UiButton>
        <UiReveal :show="open">
          <div class="rounded-lg bg-surface-raised p-md text-ink">
            <p class="text-heading">212 pages</p>
            <p class="text-ink-muted text-body">You read 40 pages this week.</p>
          </div>
        </UiReveal>
        <p class="text-ink-muted text-body">What sits under it glides down instead of jumping.</p>
      </div>`,
  }),
} satisfies Meta<typeof UiReveal>
export default meta
type Story = StoryObj<typeof meta>

/** Nothing is there until it has something to say. The button toggles it: it opens its room and fades in over `standard`, closes over `exit`. */
export const Closed: Story = {}

/** Starts open. */
export const Open: Story = { args: { show: true } }

/** Content wider than the column scrolls inside the room (`min-w-0`) and never widens it. */
export const WideContent: Story = {
  args: { show: true },
  render: args => ({
    components: { UiReveal },
    setup: () => ({ args }),
    template: `
      <div class="w-full max-w-sm">
        <UiReveal :show="args.show">
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Reading log">
            <p class="w-[40rem] whitespace-nowrap text-ink text-body">Dune · Children of Dune · God Emperor of Dune · Heretics of Dune · Chapterhouse: Dune</p>
          </div>
        </UiReveal>
      </div>`,
  }),
}

export const Night: Story = { args: { show: true }, globals: { theme: 'night' } }
