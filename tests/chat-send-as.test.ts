import { describe, expect, it } from 'vitest'
import {
  MENU_FULL_ROOM,
  actionsFold,
  isMarked,
  menuHints,
  menuMaxHeight,
  menuTarget,
  selectedOption,
  toneOf,
  type SendOption,
} from '../app/utils/chat/sendAs'

/**
 * The rules of the composer's split send button: the selected option, its tone, the menu's arrow keys, when
 * the chips fold with the keyboard, and the menu's room above a keyboard. Pure, so no browser is needed.
 */

const options: SendOption[] = [
  { value: 'me', label: 'Only me', icon: 'lock', tone: 'quiet' },
  { value: 'friends', label: 'Friends', icon: 'people' },
  { value: 'all', label: 'Everyone', icon: 'globe', tone: 'accent' },
]

describe('the selected option', () => {
  it('is the one whose value is held', () => {
    expect(selectedOption(options, 'all')?.label).toBe('Everyone')
  })
  it('is the first when no value is held yet, or the value is unknown', () => {
    expect(selectedOption(options, undefined)?.value).toBe('me')
    expect(selectedOption(options, 'nobody')?.value).toBe('me')
  })
  it('is nothing without options', () => {
    expect(selectedOption(undefined, 'me')).toBeUndefined()
    expect(selectedOption([], 'me')).toBeUndefined()
  })
})

describe('the tone', () => {
  it('is the option\'s own, one of neutral, accent, quiet', () => {
    expect(options.map(toneOf)).toEqual(['quiet', 'neutral', 'accent'])
  })
  it('is neutral for no tone, an unknown one, or no option', () => {
    expect(toneOf({ value: 'x', label: 'X', tone: 'loud' as never })).toBe('neutral')
    expect(toneOf(undefined)).toBe('neutral')
  })
  it('marks every option but the neutral one, which says its words on the tab', () => {
    expect(options.map(isMarked)).toEqual([true, false, true])
    expect(isMarked(undefined)).toBe(false)
  })
})

describe('the menu keys', () => {
  it('Down and Up move one and wrap', () => {
    expect(menuTarget('ArrowDown', 0, 3)).toBe(1)
    expect(menuTarget('ArrowDown', 2, 3)).toBe(0)
    expect(menuTarget('ArrowUp', 1, 3)).toBe(0)
    expect(menuTarget('ArrowUp', 0, 3)).toBe(2)
  })
  it('with the focus not on an item, Down goes to the first and Up to the last', () => {
    expect(menuTarget('ArrowDown', -1, 3)).toBe(0)
    expect(menuTarget('ArrowUp', -1, 3)).toBe(2)
  })
  it('Home and End go to the ends', () => {
    expect(menuTarget('Home', 2, 3)).toBe(0)
    expect(menuTarget('End', 0, 3)).toBe(2)
  })
  it('any other key, and an empty menu, are not the menu\'s', () => {
    expect(menuTarget('a', 0, 3)).toBeNull()
    expect(menuTarget('ArrowLeft', 0, 3)).toBeNull()
    expect(menuTarget('ArrowDown', 0, 0)).toBeNull()
  })
})

describe('the chips fold with the keyboard, not with the focus', () => {
  it('fold while the field has the focus and a keyboard is up', () => {
    expect(actionsFold({ focused: true, keyboard: true })).toBe(true)
  })
  it('stay open with the focus alone: no soft keyboard, or Android\'s back button closed it', () => {
    expect(actionsFold({ focused: true, keyboard: false })).toBe(false)
  })
  it('stay open with a keyboard and no focus, and with neither', () => {
    expect(actionsFold({ focused: false, keyboard: true })).toBe(false)
    expect(actionsFold({ focused: false, keyboard: false })).toBe(false)
  })
})

describe('the menu above the keyboard', () => {
  it('keeps its hint lines with the keyboard down, and on a tall screen with it up', () => {
    expect(menuHints(null)).toBe(true)
    expect(menuHints(508)).toBe(true)
    expect(menuHints(MENU_FULL_ROOM)).toBe(true)
  })
  it('drops them on a short screen with the keyboard up (360 × 640)', () => {
    expect(menuHints(349)).toBe(false)
  })
  it('is as tall as what is in view above the capsule, at least 120 px, no limit with the keyboard down', () => {
    expect(menuMaxHeight(null)).toBeNull()
    expect(menuMaxHeight(349)).toBe(349 - 76)
    expect(menuMaxHeight(100)).toBe(120)
  })
})
