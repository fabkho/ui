import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import UiSheet from './Sheet.vue'
import UiButton from './Button.vue'
import UiField from './Field.vue'
import UiRow from './Row.vue'
import UiRowGroup from './RowGroup.vue'
import { ForeignTrap } from '../../../.storybook/foreign-trap'
import { fitsTheScreen, largeText, textIsWhole } from '../../../.storybook/large-text'

// The sheet is a modal layer: while it is open the rest of the page is `inert` and focus is inside it. Every
// story therefore shows a button that opens it, and the ones that cover the viewport are drawn in an iframe in
// the docs page (`inline: false`), so the page around them is not locked.
const meta = {
  title: 'Base/Sheet',
  component: UiSheet,
  args: { open: false, title: 'Reading goal', testid: 'goalSheet', action: undefined, back: undefined, actionDisabled: false, cancel: true, deferFocus: true },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'A bottom sheet that rises over a scrim with a Cancel, a title and one action, closed by Cancel, the scrim, Escape, a swipe down or the system Back.' }, story: { inline: false, iframeHeight: 600 } } },
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

/** A long title wraps between Cancel and the action instead of pushing them aside. */
export const LongTitle: Story = {
  args: { action: 'Save', title: 'A very long title that cannot possibly fit between the two buttons' },
}

/**
 * The text at 200 % (WCAG 1.4.4): the title wraps onto more lines and is whole (no "…"), Cancel and the action stay
 * where they are, and nothing runs out of the screen.
 */
export const LargeText: Story = {
  args: { action: 'Save', title: 'Reading goal for the year' },
  decorators: [largeText],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const dialog = await dialogOf('Reading goal for the year')
    await waitFor(() => expect(textIsWhole(within(dialog).getByRole('heading', { name: 'Reading goal for the year' }))).toBe(true))
    await expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(within(dialog).getByRole('button', { name: 'Save' })).toBeVisible()
    await expect(fitsTheScreen()).toBe(true)
  },
}

/**
 * Every way to close the sheet is one tap (WCAG 2.5.7, no drag needed): Cancel, and the action of a sheet that has
 * no Cancel. The swipe down is only the faster way, and the scrim and Escape close it too.
 */
export const ClosesWithATap: Story = {
  args: { action: 'Save' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const opening = canvas.getByRole('button', { name: 'Open sheet' })
    await userEvent.click(opening)
    const dialog = await dialogOf('Reading goal')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull())
    await userEvent.click(opening)
    await dialogOf('Reading goal')
    await userEvent.click(within(document.body).getByTestId('goalSheet.scrim'))
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull())
  },
}

/** A sheet without Cancel (`cancel: false`) is closed by its action, in one tap. */
export const ActionClosesWithoutCancel: Story = {
  args: { action: 'Done', cancel: false, title: 'What’s new' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const dialog = await dialogOf('What’s new')
    await expect(within(dialog).queryByRole('button', { name: 'Cancel' })).toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull())
  },
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

/**
 * A sheet opened over a focus trap the base does not own (an app's own sheet with Reka UI's `FocusScope`, as in
 * `MediaViewer › OverAForeignTrap`): the layers below are `inert` before focus moves into the sheet, so the trap
 * never sees a `focusin` it could pull back (it pulled focus to its own element, which then went `inert`, and focus
 * ended on `<body>`, WebKit). Focus lands in the sheet, Tab stays in it, and closing gives focus back to the opener
 * once the trap is reachable again.
 */
