/**
 * The chat's pure helpers: how a thread is cut into days and runs, how a day and a time
 * read. No Vue, no clock of its own (`now` comes in), no words of its own (they come in as
 * `DayWords`, the layer's `ui.text.chat`), so Vitest drives them in plain Node and a native
 * port can copy them rule for rule. Days are the device's calendar days.
 *
 * Not auto-imported (the names are too generic for a global): import them, from a component
 * of the layer relatively, from an app as `#ui/utils/chat/timeline`.
 */

/**
 * What a separator says besides a date. `locale` is a BCP 47 tag (`de`, `en-GB`): it spells the
 * weekdays and months through `Intl`, so the base has no month names of its own.
 */
export interface DayWords {
  today: string
  yesterday: string
  locale: string
}

const formats = new Map<string, Intl.DateTimeFormat>()

/** One `Intl.DateTimeFormat` per locale and shape: building one is the slow part. */
function format(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let found = formats.get(key)
  if (!found) {
    found = new Intl.DateTimeFormat(locale, options)
    formats.set(key, found)
  }
  return found
}

/** The local calendar day of `at`, `2026-03-04`: what a separator is drawn per. */
export function dayKey(at: Date): string {
  const m = String(at.getMonth() + 1).padStart(2, '0')
  const d = String(at.getDate()).padStart(2, '0')
  return `${at.getFullYear()}-${m}-${d}`
}

/** Whole calendar days from `at` to `now` (0 today, 1 yesterday), across a clock change too. */
export function daysAgo(at: Date, now: Date): number {
  const a = Date.UTC(at.getFullYear(), at.getMonth(), at.getDate())
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((b - a) / 86_400_000)
}

/**
 * A day separator: today, yesterday, the weekday within the last week ("Montag"), else the
 * date ("4. März"), with the year once it is not this one ("4. März 2025"). A day in the
 * future (a clock that is off) reads as the date.
 */
export function dayLabel(at: Date, now: Date, words: DayWords): string {
  const ago = daysAgo(at, now)
  if (ago === 0) return words.today
  if (ago === 1) return words.yesterday
  if (ago > 1 && ago < 7) return format(words.locale, { weekday: 'long' }).format(at)
  const withYear = at.getFullYear() !== now.getFullYear()
  return format(words.locale, { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) }).format(at)
}

/**
 * The time of a message. With a `locale` (`ui.text.chat.locale`) it is that language's clock through
 * `Intl` ("9:05" and "14:30" in German, "9:05 AM" in American English); without one, 24 hours with the
 * hour unpadded ("9:05", "14:30").
 */
export function clockTime(at: Date, locale?: string): string {
  if (locale) return format(locale, { hour: 'numeric', minute: '2-digit' }).format(at)
  return `${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`
}

/** A row of the thread: a day separator, or a message (whatever the screen keeps in it). */
export type TimelineRow<T> =
  | { type: 'day'; key: string; label: string }
  | { type: 'item'; key: string; item: T }

/**
 * The thread with a separator before the first message of each day. `items` come oldest
 * first; `keyOf` gives each its stable key (the client id, so an optimistic bubble keeps its
 * element when the stored row replaces it).
 */
export function timeline<T extends { createdAt: string }>(
  items: readonly T[],
  now: Date,
  keyOf: (item: T) => string,
  words: DayWords,
): TimelineRow<T>[] {
  const rows: TimelineRow<T>[] = []
  let day: string | null = null
  for (const item of items) {
    const at = new Date(item.createdAt)
    const key = dayKey(at)
    if (key !== day) {
      day = key
      rows.push({ type: 'day', key: `day-${key}`, label: dayLabel(at, now, words) })
    }
    rows.push({ type: 'item', key: keyOf(item), item })
  }
  return rows
}

/**
 * Whether the row at `index` is a message that sits in the same run as the message right
 * before it: both are messages (a day separator breaks a run) and `sameRun` says they are
 * from the same side. Which sides are the same is the app's rule (mine or hers; later the
 * sender), as is a kind that never joins a run (a system line). Such a row sits closer to the
 * one above it and carries no name; the one before it has no tail.
 */
export function follows<T>(
  rows: readonly TimelineRow<T>[],
  index: number,
  sameRun: (before: T, item: T) => boolean,
): boolean {
  const row = rows[index]
  const before = rows[index - 1]
  if (!row || row.type !== 'item' || !before || before.type !== 'item') return false
  return sameRun(before.item, row.item)
}

/** Whether the row at `index` is the last message of its run: the next one does not follow it. Only it has the tail. */
export function endsRun<T>(
  rows: readonly TimelineRow<T>[],
  index: number,
  sameRun: (before: T, item: T) => boolean,
): boolean {
  return !follows(rows, index + 1, sameRun)
}

/**
 * Messages oldest first, by the server's time. `createdAt` carries microseconds, which a
 * `Date` drops; equal milliseconds fall back to the string, which sorts right within one format.
 */
export function compareCreated(a: { createdAt: string }, b: { createdAt: string }): number {
  const diff = Date.parse(a.createdAt) - Date.parse(b.createdAt)
  if (diff !== 0) return diff
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
}
