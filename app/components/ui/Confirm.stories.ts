import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import UiConfirm from './Confirm.vue'
import UiButton from './Button.vue'
import UiField from './Field.vue'
import UiSheet from './Sheet.vue'
import { useModalDepth, useModalShown } from '../../composables/useModalLayer'

// The dialog is a modal layer: while it is open the rest of the page is `inert` and focus is inside it. Every
// story therefore shows a button that opens it, and the stories are drawn in an iframe in the docs page
// (`inline: false`), so the page around them is not locked.
const meta = {
  title: 'Base/Confirm',
  component: UiConfirm,
  args: {
    open: false,
    title: 'Remove this book from your library?',
    text: 'Your notes and highlights for it are deleted too. This cannot be undone.',
    action: 'Remove book',
    testid: 'removeBook',
    busy: false,
    error: null,
    offline: false,
    tone: 'danger',
  },
  argTypes: { tone: { control: 'inline-radio', options: ['danger', 'primary'] } },
  parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 560 } } },
  render: args => ({
    components: { UiConfirm, UiButton },
    setup: () => ({ args, open: ref(false) }),
    template: `
      <div class="flex min-h-[520px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">Remove book</UiButton>
        <UiConfirm v-bind="args" v-model:open="open" @confirm="open = false" @alternative="open = false" />
      </div>`,
  }),
} satisfies Meta<typeof UiConfirm>
export default meta
type Story = StoryObj<typeof meta>

/** The default is the destructive one: the action in the danger tone, Cancel under it. */
export const Destructive: Story = {}

/** `tone: 'primary'`: an action that can be taken back (approving a request) is in ink, not red. */
export const PrimaryTone: Story = {
  args: {
    tone: 'primary',
    title: 'Approve this member?',
    text: 'They can see your shelves and join your reading groups straight away.',
    action: 'Approve',
    testid: 'approveMember',
  },
}

/** Without `text` the dialog is just the question and its two buttons. */
export const WithoutText: Story = { args: { text: undefined, title: 'Sign out of this device?', action: 'Sign out', testid: 'signOut' } }

/** `alternative`: a safe way out offered above the destructive action (here: sync first, then sign out). */
export const WithAlternative: Story = {
  args: {
    title: 'Sign out with changes waiting?',
    text: '3 changes have not been synced yet. If you sign out now, they are lost.',
    action: 'Sign out anyway',
    alternative: 'Sync first',
    testid: 'signOut',
  },
}

/**
 * `busy`: the action runs. The buttons are disabled and the dialog cannot be closed (not by Cancel, the scrim,
 * Escape or Back) until it is done.
 */
export const Busy: Story = { args: { busy: true } }

/** `error`: a refusal stays in the dialog with its reason, and the same button tries again. */
export const WithError: Story = { args: { error: 'The book could not be removed. Check your connection and try again.' } }

/** `offline`: the action stays, disabled, and says “Offline” instead of what it does; Cancel still closes. */
export const Offline: Story = { args: { offline: true } }

/** A long title and text wrap (the title balanced); the card scrolls when the screen is too short for it. */
export const LongText: Story = {
  args: {
    title: 'Remove “The Hitchhiker’s Guide to the Galaxy: The Complete Trilogy in Five Parts” from your library?',
    text: 'This also removes the 214 highlights, 38 notes and 12 bookmarks you made while reading it, your reading progress, and the book from every shelf and reading group it is on. Your friends keep their own copies and notes. Once removed, none of this can be restored, not even by us.',
  },
}

/** The same dialog in German, where the words are longer. */
export const German: Story = {
  args: {
    title: 'Dieses Buch aus deiner Bibliothek entfernen?',
    text: 'Deine Notizen und Markierungen dazu werden ebenfalls gelöscht. Das lässt sich nicht rückgängig machen.',
    action: 'Buch entfernen',
    alternative: 'Zuerst synchronisieren',
  },
  globals: { locale: 'de' },
}

/**
 * The default slot adds more under the sentence, such as a field for a reason. With the keyboard up the dialog
 * stands on it as a sheet does, and its card scrolls.
 */
export const WithField: Story = {
  args: { title: 'Ban this member?', text: 'They are signed out and cannot sign in again.', action: 'Ban member', testid: 'banMember' },
  render: args => ({
    components: { UiConfirm, UiButton, UiField },
    setup: () => ({ args, open: ref(false), reason: ref('') }),
    template: `
      <div class="flex min-h-[520px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">Ban member</UiButton>
        <UiConfirm v-bind="args" v-model:open="open" @confirm="open = false">
          <UiField id="banReason" v-model="reason" label="Reason (optional)" autocomplete="off" />
        </UiConfirm>
      </div>`,
  }),
}

