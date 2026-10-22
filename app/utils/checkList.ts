/**
 * The pure parts of `UiCheckList`: which options a filter keeps, and the next selection when one is ticked.
 * Not auto-imported: import from `#layers/ui/app/utils/checkList`.
 */
export interface CheckOption {
  id: string
  label: string
  sublabel?: string
}

/** Lower case without accents, so "ida" finds "Ida" and "jose" finds "José". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase()
}

/** The options whose label or sublabel holds every word of `query` (an empty query keeps all), in their order. */
export function filterOptions<T extends CheckOption>(options: readonly T[], query: string): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return [...options]
  return options.filter((option) => {
    const text = fold(`${option.label} ${option.sublabel ?? ''}`)
    return words.every((word) => text.includes(word))
  })
}

/**
 * The selection after `id` is ticked or unticked. Ticking one past `max` changes nothing; the order is the
 * order the ids were ticked in. Ids that no option has any more (a member left meanwhile) are kept as they are.
 */
export function toggled(selected: readonly string[], id: string, on: boolean, max?: number): string[] {
  const has = selected.includes(id)
  if (on === has) return [...selected]
  if (!on) return selected.filter((one) => one !== id)
  if (max !== undefined && selected.length >= max) return [...selected]
  return [...selected, id]
}
