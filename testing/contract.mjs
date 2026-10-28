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
const FOLDERS = ['assets', 'components', 'composables', 'plugins', 'utils'].map((folder) => `app/${folder}`)
const ROOT_FILES = ['nuxt.config.ts', 'app/app.config.ts', 'app/router.options.ts']

/** Variables the layer sets itself (component styles, the safe-area frame) rather than reads from the tokens. */
export const OWN_VARIABLES = [
  '--avatar-d',
  '--avatar-fs',
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
  '--chat-dock',
  '--chat-banner',
  '--composer-inset',
  '--voice-inset',
  '--voice-corner',
  '--voice-corner-tail',
  '--face',
  '--ring',
]

/**
 * Variables the layer reads only with a fallback (`var(--glass-solid, 0%)`): an app may set them (the Glass
 * setting, a 24 px target size) and an app without them looks as the design does. Not required of the tokens;
 * `tests/ui-optional-variables.test.ts` holds the layer to reading each one with a fallback.
 */
export const OPTIONAL_VARIABLES = [
  '--glass-solid',
  '--glass-scale',
  '--veil-solid',
  '--size-target',
  '--hit-up',
  '--hit-down',
  '--avatar-stack-ring',
]

const read = (path) => readFileSync(path, 'utf8')

/**
 * Blanks the comments out of a source file, so the contract reads only code (a variable named
 * in a comment is not a variable the layer uses). Strings are walked, not matched: `https://`
 * in a string or an unquoted `url()` is not a comment.
 *
 * - JS (`.ts`, a `<script>`): `//` and `/* … *\/`. Quotes end at their line, template literals may span lines.
 * - CSS (`.css`, a `<style>`): `/* … *\/` only; `//` is never a comment there.
 * - Template (the rest of a `.vue`): `<!-- … -->` only.
 *
 * Newlines inside a comment are kept, so line numbers stay true.
 *
 * @param {string} source
 * @param {'js' | 'css' | 'html'} kind
 */
export function stripComments(source, kind) {
  if (kind === 'css') return stripCss(source)
  if (kind === 'html') return source.replace(/<!--[\s\S]*?-->/g, blank)
  if (kind === 'js') return stripJs(source)
  throw new Error(`stripComments: unknown kind ${kind}`)
}

/** Blanks a comment, keeping its newlines. */
const blank = (comment) => comment.replace(/[^\n]/g, '')

function stripCss(source) {
  let out = ''
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    if (ch === '"' || ch === "'") {
      const end = quoteEnd(source, i)
      out += source.slice(i, end)
      i = end
    } else if (ch === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2)
      const end = close === -1 ? source.length : close + 2
      out += blank(source.slice(i, end))
      i = end
    } else {
      out += ch
      i++
    }
  }
  return out
}

function stripJs(source) {
  let out = ''
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    if (ch === '"' || ch === "'") {
      const end = quoteEnd(source, i)
      out += source.slice(i, end)
      i = end
    } else if (ch === '`') {
      const end = templateEnd(source, i)
      out += source.slice(i, end)
      i = end
    } else if (ch === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i)
      const end = newline === -1 ? source.length : newline
      i = end
    } else if (ch === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2)
      const end = close === -1 ? source.length : close + 2
      out += blank(source.slice(i, end))
      i = end
    } else {
      out += ch
      i++
    }
  }
  return out
}

/** Index just past a '…' or "…" string starting at `start`; a string ends at its line (an apostrophe in prose stays harmless). */
function quoteEnd(source, start) {
  const quote = source[start]
  let i = start + 1
  while (i < source.length && source[i] !== quote && source[i] !== '\n') {
    i += source[i] === '\\' ? 2 : 1
  }
  return source[i] === quote ? i + 1 : i
}

/** Index just past a `…` template literal starting at `start` (`${}` is not parsed: it is text here). */
function templateEnd(source, start) {
  let i = start + 1
  while (i < source.length && source[i] !== '`') i += source[i] === '\\' ? 2 : 1
  return Math.min(i + 1, source.length)
}

/**
 * The layer's source with its comments blanked, per file type: `.vue` splits into its template,
 * `<script>` (JS rules) and `<style>` (CSS rules); `.ts` is JS; `.css` is CSS.
 */
export function stripFileComments(file, source) {
  if (file.endsWith('.css')) return stripComments(source, 'css')
  if (file.endsWith('.vue')) {
    const html = stripComments(source, 'html')
    return html
      .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g, (_, open, body, close) => open + stripComments(body, 'js') + close)
      .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g, (_, open, body, close) => open + stripComments(body, 'css') + close)
  }
  return stripComments(source, 'js')
}

function filesIn(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return filesIn(path)
    // Stories (Storybook) are not the layer's code: they are left out of the package, and out of the contract.
    return /\.(vue|ts|css)$/.test(name) && !/\.stories\.ts$/.test(name) ? [path] : []
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
  const code = (file) => stripFileComments(file, read(file))
  const own = new Set([...OWN_VARIABLES, ...OPTIONAL_VARIABLES])
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
    for (const [name] of code(file).matchAll(/--[a-z][a-z0-9-]*[a-z0-9]/g)) {
      if (name.startsWith('--tw-') || own.has(name) || defined.has(name)) continue
      // Built from a prefix in code (`--duration-${name}`, `--color-cloth${n}`): checked below.
      if (/^--(duration|ease|color-cloth)$/.test(name)) continue
      missing.add(name)
    }
  }

  // 3. Every cloth a generated cover can pick has its colour.
  const count = Number(/CLOTH_COUNT\s*=\s*(\d+)/.exec(code(join(root, 'app/utils/cloth.ts')))?.[1])
  const missingCloths = []
  for (let n = 1; n <= count; n++) if (!defined.has(`--color-cloth${n}`)) missingCloths.push(`--color-cloth${n}`)

  // 4. The tokens are the only place a curve is written: no cubic-bezier() and no raw ease keyword.
  const rawCurves = []
  for (const file of files) {
    const source = code(file)
    const name = file.slice(root.length)
    if (/cubic-bezier\(\s*[\d.]/.test(source)) rawCurves.push(`${name}: cubic-bezier`)
    if (/(transition|animation)[^;{}]*\b(ease-in|ease-out|ease-in-out|ease)\b(?![-\w])/.test(source)) rawCurves.push(`${name}: raw ease`)
    if (/['"`](ease-in|ease-out|ease-in-out)['"`]/.test(source)) rawCurves.push(`${name}: raw ease (script)`)
  }

  return { importsFromApp, missingVariables: [...missing].sort(), missingCloths, rawCurves }
}
