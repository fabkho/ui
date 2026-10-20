import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { layerContract } from '../testing/contract.mjs'
import { CLOTH_COUNT, clothOf, formatAuthors, glowOf, isBlankCover, NEUTRAL_GLOW } from '../app/utils/cloth'

/**
 * The UI layer's contract (README, "The contract"): it imports nothing from the
 * app and reads design tokens only through the variables the app's generated
 * theme defines; the decorations are the theme's. Plus the cover helpers.
 * No stack needed.
 *
 * The contract itself is `testing/contract.mjs`, which takes the app's token CSS:
 * here it runs against a small fixture that satisfies it, in an app against its own
 * `tokens.generated.css` (README, "Using the base").
 */

const tokensCss = readFileSync(fileURLToPath(new URL('./fixtures/tokens.css', import.meta.url)), 'utf8')

describe('the layer', () => {
  const found = layerContract({ tokensCss })

  it('imports nothing from the app', () => {
    expect(found.importsFromApp).toEqual([])
  })

  it('reads only variables the app supplies (its token CSS) or sets itself', () => {
    expect(found.missingVariables).toEqual([])
    expect(found.missingCloths).toEqual([])
    expect(CLOTH_COUNT).toBe(6)
  })

  it('writes no curve of its own: the tokens are the only place one is written', () => {
    expect(found.rawCurves).toEqual([])
  })

  it('names what an app lacks: a token left out of its CSS is reported', () => {
    const lacking = tokensCss.replace('--color-accent:', '--color-accentx:').replace('--color-cloth3:', '--color-clothx:')
    const result = layerContract({ tokensCss: lacking })
    expect(result.missingVariables).toContain('--color-accent')
    expect(result.missingCloths).toEqual(['--color-cloth3'])
  })
})

describe('a generated cover', () => {
  it('always gives a title the same cloth, one of the six', () => {
    for (const title of ['Dune', 'Die Mitternachtsbibliothek', 'Ü', '']) {
      const cloth = clothOf(title)
      expect(cloth).toBe(clothOf(title))
      expect(cloth).toBeGreaterThanOrEqual(1)
      expect(cloth).toBeLessThanOrEqual(CLOTH_COUNT)
    }
  })

  it('names one, two or many authors in one line', () => {
    expect(formatAuthors([], 'u. a.')).toBe('')
    expect(formatAuthors(['Ann Leckie'], 'u. a.')).toBe('Ann Leckie')
    expect(formatAuthors(['Terry Pratchett', 'Neil Gaiman'], 'u. a.')).toBe('Terry Pratchett & Neil Gaiman')
    expect(formatAuthors(['A', 'B', 'C'], 'u. a.')).toBe('A u. a.')
  })

  it("takes a source's tiny stand-in for no image", () => {
    expect(isBlankCover(1, 1)).toBe(true)
    expect(isBlankCover(180, 270)).toBe(false)
  })

  it('lights a cover of unknown colours in the neutral glow', () => {
    expect(glowOf(null)).toEqual(NEUTRAL_GLOW)
  })
})
