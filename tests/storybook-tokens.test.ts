import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { layerContract } from '../testing/contract.mjs'

/**
 * Storybook's token stylesheet (.storybook/tokens.css) stands in for an app's generated tokens, so it
 * has to satisfy the contract like one does, and the dark theme has to name every colour the light one does.
 */
const tokensCss = readFileSync(fileURLToPath(new URL('../.storybook/tokens.css', import.meta.url)), 'utf8')

describe('storybook tokens', () => {
  it('satisfy the layer contract', () => {
    const found = layerContract({ tokensCss })
    expect(found.missingVariables).toEqual([])
    expect(found.missingCloths).toEqual([])
  })

  it('night sets every colour and elevation that paper does', () => {
    const night = tokensCss.slice(tokensCss.indexOf("[data-theme='night']"))
    const names = (css: string) => new Set([...css.matchAll(/(--(?:color|elevation)-[a-z0-9-]+):/g)].map(m => m[1]))
    const paper = names(tokensCss.slice(0, tokensCss.indexOf("[data-theme='night']")))
    // cloths are the fabric of generated covers: the same in both rooms.
    const missing = [...paper].filter(name => !names(night).has(name) && !/cloth/.test(name))
    expect(missing).toEqual([])
  })
})
