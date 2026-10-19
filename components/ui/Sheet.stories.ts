import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import UiSheet from './Sheet.vue'
import UiButton from './Button.vue'
import UiField from './Field.vue'
import UiRow from './Row.vue'
import UiRowGroup from './RowGroup.vue'

// The sheet is a modal layer: while it is open the rest of the page is `inert` and focus is inside it. Every
// story therefore shows a button that opens it, and the ones that cover the viewport are drawn in an iframe in
// the docs page (`inline: false`), so the page around them is not locked.
const meta = {
  title: 'Base/Sheet',
  component: UiSheet,
  args: { open: false, title: 'Reading goal', testid: 'goalSheet', action: undefined, actionDisabled: false, cancel: true },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 600 } } },
  render: args => ({
    components: { UiSheet, UiButton },
    setup: () => ({ args, open: ref(false) }),
    template: `
      <div class="flex min-h-[560px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">Open sheet</UiButton>
        <UiSheet v-bind="args" v-model:open="open" @action="open = false">
          <p class="text-body text-ink-muted">How many books would you like to finish this year? You can change it any time.</p>
        </UiSheet>
      </div>`,
  }),
} satisfies Meta<typeof UiSheet>
export default meta
type Story = StoryObj<typeof meta>

/** Cancel on the left, the title in the middle, nothing on the right: a sheet that only informs or holds a list. */
export const Default: Story = {}

/** The sheet's one action sits at the right in the lamp colour; Cancel stays on the left. */
export const WithAction: Story = { args: { action: 'Save' } }

/** `actionDisabled`: the action is there but not yet available (the form is not valid). */
export const ActionDisabled: Story = { args: { action: 'Save', actionDisabled: true } }

/** `cancel: false` leaves Cancel out, for a sheet that is only read: its action closes it. Escape, the scrim and a swipe down still close it. */
export const WithoutCancel: Story = { args: { action: 'Done', cancel: false, title: 'What’s new' } }

/** A long title truncates between Cancel and the action instead of pushing them aside. */
export const LongTitle: Story = {
  args: { action: 'Save', title: 'A very long title that cannot possibly fit between the two buttons' },
}

/** The same layout in German, where Cancel (`ui.text.cancel`) and the action are longer; the title stays centred. */
export const German: Story = {
  args: { action: 'Speichern', title: 'Leseziel festlegen' },
  globals: { locale: 'de' },
}

/**
 * The body scrolls, the header stays. Once it has scrolled, a hairline under the header keeps the rows
 * from running into it.
 */
export const LongBody: Story = {
  args: { title: 'Choose a shelf', action: 'Done' },
  render: args => ({
    components: { UiSheet, UiButton, UiRow, UiRowGroup },
    setup: () => ({
      args,
      open: ref(false),
      shelves: ['Currently reading', 'Want to read', 'Finished 2025', 'Finished 2024', 'Favourites', 'Science fiction', 'Fantasy', 'Poetry', 'Essays', 'Travel', 'History', 'Biography', 'Cookbooks', 'Graphic novels', 'Lent out', 'Gifts'],
    }),
    template: `
      <div class="flex min-h-[560px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">Open sheet</UiButton>
        <UiSheet v-bind="args" v-model:open="open" @action="open = false">
          <UiRowGroup>
            <UiRow v-for="shelf in shelves" :key="shelf" as="button" :label="shelf" chevron :data-testid="'shelf-' + shelf" />
          </UiRowGroup>
        </UiSheet>
      </div>`,
  }),
}

/**
 * A field marked `data-autofocus` takes focus in the tap that opened the sheet (so iOS raises the keyboard
 * with it); without one, the panel itself does.
 */
export const WithAutofocusField: Story = {
  args: { title: 'Add a book', action: 'Add' },
  render: args => ({
    components: { UiSheet, UiButton, UiField },
    setup: () => ({ args, open: ref(false), isbn: ref('') }),
    template: `
      <div class="flex min-h-[560px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">Open sheet</UiButton>
        <UiSheet v-bind="args" :action-disabled="!isbn" v-model:open="open" @action="open = false">
          <UiField id="isbn" v-model="isbn" label="ISBN" hint="The 13 digits on the back, without dashes." inputmode="numeric" autocomplete="off" data-autofocus />
        </UiSheet>
      </div>`,
  }),
}

/** `restore`: the sheet is put back as it was when the member returns from a Book page: simply there, nothing rising in, its list scrolled where it was. */
export const Restored: Story = {
  args: { title: 'Choose a shelf', action: 'Done', restore: { scroll: 120 } },
  render: LongBody.render,
}

/**
 * A body that scrolls is a focusable, named region, so the keyboard can scroll it (WCAG 2.1.1; axe's
 * `scrollable-region-focusable`): Tab reaches it after the buttons of the title row.
 */
export const LongBodyIsFocusable: Story = {
  args: { title: 'Choose a shelf', action: 'Done' },
  render: args => ({
    components: { UiSheet, UiButton, UiRow, UiRowGroup },
    setup: () => ({
      args,
      open: ref(true),
      shelves: ['Currently reading', 'Want to read', 'Finished 2025', 'Finished 2024', 'Favourites', 'Science fiction', 'Fantasy', 'Poetry', 'Essays', 'Travel', 'History', 'Biography', 'Cookbooks', 'Graphic novels', 'Lent out', 'Gifts'],
    }),
    template: `
      <div class="flex min-h-[560px] items-center justify-center bg-surface">
        <UiSheet v-bind="args" v-model:open="open" @action="open = false">
          <p class="text-body text-ink-muted">Shelves are lists of books. Choose where this one goes.</p>
          <UiRowGroup class="mt-md">
            <UiRow v-for="shelf in shelves" :key="shelf" :label="shelf" />
          </UiRowGroup>
        </UiSheet>
      </div>`,
  }),
  play: async () => {
    const body = within(document.body)
    const region = await body.findByRole('region', { name: 'Choose a shelf' })
    await expect(region).toHaveAttribute('tabindex', '0')
    await expect(region.scrollHeight).toBeGreaterThan(region.clientHeight)
    for (let i = 0; i < 4 && document.activeElement !== region; i++) await userEvent.tab()
    await expect(region).toHaveFocus()
  },
}

/** Starts open, for looking at the sheet at rest. A body that fits is not a tab stop. */
export const Open: Story = {
  args: { action: 'Save' },
  play: async () => {
    const body = within(document.body)
    await waitFor(() => expect(body.getByRole('dialog', { name: 'Reading goal' })).toBeVisible())
    await expect(body.queryByRole('region')).toBeNull()
  },
  render: args => ({
    components: { UiSheet, UiButton },
    setup: () => ({ args, open: ref(true) }),
    template: `
      <div class="flex min-h-[560px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">Open sheet</UiButton>
        <UiSheet v-bind="args" v-model:open="open" @action="open = false">
          <p class="text-body text-ink-muted">How many books would you like to finish this year? You can change it any time.</p>
        </UiSheet>
      </div>`,
  }),
}

/** The dark theme, open: scrim, sheet surface and the lamp-coloured action. */
export const Night: Story = { args: { action: 'Save' }, globals: { theme: 'night' }, render: Open.render }