/**
 * `useModalDepth` counts the layers on screen, `useModalShown` says whether there is any. A dialog over a sheet is 2,
 * where the boolean stays true throughout: an app that does something once for every layer (BetterReads dims the
 * installed app's status bar under the scrim) reads the count, one that does it once for all of them the boolean.
 */
export const OverASheet: Story = {
  parameters: { docs: { story: { inline: false, iframeHeight: 560 } } },
  render: args => ({
    components: { UiConfirm, UiSheet, UiButton },
    setup: () => ({ args, sheet: ref(false), confirm: ref(false), depth: useModalDepth(), shown: useModalShown() }),
    template: `
      <div class="flex min-h-[520px] flex-col items-center justify-center gap-md bg-surface">
        <UiButton tone="secondary" @click="sheet = true">Open sheet</UiButton>
        <p class="text-body text-ink-muted" data-testid="layerDepth" :data-shown="shown">Layers on screen: {{ depth }}</p>
        <UiSheet v-model:open="sheet" title="Reading goal" testid="goalSheet">
          <UiButton tone="secondary" @click="confirm = true">Remove goal</UiButton>
        </UiSheet>
        <UiConfirm v-bind="args" v-model:open="confirm" @confirm="confirm = false" />
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    const readout = within(canvasElement).getByTestId('layerDepth')
    expect(readout).toHaveTextContent('Layers on screen: 0')
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const sheet = await within(document.body).findByRole('dialog', { name: 'Reading goal' })
    await waitFor(() => expect(readout).toHaveTextContent('Layers on screen: 1'))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove goal' }))
    const dialog = await within(document.body).findByRole('alertdialog', { name: /Remove this book/ })
    await waitFor(() => expect(readout).toHaveTextContent('Layers on screen: 2'))
    expect(readout).toHaveAttribute('data-shown', 'true')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(readout).toHaveTextContent('Layers on screen: 1'))
    expect(readout).toHaveAttribute('data-shown', 'true')
  },
}

/**
 * A dialog over a sheet traps Tab in itself, not in the sheet (the sheet under it is inert): forwards and
 * backwards it cycles Remove book, Cancel; when it closes focus returns to the button in the sheet, and Tab then
 * cycles inside the sheet again.
 */
export const TabStaysInTheTopLayer: Story = {
  render: OverASheet.render,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open sheet' }))
    const sheet = await within(document.body).findByRole('dialog', { name: 'Reading goal' })
    const remove = within(sheet).getByRole('button', { name: 'Remove goal' })
    await waitFor(() => expect(sheet).toHaveFocus())
    await userEvent.click(remove)
    const dialog = await within(document.body).findByRole('alertdialog', { name: /Remove this book/ })
    await waitFor(() => expect(dialog).toHaveFocus())
    await expect(sheet.closest('[inert]'), 'the sheet under it is out of reach').not.toBeNull()
    const confirm = within(dialog).getByRole('button', { name: 'Remove book' })
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    // From the panel: Tab to the first, on to the last, past it to the first again.
    await userEvent.tab()
    await expect(confirm).toHaveFocus()
    await userEvent.tab()
    await expect(cancel).toHaveFocus()
    await userEvent.tab()
    await expect(confirm, 'forwards past the last control').toHaveFocus()
    await userEvent.tab({ shift: true })
    await expect(cancel, 'backwards from the first control').toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull())
    await waitFor(() => expect(remove).toHaveFocus())
    // Back in the sheet: its controls cycle, the page behind stays out of reach.
    const stops = Array.from(sheet.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]'))
    stops.at(-1)!.focus()
    await userEvent.tab()
    await expect(stops[0]).toHaveFocus()
    await userEvent.tab({ shift: true })
    await expect(stops.at(-1)).toHaveFocus()
    await userEvent.keyboard('{Escape}')
  },
}

/** Starts open, for looking at the dialog at rest. */
export const Open: Story = {
  play: async () => {
    await waitFor(() => expect(within(document.body).getByRole('alertdialog', { name: /Remove this book/ })).toBeVisible())
  },
  render: args => ({
    components: { UiConfirm, UiButton },
    setup: () => ({ args, open: ref(true) }),
    template: `
      <div class="flex min-h-[520px] items-center justify-center bg-surface">
        <UiButton tone="secondary" @click="open = true">Remove book</UiButton>
        <UiConfirm v-bind="args" v-model:open="open" @confirm="open = false" />
      </div>`,
  }),
}

/** The dark theme, open, with its error line and the alternative. */
export const Night: Story = {
  args: { error: 'The book could not be removed. Check your connection and try again.', alternative: 'Archive instead' },
  globals: { theme: 'night' },
  render: Open.render,
}
