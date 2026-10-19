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
  args: { open: false, title: 'Reading goal', testid: 'goalSheet', action: undefined, actionDisabled: false, cancel: true, deferFocus: true },
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

/** The page's opener and a sheet with a form in it: for the focus stories, which open it with the keyboard's own moves. */
const opener = (args: object) => ({
  components: { UiSheet, UiButton, UiField },
  setup: () => ({ args, open: ref(false), isbn: ref('') }),
  template: `
    <div class="flex min-h-[560px] items-center justify-center bg-surface">
      <UiButton tone="secondary" data-testid="opener" @click="open = true">Open sheet</UiButton>
      <UiSheet v-bind="args" v-model:open="open" @action="open = false">
        <UiField id="isbn" v-model="isbn" label="ISBN" hint="The 13 digits on the back, without dashes." inputmode="numeric" autocomplete="off" data-autofocus />
      </UiSheet>
    </div>`,
})

/** The dialog and what is in it, from `document.body` (the sheet is teleported there). */
const dialogOf = async (name: string) => within(document.body).findByRole('dialog', { name })

/**
 * Focus (APG dialog): a sheet opened from its button takes focus into itself, onto its `data-autofocus` field
 * once it has finished rising (`data-moving` cleared; on iOS in the tap itself, utils/sheetFocus.ts), and gives
 * it back to the button when it closes.
 */
export const FocusMovesInAndBack: Story = {
  args: { title: 'Add a book', action: 'Add', testid: 'addBook' },
  render: opener,
  play: async ({ canvasElement }) => {
    const opening = within(canvasElement).getByRole('button', { name: 'Open sheet' })
    // Every focus move inside the sheet, with whether the panel was still moving at that moment.
    const log: { target: string; moving: boolean }[] = []
    const record = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      const panel = target.closest('[role=dialog]')
      if (panel) log.push({ target: target.id || target.getAttribute('role') || target.tagName, moving: panel.hasAttribute('data-moving') })
    }
    document.addEventListener('focusin', record, true)
    await userEvent.click(opening)
    const dialog = await dialogOf('Add a book')
    const field = within(dialog).getByLabelText('ISBN')
    await waitFor(() => expect(field).toHaveFocus())
    document.removeEventListener('focusin', record, true)
    await expect(dialog).not.toHaveAttribute('data-moving')
    // The panel had focus first (the trap, VoiceOver); the field took it after `data-moving` cleared, not mid-rise.
    const panelAt = log.findIndex(entry => entry.target === 'dialog')
    const fieldAt = log.findIndex(entry => entry.target === 'isbn')
    await expect(panelAt, 'the panel had focus first').toBeGreaterThanOrEqual(0)
    await expect(fieldAt, 'then the field').toBeGreaterThan(panelAt)
    await expect(log[fieldAt]!.moving, 'the field took focus after the rise').toBe(false)
    await expect(opening.closest('[inert]'), 'the page behind it is out of reach').not.toBeNull()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(opening).toHaveFocus())
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull())
  },
}

/** Reduce Motion: nothing rises, so there is nothing to wait for and the field has focus at once. */
export const FocusAtOnceWithReducedMotion: Story = {
  ...FocusMovesInAndBack,
  globals: { motion: 'reduce' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const dialog = await dialogOf('Add a book')
    await waitFor(() => expect(within(dialog).getByLabelText('ISBN')).toHaveFocus())
  },
}

/** `deferFocus: false`: the field takes focus in the opening tap, as on iOS, which raises the keyboard only for that. */
export const FocusInTheTap: Story = {
  ...FocusMovesInAndBack,
  args: { title: 'Add a book', action: 'Add', testid: 'addBook', deferFocus: false },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const dialog = await dialogOf('Add a book')
    await waitFor(() => expect(within(dialog).getByLabelText('ISBN')).toHaveFocus())
    // Still rising: the field did not wait for the sheet.
    await expect(dialog).toHaveAttribute('data-moving')
  },
}

/** A sheet without a field takes focus on the panel itself (named by its title, so a screen reader says what opened). */
export const FocusOnThePanel: Story = {
  args: { title: 'Reading goal', action: 'Save', testid: 'goalSheet' },
  render: args => ({
    components: { UiSheet, UiButton },
    setup: () => ({ args, open: ref(false) }),
    template: `
      <div class="flex min-h-[560px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">Open sheet</UiButton>
        <UiSheet v-bind="args" v-model:open="open" @action="open = false">
          <p class="text-body text-ink-muted">How many books would you like to finish this year?</p>
        </UiSheet>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const dialog = await dialogOf('Reading goal')
    await waitFor(() => expect(dialog).toHaveFocus())
  },
}

/**
 * Tab and Shift+Tab move through the sheet's own controls and never reach the page behind it (`inert`): past the
 * last one focus leaves the document for the browser's own controls, as with a native modal dialog, and comes
 * back at the first. (A wrap inside the sheet is not done: a gap against the APG dialog pattern, named in the README's `UiSheet` row.)
 */
export const TabStaysInside: Story = {
  ...FocusMovesInAndBack,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const dialog = await dialogOf('Add a book')
    await waitFor(() => expect(within(dialog).getByLabelText('ISBN')).toHaveFocus())
    const stays = () => dialog.contains(document.activeElement) || !canvasElement.contains(document.activeElement)
    const visited = new Set<Element | null>()
    for (let i = 0; i < 8; i++) {
      await userEvent.tab()
      visited.add(document.activeElement)
      await expect(stays(), `Tab ${i + 1}`).toBe(true)
    }
    for (let i = 0; i < 8; i++) {
      await userEvent.tab({ shift: true })
      visited.add(document.activeElement)
      await expect(stays(), `Shift+Tab ${i + 1}`).toBe(true)
    }
    // Cancel, the field and the action were all reached from the keyboard.
    for (const name of [/Cancel/, /Add/]) await expect([...visited].some(el => el instanceof HTMLElement && el.textContent?.match(name))).toBe(true)
  },
}

/** Cancel, the scrim and Escape all close it, and focus goes back to the button that opened it. */
export const CancelGivesFocusBack: Story = {
  ...FocusMovesInAndBack,
  play: async ({ canvasElement }) => {
    const opening = within(canvasElement).getByRole('button', { name: 'Open sheet' })
    await userEvent.click(opening)
    const dialog = await dialogOf('Add a book')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(opening).toHaveFocus())
  },
}

/** The system Back (Android's gesture, the browser's) closes the sheet instead of leaving the page. */
export const BackCloses: Story = {
  ...FocusMovesInAndBack,
  play: async ({ canvasElement }) => {
    const opening = within(canvasElement).getByRole('button', { name: 'Open sheet' })
    await userEvent.click(opening)
    await dialogOf('Add a book')
    history.back()
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(opening).toHaveFocus())
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
