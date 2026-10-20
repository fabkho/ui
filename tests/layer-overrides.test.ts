import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { componentName, describeOverride, layerOverrides } from '../testing/overrides.mjs'

/**
 * Overrides are visible (README): which base files an app's own files replace. The base itself against an app with
 * nothing of the base's names is empty; one that has `components/ui/Cover.vue`, a composable or a util of the same
 * name is listed.
 */
const roots: string[] = []
const app = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), 'overrides-'))
  roots.push(root)
  for (const [name, source] of Object.entries(files)) {
    mkdirSync(join(root, 'app', name, '..'), { recursive: true })
    writeFileSync(join(root, 'app', name), source)
  }
  return join(root, 'app')
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

describe('the name Nuxt registers a component under', () => {
  it('prefixes the folders', () => {
    expect(componentName('ui/Cover.vue')).toBe('UiCover')
    expect(componentName('ui/chat/Bubble.vue')).toBe('UiChatBubble')
    expect(componentName('Foo.vue')).toBe('Foo')
  })

  it('does not repeat a prefix the file name already has', () => {
    expect(componentName('ui/UiCover.vue')).toBe('UiCover')
    expect(componentName('ui/ui-cover.vue')).toBe('UiCover')
  })

  it('takes an index file for its folder', () => {
    expect(componentName('ui/Cover/index.vue')).toBe('UiCover')
  })
})

describe('layerOverrides', () => {
  it('finds nothing in an app that has none of the base\'s names', () => {
    const own = app({ 'components/ui/BookLine.vue': '<template />', 'composables/useOwn.ts': 'export const useOwn = () => 1\n', 'utils/own.ts': 'export function own() {}\n' })
    expect(layerOverrides({ app: own })).toEqual([])
  })

  it('finds a component the app defines under the base\'s name', () => {
    const own = app({ 'components/ui/Cover.vue': '<template />', 'components/ui/Stars.vue': '<template />' })
    const [found, ...rest] = layerOverrides({ app: own })
    expect(rest).toEqual([])
    expect(found).toMatchObject({ kind: 'component', name: 'UiCover', base: 'components/ui/Cover.vue', outer: 'components/ui/Cover.vue' })
  })

  it('finds a composable or util with the same export name, however it is declared', () => {
    const own = app({
      'composables/useModalLayer.ts': 'export function useModalLayer() {}\n',
      'utils/motion.ts': 'const parseDuration = () => 0\nexport { parseDuration as durationToken }\n',
      'utils/deep/settle.ts': 'export const settle = 1\n', // not scanned: Nuxt reads one level
    })
    const found = layerOverrides({ app: own }).map((o) => `${o.kind}:${o.name}`)
    expect(found).toEqual(['composable:useModalLayer', 'util:durationToken'])
  })

  it('reads several outer layers, the first one winning', () => {
    const first = app({ 'components/ui/Cover.vue': '<template />' })
    const second = app({ 'components/ui/Cover.vue': '<template />', 'components/ui/Pill.vue': '<template />' })
    const found = layerOverrides({ app: [first, second] })
    expect(found.map((o) => o.name)).toEqual(['UiCover', 'UiPill'])
    expect(found[0]!.outerApp).toBe(first)
  })

  it('says it in one line', () => {
    const own = app({ 'components/ui/Cover.vue': '<template />' })
    expect(describeOverride(layerOverrides({ app: own })[0]!, 'the app', own)).toBe('UiCover is overridden by the app (components/ui/Cover.vue)')
  })
})
