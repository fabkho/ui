import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, userEvent, within } from 'storybook/test'
import UiThreadRow from './ThreadRow.vue'
import UiRowGroup from './RowGroup.vue'
import { largeText, fitsTheScreen } from '../../../.storybook/large-text'
import { PEOPLE } from '../../../.storybook/chat-fixtures'

const FACES = PEOPLE.map(({ initials, label, photo }) => ({ initials, label, photo }))

const meta = {
  title: 'Chat/ThreadRow',
  component: UiThreadRow,
  args: {
    number: 7,
    label: 'Chapter 7',
    title: 'The dinner at Netherfield',
    count: 12,
    unread: 0,
    faces: FACES.slice(0, 2),
    facesLabel: 'Ida and Berit are here',
    veiled: false,
    testid: 'thread',
    onOpen: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          'One thread in a list of threads (a chapter of a buddy read, a section by pages): number in mono, title, faces (UiAvatarStack), comment count, an unread dot and a chevron. One button with ONE accessible name ("Chapter 7, The dinner at Netherfield, 12 comments, Ida and Berit are here"); the faces, the dot and the chevron are decoration. A `veiled` row (a thread the reader has not reached) draws number, count and faces only: its title is not drawn, not spoken and not in the DOM, and it has no unread dot. Counts never carry message text.',
      },
    },
  },
  decorators: [() => ({ components: { UiRowGroup }, template: '<div class="w-[min(100vw-2rem,380px)]"><UiRowGroup><story /></UiRowGroup></div>' })],
} satisfies Meta<typeof UiThreadRow>
export default meta
type Story = StoryObj<typeof meta>

/** Open: number, title, two faces, the count and a chevron. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByRole('button')).toHaveLength(1)
    await userEvent.click(canvas.getByRole('button', { name: 'Chapter 7, The dinner at Netherfield, 12 comments, Ida and Berit are here' }))
    await expect(args.onOpen).toHaveBeenCalledTimes(1)
  },
}

/** New comments: a dot, and "3 new" in the name. */
export const Unread: Story = { args: { unread: 3 } }

/** A single comment says "1 comment". */
export const OneComment: Story = { args: { count: 1, faces: FACES.slice(0, 1), facesLabel: 'Ida is here' } }

/** No faces yet, no comments: the row is the number, the title and a zero. */
export const Empty: Story = { args: { count: 0, faces: [], facesLabel: undefined } }

/** A long title stays on one line and is cut with "…" (the name still has it whole). */
export const LongTitle: Story = { args: { title: 'In which a very long title for a chapter will not fit on one line of a phone', faces: FACES.slice(0, 3) } }

/** More faces than fit: the stack ends in "+N". */
export const ManyFaces: Story = { args: { faces: FACES, facesLabel: 'Five readers are here' } }

/**
 * Veiled: a thread ahead of the reader. Number, count and faces only; an eye-off mark where the title was. The
 * title is nowhere (not in the DOM), no unread dot, and the name says "hidden".
 */
export const Veiled: Story = {
  args: { number: 9, label: 'Chapter 9', veiled: true, unread: 4, title: 'Mr Darcy proposes' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Chapter 9, 12 comments, hidden, Ida and Berit are here' })).toBeVisible()
    await expect(canvasElement.textContent).not.toContain('Darcy')
    await expect(canvas.queryByTestId('thread.unread')).toBeNull()
  },
}

/** Keyboard: Tab reaches the row, Enter and Space open it. */
export const OpenByKeyboard: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.tab()
    await expect(within(canvasElement).getByRole('button')).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    await expect(args.onOpen).toHaveBeenCalledTimes(2)
  },
}

/** A list of rows: open ones, one with news, and veiled ones faint at the end, as the buddy read's chapter list. */
export const List: Story = {
  render: (args) => ({
    components: { UiThreadRow },
    setup: () => ({ args, faces: FACES.slice(0, 2) }),
    template: `<div>
      <UiThreadRow number="1" label="Chapter 1" title="Opening" :count="8" :faces="faces" faces-label="Ida and Berit are here" />
      <UiThreadRow number="2" label="Chapter 2" title="The ball" :count="3" :unread="2" :faces="faces.slice(0, 1)" faces-label="Ida is here" />
      <UiThreadRow number="3" label="Chapter 3" veiled :count="12" :faces="faces" faces-label="Ida and Berit are here" />
      <UiThreadRow number="4" label="Chapter 4" veiled :count="0" />
    </div>`,
  }),
}

/** The row in German. */
export const German: Story = { args: { unread: 3, label: 'Kapitel 7', title: 'Das Essen auf Netherfield', facesLabel: 'Ida und Berit sind hier' }, globals: { locale: 'de' } }

/** Night: the faint veiled rows and the lamp dot must still read. */
export const Night: Story = { ...List, globals: { theme: 'night' } }

/** Title and trailing column side by side, never over each other, and nothing sticks out sideways. */
const holdsAtLargeText = async (canvasElement: HTMLElement) => {
  await expect(fitsTheScreen()).toBe(true)
  for (const row of canvasElement.querySelectorAll<HTMLElement>('.thread-row')) {
    await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth)
    await expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    const title = row.querySelector('[data-testid$=".title"]')!.getBoundingClientRect()
    const count = row.querySelector('[data-testid$=".count"]')!.getBoundingClientRect()
    await expect(title.right).toBeLessThanOrEqual(count.left + 0.5)
    // The faces make room: hidden at this width (the rule must win over the plain `.faces-box`).
    const faces = row.querySelector<HTMLElement>('.faces-box')
    if (faces) await expect(getComputedStyle(faces).display).toBe('none')
  }
}

/** Large text (200 %): the title takes two lines before it is cut, the faces make room, the count keeps its place. */
export const LargeText: Story = {
  decorators: [largeText],
  args: { title: 'In which a very long title for a chapter will not fit on one line of a phone', unread: 3 },
  render: List.render,
  play: async ({ canvasElement }) => {
    await holdsAtLargeText(canvasElement)
  },
}

export const LargeTextOne: Story = {
  decorators: [largeText],
  args: { title: 'In which a very long title for a chapter will not fit on one line of a phone', unread: 3 },
  play: async ({ canvasElement }) => {
    await holdsAtLargeText(canvasElement)
    const canvas = within(canvasElement)
    // Decoration only: the name is the same with the faces hidden.
    await expect(canvas.getByRole('button', { name: /Ida and Berit are here/ })).toBeVisible()
  },
}

export const LargeTextNight: Story = { ...LargeText, globals: { theme: 'night' } }
