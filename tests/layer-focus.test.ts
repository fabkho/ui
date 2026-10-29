import { describe, expect, it, vi } from 'vitest'
import { createFocusMover, inNewerLayer, openLayers } from '../app/utils/layerFocus'

/**
 * Focus for a layer over a focus trap it does not own (utils/layerFocus.ts, UiMediaViewer). Plain Node: the
 * elements are stand-ins with just what the rules read. The real browser case (a Reka-style trap under the viewer)
 * is the story `Base/MediaViewer › Over A Foreign Trap`.
 */

type Fake = { name: string; closest: (selector: string) => Fake | null; contains: (node: unknown) => boolean }

/** A stand-in element: inside `layer` (or a layer itself), with its own descendants. */
function fake(name: string, layer: Fake | null = null, children: Fake[] = []): Fake {
  const self: Fake = {
    name,
    closest: () => layer ?? null,
    contains: (node) => node === self || children.some((child) => child === node || child.contains(node)),
  }
  return self
}

describe('moving focus into a layer', () => {
  function setup() {
    const order: string[] = []
    const body = { name: 'body' }
    const doc = { activeElement: null as unknown, body }
    const outside = { blur: vi.fn(() => order.push('blur outside')) }
    const target = { focus: vi.fn(() => order.push('focus target')) }
    const inside = { blur: vi.fn() }
    const layer = { contains: (node: unknown) => node === target || node === inside }
    const move = createFocusMover(doc as unknown as Document)
    return { order, doc, body, outside, target, inside, layer, move }
  }

  it('lets go of the focus outside the layer first, then focuses the target: a trap under it sees focus go nowhere', () => {
    const { order, doc, outside, target, layer, move } = setup()
    doc.activeElement = outside
    expect(move(target as unknown as HTMLElement, layer as unknown as Element)).toBe(true)
    expect(order).toEqual(['blur outside', 'focus target'])
    expect(target.focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('blurs nothing when focus is already in the layer or nowhere (the body)', () => {
    const { doc, body, inside, target, layer, move } = setup()
    doc.activeElement = inside
    move(target as unknown as HTMLElement, layer as unknown as Element)
    expect(inside.blur).not.toHaveBeenCalled()
    doc.activeElement = body
    expect(move(target as unknown as HTMLElement, layer as unknown as Element)).toBe(true)
    expect(target.focus).toHaveBeenCalledTimes(2)
  })

  it('does nothing without a target', () => {
    const { move, layer } = setup()
    expect(move(null, layer as unknown as Element)).toBe(false)
  })

  it('never nests: a trap that pulls focus back inside the move does not start another move, so the stack stays flat', () => {
    const { doc, outside, layer, move } = setup()
    doc.activeElement = outside
    let calls = 0
    const nested: boolean[] = []
    // A hostile trap: every focus on the target pulls focus away, and the layer's listener tries to take it back.
    const target = {
      focus: vi.fn(() => {
        calls++
        if (calls > 50) throw new RangeError('Maximum call stack size exceeded.')
        nested.push(move(target as unknown as HTMLElement, layer as unknown as Element))
      }),
    }
    expect(move(target as unknown as HTMLElement, layer as unknown as Element)).toBe(true)
    expect(target.focus).toHaveBeenCalledTimes(1)
    expect(nested).toEqual([false])
    // The guard is per move: the next one goes through again.
    expect(move(target as unknown as HTMLElement, layer as unknown as Element)).toBe(true)
  })
})

describe('a newer layer', () => {
  const sheet = fake('sheet (under the viewer)')
  const viewer = fake('viewer')
  const confirm = fake('confirm (opened over the viewer)')
  const before = new Set<Element>([sheet as unknown as Element])

  it('is a dialog that was not on screen when the layer opened', () => {
    expect(inNewerLayer(fake('button', confirm) as unknown as Node, viewer as unknown as Element, before)).toBe(true)
  })

  it('is not the layer itself, nor a layer it covers, nor plain page', () => {
    expect(inNewerLayer(fake('close', viewer) as unknown as Node, viewer as unknown as Element, before)).toBe(false)
    expect(inNewerLayer(fake('photo', sheet) as unknown as Node, viewer as unknown as Element, before)).toBe(false)
    expect(inNewerLayer(fake('page') as unknown as Node, viewer as unknown as Element, before)).toBe(false)
  })

  it('reads a text node through its element', () => {
    const text = { parentElement: fake('label', confirm) }
    expect(inNewerLayer(text as unknown as Node, viewer as unknown as Element, before)).toBe(true)
  })

  it('takes the layers on screen from the document', () => {
    const root = { querySelectorAll: vi.fn(() => [sheet, viewer]) }
    expect(openLayers(root as unknown as ParentNode)).toEqual(new Set([sheet, viewer]))
    expect(root.querySelectorAll.mock.calls[0]?.[0]).toContain('[role="dialog"]')
  })
})
