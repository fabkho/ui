import { describe, expect, it } from 'vitest'
import {
  clockTime,
  compareCreated,
  dayKey,
  dayLabel,
  daysAgo,
  endsRun,
  follows,
  timeline,
  type DayWords,
} from '../utils/chat/timeline'

// The chat's pure rules: day separators, runs and times. Dates are built in the local
// time zone, as the helpers read them, so the suite holds wherever it runs. The words come
// in as the layer's `ui.text.chat` would bring them; the assertions are Bookretreats' own,
// moved with the code (`formatPhone` stays in that app: a German number's spelling is domain).
const words: DayWords = { today: 'Heute', yesterday: 'Gestern', locale: 'de' }
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min)
const iso = (date: Date) => date.toISOString()

describe('dayLabel', () => {
  const now = at(2026, 3, 11, 9, 30) // a Wednesday

  it('says Heute and Gestern by calendar day, not by 24 hours', () => {
    expect(dayLabel(at(2026, 3, 11, 0, 1), now, words)).toBe('Heute')
    expect(dayLabel(at(2026, 3, 10, 23, 59), now, words)).toBe('Gestern')
    expect(dayLabel(at(2026, 3, 10, 0, 0), now, words)).toBe('Gestern')
  })

  it('names the weekday within the last week', () => {
    expect(dayLabel(at(2026, 3, 9), now, words)).toBe('Montag')
    expect(dayLabel(at(2026, 3, 5), now, words)).toBe('Donnerstag')
  })

  it('writes the date from a week back, with the year once it is not this one', () => {
    expect(dayLabel(at(2026, 3, 4), now, words)).toBe('4. März')
    expect(dayLabel(at(2026, 1, 1), now, words)).toBe('1. Januar')
    expect(dayLabel(at(2025, 12, 24), now, words)).toBe('24. Dezember 2025')
  })

  it('reads a day ahead of the clock as its date', () => {
    expect(dayLabel(at(2026, 3, 12), now, words)).toBe('12. März')
  })

  it('counts calendar days across a clock change', () => {
    // Summer time starts on 29 March 2026 in Germany: that day has 23 hours.
    expect(daysAgo(at(2026, 3, 28, 12), at(2026, 3, 30, 12))).toBe(2)
    expect(daysAgo(at(2026, 10, 24, 23, 30), at(2026, 10, 25, 0, 30))).toBe(1)
  })
})

describe('clockTime', () => {
  it('is 24 hours, the hour without a leading zero', () => {
    expect(clockTime(at(2026, 3, 11, 9, 5))).toBe('9:05')
    expect(clockTime(at(2026, 3, 11, 14, 30))).toBe('14:30')
    expect(clockTime(at(2026, 3, 11, 0, 0))).toBe('0:00')
  })
})

describe('timeline', () => {
  const now = at(2026, 3, 11, 18)
  const message = (key: string, date: Date) => ({ key, createdAt: iso(date) })

  it('puts a separator before the first message of each day', () => {
    const rows = timeline(
      [
        message('a', at(2026, 3, 9, 20)),
        message('b', at(2026, 3, 10, 8)),
        message('c', at(2026, 3, 10, 9)),
        message('d', at(2026, 3, 11, 7)),
      ],
      now,
      (m) => m.key,
      words,
    )
    expect(rows.map((r) => (r.type === 'day' ? `[${r.label}]` : r.key))).toEqual([
      '[Montag]',
      'a',
      '[Gestern]',
      'b',
      'c',
      '[Heute]',
      'd',
    ])
  })

  it('keys separators by day, so they keep their element while the thread grows', () => {
    const rows = timeline([message('a', at(2026, 3, 11, 7))], now, (m) => m.key, words)
    expect(rows[0]).toEqual({ type: 'day', key: `day-${dayKey(at(2026, 3, 11))}`, label: 'Heute' })
  })

  it('is empty without messages', () => {
    expect(timeline([], now, () => 'x', words)).toEqual([])
  })
})

describe('compareCreated', () => {
  it('orders by time, and by the microseconds a Date drops', () => {
    const a = { createdAt: '2026-03-11T10:00:00.123401+00:00' }
    const b = { createdAt: '2026-03-11T10:00:00.123402+00:00' }
    const c = { createdAt: '2026-03-11T11:00:00+01:00' } // the same instant as 10:00 UTC
    expect(compareCreated(a, b)).toBeLessThan(0)
    expect(compareCreated(b, a)).toBeGreaterThan(0)
    expect(compareCreated(a, a)).toBe(0)
    expect(compareCreated({ createdAt: '2026-03-11T09:59:59Z' }, c)).toBeLessThan(0)
  })
})

// New in the base: the run rules the thread page kept inline (`follows`, `endsRun`).
describe('runs', () => {
  type Line = { createdAt: string; mine: boolean; system?: boolean }
  const now = at(2026, 3, 11, 18)
  const line = (date: Date, mine: boolean, system = false): Line => ({ createdAt: iso(date), mine, system })
  // The app's rule, as the Bookretreats page has it: the same side, and never a system line.
  const sameRun = (before: Line, item: Line) => !before.system && !item.system && before.mine === item.mine

  const rows = timeline(
    [
      line(at(2026, 3, 10, 8), true), // 1
      line(at(2026, 3, 10, 9), true), // 2
      line(at(2026, 3, 10, 9, 5), false), // 3
      line(at(2026, 3, 11, 7), false), // 5: a new day breaks the run
      line(at(2026, 3, 11, 7, 1), false, true), // 6: a system line joins nothing
      line(at(2026, 3, 11, 7, 2), false), // 7
    ],
    now,
    () => 'k',
    words,
  )
  // [day, 1, 2, 3, day, 5, 6, 7]
  const flags = rows.map((_, i) => [follows(rows, i, sameRun), endsRun(rows, i, sameRun)])

  it('has a message follow the one before it from the same side', () => {
    expect(flags.map(([f]) => f)).toEqual([false, false, true, false, false, false, false, false])
  })

  it('leaves the tail on the last message of a run only', () => {
    expect(flags.map(([, e]) => e)).toEqual([true, false, true, true, true, true, true, true])
  })

  it('knows no row past the ends', () => {
    expect(follows(rows, 0, sameRun)).toBe(false)
    expect(follows(rows, 99, sameRun)).toBe(false)
    expect(endsRun(rows, rows.length - 1, sameRun)).toBe(true)
  })
})

describe('dayLabel in another language', () => {
  it('spells weekdays and months in the locale it is given, the words as they come', () => {
    const en: DayWords = { today: 'Today', yesterday: 'Yesterday', locale: 'en-GB' }
    const now = at(2026, 3, 11, 9, 30)
    expect(dayLabel(at(2026, 3, 11), now, en)).toBe('Today')
    expect(dayLabel(at(2026, 3, 9), now, en)).toBe('Monday')
    expect(dayLabel(at(2026, 3, 4), now, en)).toBe('4 March')
    expect(dayLabel(at(2025, 12, 24), now, en)).toBe('24 December 2025')
  })
})