export const OverAForeignTrap: Story = {
  args: { title: 'More', testid: 'moreSheet' },
  render: args => ({
    components: { UiSheet, UiButton, ForeignTrap },
    setup: () => ({ args, open: ref(false) }),
    template: `
      <div class="flex min-h-[560px] items-center justify-center bg-surface">
        <ForeignTrap>
          <UiButton tone="secondary" @click="open = true">Open sheet</UiButton>
        </ForeignTrap>
        <UiSheet v-bind="args" v-model:open="open">
          <UiButton tone="secondary">First action</UiButton>
        </UiSheet>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const trap = within(canvasElement).getByRole('dialog', { name: 'Member' })
    const opener = within(trap).getByRole('button', { name: 'Open sheet' })
    // Where focus has been, in order: it must never rest on <body> while the sheet is open.
    const seen: string[] = []
    const record = () => queueMicrotask(() => seen.push(document.activeElement === document.body ? 'body' : 'element'))
    document.addEventListener('focusout', record, true)
    // A tap focuses the opener inside the trap first, so the trap has a last focus to pull back to.
    opener.focus()
    await userEvent.click(opener)
    const dialog = await dialogOf('More')
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    await expect(document.activeElement).not.toBe(document.body)
    await expect(trap.closest('[inert]'), 'the trap under the sheet is out of reach').not.toBeNull()
    document.removeEventListener('focusout', record, true)
    await expect(seen.at(-1), 'focus is not left on <body>').not.toBe('body')
    // Tab stays in the sheet.
    await userEvent.tab()
    await expect(dialog.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(opener).toHaveFocus())
    await expect(trap.closest('[inert]'), 'the trap is reachable again').toBeNull()
    await waitFor(() => expect(within(document.body).queryByRole('dialog', { name: 'More' })).toBeNull())
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

/**
 * Tab (APG dialog) cycles inside the sheet: past its last control it comes round to the first, and Shift+Tab from
 * the first (or from the panel itself, which has focus before the field takes it) goes to the last. It never
 * leaves for the page behind or the browser's own controls.
 */
export const TabWrapsInside: Story = {
  args: { title: 'Add a book', action: 'Add', testid: 'addBook' },
  render: opener,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const dialog = await dialogOf('Add a book')
    const field = within(dialog).getByLabelText('ISBN')
    await waitFor(() => expect(field).toHaveFocus())
    const stops = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]'))
    await expect(stops.length).toBeGreaterThan(2)
    const first = stops[0]!
    const last = stops.at(-1)!
    // A full turn forwards: every control once, then the first again.
    last.focus()
    await userEvent.tab()
    await expect(first).toHaveFocus()
    for (const stop of stops.slice(1)) {
      await userEvent.tab()
      await expect(stop).toHaveFocus()
    }
    await userEvent.tab()
    await expect(first, 'forwards past the last control').toHaveFocus()
    await userEvent.tab({ shift: true })
    await expect(last, 'backwards from the first control').toHaveFocus()
    // From the panel itself (before the first control) Shift+Tab also lands on the last.
    dialog.focus()
    await userEvent.tab({ shift: true })
    await expect(last, 'backwards from the panel').toHaveFocus()
    await userEvent.keyboard('{Escape}')
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

/** `back`: a sheet of steps. The left word is the step back ("Back") and replaces Cancel; the title stays centred. */
export const WithBack: Story = { args: { action: 'Create', back: 'Back', title: 'New group' } }

/**
 * Two steps in one sheet: step 2 has `back` on the left (an event, not a body button), step 1 has Cancel. Back goes
 * to step 1 with a tap or the keyboard (Tab, Enter); the sheet stays open and Escape still closes it.
 */
export const BackGoesAStep: Story = {
  args: { action: 'Next', title: 'New group' },
  render: args => ({
    components: { UiSheet, UiButton },
    setup: () => ({ args, open: ref(false), step: ref(1) }),
    template: `
      <div class="flex min-h-[560px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="step = 1; open = true">Open sheet</UiButton>
        <UiSheet v-bind="args" v-model:open="open" :back="step === 2 ? 'Back' : undefined" :action="step === 1 ? 'Next' : 'Create'" @action="step === 1 ? (step = 2) : (open = false)" @back="step = 1">
          <p class="text-body text-ink-muted" :data-step="step">{{ step === 1 ? 'Step 1: who is in the group?' : 'Step 2: what is it called?' }}</p>
        </UiSheet>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const dialog = await dialogOf('New group')
    await expect(within(dialog).queryByRole('button', { name: 'Back' })).toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }))
    await expect(within(dialog).queryByRole('button', { name: 'Cancel' })).toBeNull()
    await expect(within(dialog).getByText('Step 2: what is it called?')).toBeVisible()
    const back = within(dialog).getByRole('button', { name: 'Back' })
    back.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(within(dialog).getByText('Step 1: who is in the group?')).toBeVisible())
    await expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(within(document.body).getByRole('dialog', { name: 'New group' })).toBeVisible()
  },
}

/** The left word in German ("Zurück"), longer than Back; the title stays centred. */
export const BackGerman: Story = { args: { action: 'Erstellen', back: 'Zurück', title: 'Neue Gruppe' }, globals: { locale: 'de' } }

/** `back`, open, in the night theme. */
export const BackNight: Story = { args: { action: 'Create', back: 'Back', title: 'New group' }, globals: { theme: 'night' }, render: Open.render }
