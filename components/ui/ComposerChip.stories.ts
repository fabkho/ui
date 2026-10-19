import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { fn } from 'storybook/test'
import UiComposerChip from './ComposerChip.vue'
import UiIcon from './Icon.vue'

// A glass chip floats over the composer, so the stories sit it on a surface where the glass shows.
const meta = {
  title: 'Chat/ComposerChip',
  component: UiComposerChip,
  args: { label: undefined, icon: undefined, mono: false, onClick: fn() },
  render: args => ({
    components: { UiComposerChip },
    setup: () => ({ args }),
    template: '<div class="rounded-md bg-linear-to-br from-accent-soft to-surface-raised p-xl"><UiComposerChip v-bind="args">Share number</UiComposerChip></div>',
  }),
} satisfies Meta<typeof UiComposerChip>
export default meta
type Story = StoryObj<typeof meta>

/** Named by its visible words. */
export const Default: Story = {}

/** `icon`: one of the base's glyphs before the words ("Photo"). */
export const WithIcon: Story = {
  args: { icon: 'camera' },
  render: args => ({
    components: { UiComposerChip },
    setup: () => ({ args }),
    template: '<div class="rounded-md bg-linear-to-br from-accent-soft to-surface-raised p-xl"><UiComposerChip v-bind="args">Photo</UiComposerChip></div>',
  }),
}

/** `mono`: the words in the mono label type, the "GIF" mark. */
export const Mono: Story = {
  args: { mono: true },
  render: args => ({
    components: { UiComposerChip },
    setup: () => ({ args }),
    template: '<div class="rounded-md bg-linear-to-br from-accent-soft to-surface-raised p-xl"><UiComposerChip v-bind="args">GIF</UiComposerChip></div>',
  }),
}

/**
 * `label`: a longer name for a screen reader. It has to contain the visible words (WCAG 2.5.3, Label in
 * Name): a voice-control user says what they see. The chip's words are hidden from assistive technology
 * then, and the label names it.
 */
export const WithLongerLabel: Story = {
  args: { icon: 'camera', label: 'Send a photo from your gallery' },
  render: args => ({
    components: { UiComposerChip },
    setup: () => ({ args }),
    template: '<div class="rounded-md bg-linear-to-br from-accent-soft to-surface-raised p-xl"><UiComposerChip v-bind="args">photo</UiComposerChip></div>',
  }),
}

/** The `icon` slot takes any other mark. */
export const IconSlot: Story = {
  render: () => ({
    components: { UiComposerChip, UiIcon },
    template: `
      <div class="rounded-md bg-linear-to-br from-accent-soft to-surface-raised p-xl">
        <UiComposerChip>
          <template #icon><UiIcon name="heart" :size="16" class="text-accent-ink" /></template>
          Send a like
        </UiComposerChip>
      </div>`,
  }),
}

/** Chips in a row, as the composer lays them: the app's own beside "Photo" and "GIF". */
export const InARow: Story = {
  render: () => ({
    components: { UiComposerChip },
    template: `
      <div class="flex gap-sm rounded-md bg-linear-to-br from-accent-soft to-surface-raised p-xl">
        <UiComposerChip icon="camera" label="Send a photo from your gallery">Photo</UiComposerChip>
        <UiComposerChip mono label="Find and send a GIF">GIF</UiComposerChip>
        <UiComposerChip>Share number</UiComposerChip>
      </div>`,
  }),
}

export const Night: Story = { globals: { theme: 'night' } }
