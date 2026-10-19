// The base's contract as a function, so every app runs the same check against its own tokens
// (README, "The contract"). Plain JavaScript on purpose: an app imports it from `node_modules`,
// where Node does not strip types and Vitest does not transform. It imports nothing, not even
// Vitest: it returns what it found and the app's test decides (`expect(found.missingVariables).toEqual([])`).
//
//   import { layerContract } from '@fabkho/ui/testing/contract.mjs'
//   const found = layerContract({ tokensCss: readFileSync('app/assets/css/tokens.generated.css', 'utf8') })
//   expect(found.importsFromApp).toEqual([])
//   expect(found.missingVariables).toEqual([])
//   expect(found.missingCloths).toEqual([])
//   expect(found.rawCurves).toEqual([])
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The package root: this file's folder's parent, wherever the package lives (the repo, `node_modules/@fabkho/ui`, `UI_LAYER`). */
export const LAYER_ROOT = fileURLToPath(new URL('../', import.meta.url))

/** What the layer ships and the contract reads: the Nuxt layer's folders and its root files, not tests or tooling. */
const FOLDERS = ['assets', 'components', 'composables', 'plugins', 'utils']
const ROOT_FILES = ['app.config.ts', 'nuxt.config.ts', 'router.options.ts']

/** Variables the layer sets itself (component styles, the safe-area frame) rather than reads from the tokens. */
export const OWN_VARIABLES = [
  '--safe-area-top',
  '--safe-area-bottom',
  '--safe-area-left',
  '--safe-area-right',
  '--bar-top',
  '--float-bottom',
  '--wave',
  '--pool-a',
  '--pool-b',
  '--glow-a',
  '--sheet-lift',
  '--sheet-room',
  '--dialog-lift',
  '--dialog-room',
  '--keyboard-inset',
  '--viewport-pan',
  '--index',
  '--count',
]

const read = (path) => readFileSync(path, 'utf8')

function filesIn(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return filesIn(path)
    return /\.(vue|ts|css)$/.test(name) ? [path] : []
  })
}

/** Every source file of the layer, as absolute paths. */
export function layerFiles(root = LAYER_ROOT) {
  return [...FOLDERS.flatMap((folder) => filesIn(join(root, folder))), ...ROOT_FILES.map((name) => join(root, name))]
}

/**
 * Runs the contract: the layer against an app's design tokens.
 *
 * @param {object} options
 * @param {string} options.tokensCss  The app's generated token stylesheet (every `--variable:` it defines).
 * @param {string} [options.root]     The layer's folder; defaults to this package.
 * @returns {{
 *   importsFromApp: string[],
 *   missingVariables: string[],
 *   missingCloths: string[],
 *   rawCurves: string[],
 * }} Empty lists mean the contract holds.
 */
export function layerContract({ tokensCss, root = LAYER_ROOT }) {
  const files = layerFiles(root)
  const own = new Set(OWN_VARIABLES)
  const defined = new Set([...tokensCss.matchAll(/(--[a-z][a-z0-9-]*):/g)].map((m) => m[1]))

  // 1. Imports nothing from the app (inside a layer `~` and `@` are the *app's* source folder).
  const importsFromApp = files
    .filter((file) => {
      const source = read(file)
      return /from ['"](~|@|~~)\//.test(source) || /useI18n|stores\//.test(source)
    })
    .map((file) => file.slice(root.length))

  // 2. Reads only variables the app's tokens define, or sets itself.
  const missing = new Set()
  for (const file of files) {
    for (const [name] of read(file).matchAll(/--[a-z][a-z0-9-]*[a-z0-9]/g)) {
      if (name.startsWith('--tw-') || own.has(name) || defined.has(name)) continue
      // Built from a prefix in code (`--duration-${name}`, `--color-cloth${n}`): checked below.
      if (/^--(duration|ease|color-cloth)$/.test(name)) continue
      missing.add(name)
    }
  }

  // 3. Every cloth a generated cover can pick has its colour.
  const count = Number(/CLOTH_COUNT\s*=\s*(\d+)/.exec(read(join(root, 'utils/cloth.ts')))?.[1])
  const missingCloths = []
  for (let n = 1; n <= count; n++) if (!defined.has(`--color-cloth${n}`)) missingCloths.push(`--color-cloth${n}`)

  // 4. The tokens are the only place a curve is written: no cubic-bezier() and no raw ease keyword.
  const rawCurves = []
  for (const file of files) {
    const source = read(file)
    const code = source.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
    const name = file.slice(root.length)
    if (/cubic-bezier\(\s*[\d.]/.test(code)) rawCurves.push(`${name}: cubic-bezier`)
    if (/(transition|animation)[^;{}]*\b(ease-in|ease-out|ease-in-out|ease)\b(?![-\w])/.test(code)) rawCurves.push(`${name}: raw ease`)
    if (/['"`](ease-in|ease-out|ease-in-out)['"`]/.test(code)) rawCurves.push(`${name}: raw ease (script)`)
  }

  return { importsFromApp, missingVariables: [...missing].sort(), missingCloths, rawCurves }
}
