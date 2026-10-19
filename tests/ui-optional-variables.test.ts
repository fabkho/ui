import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { layerFiles, OPTIONAL_VARIABLES, OWN_VARIABLES, stripFileComments } from '../testing/contract.mjs'

/**
 * The optional variables (README, "The variables the layer needs": the Glass setting, the 24 px target) are
 * not in the contract's list of what an app must define, so the layer has to hold up its end: every read of one
 * carries a fallback (`var(--glass-solid, 0%)`), and an app that sets none looks as the design does.
 */
const code = layerFiles().map(file => ({ file, text: stripFileComments(file, readFileSync(file, 'utf8')) }))

describe('optional variables', () => {
  it('are read with a fallback, wherever the layer reads them', () => {
    const bare: string[] = []
    for (const name of OPTIONAL_VARIABLES) {
      for (const { file, text } of code) {
        for (const match of text.matchAll(new RegExp(`var\\(\\s*${name}(?![\\w-])\\s*([,)])`, 'g'))) {
          if (match[1] === ')') bare.push(`${file}: var(${name})`)
        }
      }
    }
    expect(bare).toEqual([])
  })

  it('are what the glass utility reads: the Glass setting, and an app without it gets the design', () => {
    const css = readFileSync(fileURLToPath(new URL('../assets/css/ui.css', import.meta.url)), 'utf8')
    const glass = css.slice(css.indexOf('@utility glass'), css.indexOf('@utility veil-tint'))
    expect(glass).toContain('var(--glass-solid, 0%)')
    expect(glass).toContain('var(--glass-scale, 1)')
  })

  it('are each read somewhere, so the list does not keep a name nothing uses', () => {
    const joined = code.map(entry => entry.text).join('\n')
    for (const name of OPTIONAL_VARIABLES) expect(joined, name).toContain(name)
  })

  it('are not also on the list of what the layer sets itself', () => {
    expect(OPTIONAL_VARIABLES.filter(name => OWN_VARIABLES.includes(name))).toEqual([])
  })
})
