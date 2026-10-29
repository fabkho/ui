/**
 * Focus for a layer that keeps it while it is open (UiMediaViewer) when a focus trap the base does not own sits
 * under it: an app's sheet with Reka UI's `FocusScope` (Bookretreats' member sheet: vaul). Only the top-most layer
 * keeps focus, and two layers never fight over it.
 *
 * Such a trap remembers the last focus inside it and pulls focus back when focus leaves for an element outside it
 * (a `focusout` with a `relatedTarget`) or lands outside it (`focusin`). A layer over it that moves focus to its own
 * control in one step is exactly that, and when the layer brings focus back in turn, the two bounce it between them:
 * every `focus()` runs the other's listener inside it, until WebKit's stack runs out („Maximum call stack size
 * exceeded“, Bookretreats' map, 2026-10-29; Chromium stops the nesting itself). So the mover (`createFocusMover`) lets go of the focus
 * outside first (`blur`: a `focusout` to nowhere, which such a trap leaves alone, as it does a tap on nothing) and
 * only then focuses the target. A move that sets off another move before it is done is dropped: whatever trap pulled
 * focus away in the middle keeps it, and the stack stays flat.
 *
 * And focus that lands in a newer layer (a dialog that was not there when the layer opened) is that layer's: it is
 * not brought back (`inNewerLayer`).
 */

/** What counts as a layer: any dialog, the base's (role, `aria-modal`) and a library's alike. */
const LAYER = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog[open]'

/** The layers on screen now; taken when a layer opens, so a later one can be told from the ones it covers. */
export function openLayers(root: Pick<ParentNode, 'querySelectorAll'> = document): Set<Element> {
  return new Set(root.querySelectorAll(LAYER))
}

/**
 * Whether `target` sits in a layer that opened after `own` did: a dialog that is neither `own` (nor inside it) nor
 * one of the layers `before` (those on screen when `own` opened).
 */
export function inNewerLayer(target: Node, own: Element | null | undefined, before: ReadonlySet<Element>): boolean {
  const element = (typeof (target as Element).closest === 'function' ? target : target.parentElement) as Element | null
  const layer = element?.closest(LAYER)
  if (!layer || layer === own || own?.contains(layer)) return false
  return !before.has(layer)
}

/**
 * A focus mover for one layer: `move(target, layer)` gives `target` focus after letting go of a focus outside
 * `layer`. Returns false when there was nothing to focus or when it was called from inside its own move (the move
 * that set it off stands; nothing nests). `doc` stands in for `document` in a test; it is read at each move, so a
 * mover can be made where there is no document (SSR).
 */
export function createFocusMover(doc?: Pick<Document, 'activeElement' | 'body'>) {
  let moving = false
  return function move(target: HTMLElement | null | undefined, layer: Pick<Node, 'contains'> | null | undefined): boolean {
    if (!target || moving) return false
    moving = true
    try {
      const { activeElement, body } = doc ?? document
      const active = activeElement as HTMLElement | null
      if (active && active !== body && active !== target && !layer?.contains(active)) active.blur?.()
      target.focus({ preventScroll: true })
      return true
    } finally {
      moving = false
    }
  }
}
