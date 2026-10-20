/**
 * Tab inside a modal layer (WAI-ARIA dialog pattern: Tab and Shift+Tab cycle
 * through the layer's controls and never leave it). Everything outside the
 * layer is `inert` (useModalLayer.ts), so the browser has nowhere to send Tab
 * after the last control but its own chrome; `wrapTab` catches that one
 * moment and moves focus to the other end instead. Every other Tab is left to
 * the browser, so the order, roving tabindex and radio groups stay its own.
 *
 * No library: `focus-trap` (+ `tabbable`) and Reka UI's FocusScope redo what
 * `inert` already does, and fight a second layer over the same focus; see the
 * README ("Dependencies").
 */

const TABBABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

function isVisible(el: HTMLElement): boolean {
  if (typeof el.checkVisibility === 'function') return el.checkVisibility({ visibilityProperty: true } as CheckVisibilityOptions)
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
}

function isTabbable(el: HTMLElement): boolean {
  if (el.tabIndex < 0) return false
  if ((el as HTMLButtonElement).disabled || el.closest('[inert]')) return false
  if (el.closest('fieldset:disabled') && !el.closest('fieldset:disabled > legend')) return false
  return isVisible(el)
}

/** A radio group is one stop: the checked one, or the first when none is checked. */
function oneRadioPerGroup(list: HTMLElement[]): HTMLElement[] {
  const seen = new Map<string, HTMLElement>()
  for (const el of list) {
    if (!(el instanceof HTMLInputElement) || el.type !== 'radio' || !el.name) continue
    const key = `${el.form?.id ?? ''}\u0000${el.name}`
    const kept = seen.get(key)
    if (!kept || (el.checked && !(kept as HTMLInputElement).checked)) seen.set(key, el)
  }
  return list.filter((el) => !(el instanceof HTMLInputElement && el.type === 'radio' && el.name) || seen.get(`${el.form?.id ?? ''}\u0000${el.name}`) === el)
}

/** What Tab can reach inside the roots, in the order of the page. */
export function tabbablesIn(roots: (HTMLElement | null | undefined)[]): HTMLElement[] {
  const found: HTMLElement[] = []
  for (const root of roots) {
    if (!root) continue
    if (root.matches(TABBABLE)) found.push(root)
    found.push(...root.querySelectorAll<HTMLElement>(TABBABLE))
  }
  return oneRadioPerGroup(found.filter(isTabbable))
}

/**
 * Where a Tab (or Shift+Tab) from `active` would fall off the layer, the
 * control at the other end; otherwise null (the browser moves on by itself).
 * `active` that is not itself a stop (the panel's own `tabindex="-1"`, or a
 * heading focused by script) counts as sitting before its first control, and
 * so Shift+Tab from it wraps.
 */
export function wrapTarget(
  list: HTMLElement[],
  active: Element | null,
  backwards: boolean,
): HTMLElement | null {
  if (!list.length) return null
  const first = list[0]!
  const last = list.at(-1)!
  const at = active ? list.indexOf(active as HTMLElement) : -1
  if (at !== -1) return backwards ? (at === 0 ? last : null) : at === list.length - 1 ? first : null
  if (!active || active === document.body) return backwards ? last : first
  // Not a stop: the page's order decides (ancestors and descendants count, as in sequential navigation).
  const where = (el: HTMLElement) => active.compareDocumentPosition(el)
  if (backwards) return list.some((el) => where(el) & Node.DOCUMENT_POSITION_PRECEDING) ? null : last
  return list.some((el) => where(el) & Node.DOCUMENT_POSITION_FOLLOWING) ? null : first
}

/**
 * Handles a `keydown`: when it is a Tab that would leave the roots, keeps it
 * in and returns true. Leaves a handled event (`defaultPrevented`: a layer
 * above, a widget's own Tab) and every Tab with a modifier other than Shift
 * alone.
 */
export function wrapTab(event: KeyboardEvent, roots: (HTMLElement | null | undefined)[]): boolean {
  if (event.key !== 'Tab' || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return false
  const target = wrapTarget(tabbablesIn(roots), document.activeElement, event.shiftKey)
  if (!target) return false
  event.preventDefault()
  target.focus({ preventScroll: true })
  return true
}
