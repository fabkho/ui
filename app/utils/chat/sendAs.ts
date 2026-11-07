/**
 * The rules behind the composer's split send button (UiComposer, `sendOptions`): which option is the current
 * one, what the button looks like for it, where the arrow keys go in the menu, when the chips fold with the
 * keyboard, and how much of the menu fits above the field with the keyboard up. No DOM here, so Vitest can run
 * all of it (tests/chat-send-as.test.ts).
 */
import type { IconName } from '../../components/ui/Icon.vue'

/** How the button looks for an option (CSS hooks in UiComposer: `data-tone`, `--composer-tone-<tone>-bg` / `-fg`). */
export type SendTone = 'neutral' | 'accent' | 'quiet'
export const SEND_TONES: readonly SendTone[] = ['neutral', 'accent', 'quiet']

/** One way of sending: an audience, say ("Only me", "Friends", "Everyone"). */
export interface SendOption {
  /** What `v-model:sendAs` holds while this one is selected. */
  value: string
  /** Its words: in the menu, and on the button's tab when the option is marked (any tone but `neutral`). */
  label: string
  /** A line under the label in the menu; dropped where the keyboard leaves the menu little room. */
  hint?: string
  /** One of the base's glyphs, on the tab and in the menu. */
  icon?: IconName
  /** The cue on the send button while this one is selected. Default: `neutral` (the usual ink button). */
  tone?: SendTone
  /** Shown in the menu, but cannot be chosen (its hint says why). */
  disabled?: boolean
}

/** The option that is selected: the one whose `value` it is, else the first (an app that holds no value yet). */
export function selectedOption(options: readonly SendOption[] | undefined, value: string | undefined): SendOption | undefined {
  if (!options?.length) return undefined
  return options.find(option => option.value === value) ?? options[0]
}

/** The tone of an option; one the base does not know draws as `neutral`. */
export function toneOf(option: SendOption | undefined): SendTone {
  return SEND_TONES.find(tone => tone === option?.tone) ?? 'neutral'
}

/** A marked option says its words on the button's tab, so the audience is read, not only seen (`neutral` is the unmarked one). */
export function isMarked(option: SendOption | undefined): boolean {
  return toneOf(option) !== 'neutral'
}

/** Where the arrow keys go in a menu of `count` items from item `at` (APG "Menu button"): up and down wrap, Home and End go to the ends. Null: not a menu key. */
export function menuTarget(key: string, at: number, count: number): number | null {
  if (count <= 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === 'ArrowDown') return at < 0 ? 0 : (at + 1) % count
  if (key === 'ArrowUp') return at < 0 ? count - 1 : (at - 1 + count) % count
  return null
}

/**
 * Whether the row of chips over the field folds away: only while the field has the focus AND a soft keyboard is
 * up (the room is wanted then), never with the focus alone: Android's back button closes the keyboard and leaves
 * the focus, and a desktop has no keyboard to make room for. (A compact bar's note keeps the row open itself: UiComposer.)
 */
export function actionsFold(state: { focused: boolean; keyboard: boolean }): boolean {
  return state.focused && state.keyboard
}

/** The visible height (px) under which the menu drops its hint lines: a short screen with the keyboard up (360 × 640). */
export const MENU_FULL_ROOM = 420
/** What the capsule, the gap above it and a little air at the top take of the visible height (px). */
const MENU_CHROME = 52 + 8 + 16

/** `room`: the height of what is in view with the keyboard up, null with it down (useKeyboardViewport). */
export function menuHints(room: number | null): boolean {
  return room === null || room >= MENU_FULL_ROOM
}

/** The tallest the menu may be, so it opens above the field and below the top of what is in view (null: no limit but the page's). */
export function menuMaxHeight(room: number | null): number | null {
  return room === null ? null : Math.max(120, Math.round(room - MENU_CHROME))
}
