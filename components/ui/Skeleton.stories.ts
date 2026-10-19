import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiSkeleton from './Skeleton.vue'

const meta = {
  title: 'Base/Skeleton',
  component: UiSkeleton,
  args: { wave: 0, as: 'span' },
  argTypes: { as: { control: 'inline-radio', options: ['span', 'div'] }, wave: { control: { type: 'range', min: 0, max: 1, step: 0.05 } } },
  render: args => ({
    components: { UiSkeleton },
    setup: () => ({ args }),
    template: '<UiSkeleton v-bind="args" class="h-4 w-48" />',
  }),
} satisfies Meta<typeof UiSkeleton>
export default meta
type Story = StoryObj<typeof meta>

/** A quiet block, sized by classes (`h-… w-…`). Always hidden from assistive tech. */
export const Default: Story = {}

/** `rounded-pill` for a face. */
export const Round: Story = {
  render: args => ({
    components: { UiSkeleton },
    setup: () => ({ args }),
    template: '<UiSkeleton v-bind="args" class="size-12 rounded-pill" />',
  }),
}

/** `wave` (0–1) is how far behind the first this one swells, so a row reads as one wave travelling across. */
export const Wave: Story = {
  render: () => ({
    components: { UiSkeleton },
    template: `
      <div class="flex gap-sm">
        <UiSkeleton v-for="n in 6" :key="n" :wave="(n - 1) / 6" class="h-12 w-12" />
      </div>`,
  }),
}

/** A loading row: a face and two lines, the wave running down. */
export const Row: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    components: { UiSkeleton },
    template: `
      <div class="flex w-full max-w-sm items-center gap-md" role="status" aria-label="Loading">
        <UiSkeleton :wave="0" class="size-12 shrink-0 rounded-pill" />
        <div class="flex flex-1 flex-col gap-sm">
          <UiSkeleton as="div" :wave="0.25" class="h-4 w-3/4" />
          <UiSkeleton as="div" :wave="0.5" class="h-3 w-1/2" />
        </div>
      </div>`,
  }),
}

export const Night: Story = { globals: { theme: 'night' }, render: Row.render, parameters: { layout: 'padded' } }
