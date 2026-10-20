import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiButton from './Button.vue'
import UiEmptyState from './EmptyState.vue'

const meta = {
  title: 'Base/EmptyState',
  component: UiEmptyState,
  parameters: { layout: 'padded' },
  args: {
    screen: 'library',
    title: 'Nothing on the shelf yet',
    text: 'Books you add will appear here, ready for the next quiet evening.',
    compact: false,
  },
  render: args => ({
    components: { UiEmptyState },
    setup: () => ({ args }),
    template: '<div class="mx-auto w-(--size-menu)"><UiEmptyState v-bind="args" /></div>',
  }),
} satisfies Meta<typeof UiEmptyState>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The default slot holds the one way forward. */
export const WithAction: Story = {
  render: args => ({
    components: { UiEmptyState, UiButton },
    setup: () => ({ args }),
    template: `
      <div class="mx-auto w-(--size-menu)">
        <UiEmptyState v-bind="args"><UiButton>Add your first book</UiButton></UiEmptyState>
      </div>`,
  }),
}

/** For a screen that needs room above it: the lamp is drawn at half its height (and hidden on a short viewport). */
export const Compact: Story = { args: { compact: true } }

/** The `art` slot takes an app's own illustration instead of the lamp. */
export const CustomArt: Story = {
  render: args => ({
    components: { UiEmptyState, UiButton },
    setup: () => ({ args }),
    template: `
      <div class="mx-auto w-(--size-menu)">
        <UiEmptyState v-bind="args">
          <template #art>
            <svg viewBox="0 0 120 80" class="h-(--size-empty-art) max-h-32 text-accent-ink" fill="none" stroke="currentColor" aria-hidden="true">
              <circle cx="60" cy="40" r="28" /><path d="M32 40h56M60 12c-14 16-14 40 0 56M60 12c14 16 14 40 0 56" />
            </svg>
          </template>
          <UiButton tone="secondary">Browse retreats</UiButton>
        </UiEmptyState>
      </div>`,
  }),
}

/** German copy runs longer; the title and sentence wrap inside the column. */
export const LongText: Story = {
  args: {
    title: 'Noch keine Buchungen für dieses Wochenende vorhanden',
    text: 'Sobald jemand einen Platz für dein Retreat reserviert, erscheint die Buchung hier mit allen Angaben zur Anreise und zum Zimmer.',
  },
}

export const Night: Story = { globals: { theme: 'night' } }
