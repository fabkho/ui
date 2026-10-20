// What an outer layer or the app silently replaces of the base (README, "Overrides are visible"). Nuxt gives
// the app's own files priority over a layer's: `app/components/ui/Cover.vue` in an app *is* `UiCover`, and the
// base's copy is never loaded. That is wanted for a few files and a bug for a forgotten copy, so the base
// finds every one and an app lists the ones it means.
//
// Plain Node, no Nuxt: it reads the folders. Nuxt's own resolution is what decides at build time, but the
// rule is simple (same registered name, same auto-import name) and an outer layer always wins.
//
//   import { layerOverrides } from '@fabkho/ui/testing/overrides.mjs'
//   expect(layerOverrides({ app: 'app' }).map((o) => o.name)).toEqual([])   // the allow-list
//
// The base's nuxt.config.ts runs the same function in dev and logs what it finds.
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { LAYER_ROOT } from './contract.mjs'

const COMPONENT = /\.(vue|tsx|jsx)$/
const SOURCE = /\.(ts|mts|js|mjs)$/

const files = (dir, match) =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && match.test(entry.name) && !/\.(stories|test|spec|d)\.[a-z]+$/.test(entry.name))
        .map((entry) => join(entry.parentPath, entry.name))
        .sort()
    : []

/** `ui-cover`, `UiCover`, `ui_cover` → `['Ui', 'Cover']` (Nuxt's `splitByCase`, enough for file names). */
const words = (text) => text.replace(/([a-z\d])([A-Z])/g, '$1 $2').split(/[\s_\-.]+/).filter(Boolean)
const pascal = (parts) => parts.map((part) => part[0].toUpperCase() + part.slice(1)).join('')

/**
 * The name Nuxt registers a component file under, as in its component scanner: the folders become a
 * prefix (`components/ui/Cover.vue` → `UiCover`) unless the file name already starts with it
 * (`components/ui/UiCover.vue` → `UiCover`); an `index` file is its folder.
 */
export function componentName(relativePath) {
  const parts = relativePath.split(sep).join('/').replace(COMPONENT, '').split('/')
  const prefix = parts.slice(0, -1).flatMap(words)
  let file = words(parts.at(-1))
  if (file.at(-1)?.toLowerCase() === 'index' && (prefix.length > 0 || file.length > 1)) file = file.slice(0, -1)
  const fileText = file.join('/').toLowerCase()
  const kept = []
  while (prefix.length > 0 && !`${fileText}/`.startsWith(`${prefix.join('/').toLowerCase()}/`)) kept.push(prefix.shift())
  return pascal([...kept, ...file])
}

/** The names a composables or utils file makes auto-importable: its named exports, and its default under the file's name. */
function exportedNames(file) {
  const source = readFileSync(file, 'utf8')
  const names = new Set()
  for (const match of source.matchAll(/^export (?:async )?(?:function\*?|const|let|class|enum) ([\w$]+)/gm)) names.add(match[1])
  for (const match of source.matchAll(/^export \{([^}]+)\}/gm)) {
    for (const name of match[1].split(',')) if (name.trim() && !/^type\s/.test(name.trim())) names.add(name.trim().split(/\s+as\s+/).pop())
  }
  if (/^export default /m.test(source)) {
    const [first, ...rest] = words(file.split(sep).at(-1).replace(SOURCE, ''))
    names.add(first.toLowerCase() + pascal(rest))
  }
  return names
}

/** Nuxt scans a composables or utils folder one level deep: its files, and `<folder>/index`. */
const scanned = (dir) =>
  files(dir, SOURCE).filter((file) => {
    const inside = relative(dir, file).split(sep)
    return inside.length === 1 || (inside.length === 2 && /^index\.[a-z]+$/.test(inside[1]))
  })

/** Everything one `app/` folder registers: `{ 'component:UiCover': 'components/ui/Cover.vue', 'import:useSheet': … }`. */
function registered(app) {
  const found = new Map()
  for (const file of files(join(app, 'components'), COMPONENT)) {
    found.set(`component:${componentName(relative(join(app, 'components'), file))}`, relative(app, file).split(sep).join('/'))
  }
  for (const kind of ['composables', 'utils']) {
    for (const file of scanned(join(app, kind))) {
      for (const name of exportedNames(file)) found.set(`${kind === 'composables' ? 'composable' : 'util'}:${name}`, relative(app, file).split(sep).join('/'))
    }
  }
  return found
}

/**
 * Every `Ui*` component, composable and util the base defines that an outer layer or the app defines too.
 *
 * @param {object} options
 * @param {string} [options.app='app']  The app's source folder (Nuxt's `srcDir`, `app/`), or a list of them for several outer layers, highest priority first.
 *                                      A relative path is read from `cwd` (an app's test runs in its project root).
 * @param {string} [options.layer]      The base's folder; defaults to this package. Pass `process.env.UI_LAYER` where an app can point at a checkout.
 * @param {string} [options.cwd]
 * @returns {{ kind: 'component' | 'composable' | 'util', name: string, base: string, outer: string, outerApp: string }[]}
 *   `base` and `outer` are paths relative to each `app/` folder (`components/ui/Cover.vue`).
 */
export function layerOverrides({ app = 'app', layer = LAYER_ROOT, cwd = process.cwd() } = {}) {
  const base = registered(join(resolve(layer), 'app'))
  const found = []
  const seen = new Set()
  for (const outerApp of [app].flat().map((dir) => resolve(cwd, dir))) {
    for (const [key, outer] of registered(outerApp)) {
      const [kind, name] = key.split(':')
      if (!base.has(key) || seen.has(key)) continue
      seen.add(key)
      found.push({ kind, name, base: base.get(key), outer, outerApp })
    }
  }
  return found
}

/** The same, as the line the base logs in dev. */
export const describeOverride = (override, who = 'the app', from = process.cwd()) =>
  `${override.name} is overridden by ${who} (${relative(from, join(override.outerApp, override.outer)).split(sep).join('/')})`

/** Resolves symlinks (pnpm's store, a `UI_LAYER` checkout) so two spellings of one folder compare equal. */
export const sameFolder = (a, b) => {
  try {
    return realpathSync(a) === realpathSync(b)
  } catch {
    return resolve(a) === resolve(b)
  }
}
