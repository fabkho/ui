import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Guard: every base file imports the base siblings it uses. Nuxt resolves a bare
 * `useModalLayer` or `UiIcon` to the app's copy first when the app defines a name
 * of its own, so the base must import its siblings explicitly (relative paths).
 *
 * Static scan, no compiler: the base's names are the exported composables, utils
 * and types, plus the components under `components/` (`components/ui/Icon.vue` is
 * `UiIcon`). A file that uses one of them without importing it, and without
 * defining it itself, fails. Vue/Nuxt built-ins are not in the scan.
 *
 * Mutation check: remove one `import` line from a base file and this test fails.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SCANNED_DIRS = ['app/components', 'app/composables', 'app/utils', 'app/plugins']
const SOURCE = /\.(vue|ts|mts)$/

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : SOURCE.test(entry) ? [path] : []
  })
}

const files = SCANNED_DIRS.flatMap((dir) => walk(join(ROOT, dir)))
  // Stories are not shipped (`files` in package.json) and run inside the layer's own Nuxt project, which is no app.
  .filter((path) => !path.endsWith('.d.ts') && !path.endsWith('.stories.ts'))
  .map((path) => ({ path, rel: relative(ROOT, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }))

/** Drop comments so prose like "use useModalLayer here" is not a usage. */
function stripComments(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

/** Names a base file exports (composables, utils, types) or is a component of. */
const definedBy = new Map<string, string>()
for (const file of files) {
  if (file.rel.startsWith('app/components/')) {
    const base = file.rel.split('/').pop()!.replace(/\.vue$/, '')
    const folder = file.rel.split('/').slice(2, -1).map((s) => s[0].toUpperCase() + s.slice(1))
    definedBy.set([...folder, base].join(''), file.rel)
    continue
  }
  for (const match of stripComments(file.text).matchAll(
    /export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    definedBy.set(match[1], file.rel)
  }
}

/** Identifiers the file binds itself (declarations and import bindings). */
function bindingsOf(code: string): Set<string> {
  const names = new Set<string>()
  for (const match of code.matchAll(/(?:function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(match[1])
  }
  // A component's own props (`defineProps<{ endsRun?: boolean }>()`): a prop may share a base util's name.
  for (const block of code.matchAll(/defineProps<\{([\s\S]*?)\}>\(/g)) {
    for (const key of block[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\??:/gm)) names.add(key[1])
  }
  for (const match of code.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+['"][^'"]+['"]/g)) {
    for (const part of match[2].replace(/[{}]/g, ',').split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()!.trim()
      if (name && !name.startsWith('*')) names.add(name)
      const namespace = part.match(/\*\s+as\s+([\w$]+)/)
      if (namespace) names.add(namespace[1])
    }
  }
  return names
}

function usesWithoutImport(file: (typeof files)[number]): string[] {
  const code = stripComments(file.text)
  const own = bindingsOf(code)
  // Names inside string literals (module specifiers, copy) are not usages.
  const bare = code.replace(/'[^'\n]*'|"[^"\n]*"/g, "''")
  const missing: string[] = []
  for (const [name, origin] of definedBy) {
    if (origin === file.rel || own.has(name)) continue
    // A bare identifier: not a property (`x.name`), not a fragment of a longer name.
    const used = new RegExp(`(?<![.\\w$])${name}(?![\\w$])`).test(bare)
    if (used) missing.push(`${name} (from ${origin})`)
  }
  return missing
}

describe('explicit sibling imports', () => {
  it('scans the base', () => {
    // Guards the guard: a broken scan would pass every file trivially.
    expect(definedBy.has('UiIcon')).toBe(true)
    expect(definedBy.has('useModalLayer')).toBe(true)
    expect(definedBy.has('prefersReducedMotion')).toBe(true)
    expect(files.length).toBeGreaterThan(40)
  })

  it('imports every base sibling a file uses', () => {
    const offenders = files
      .map((file) => ({ file: file.rel, missing: usesWithoutImport(file) }))
      .filter((entry) => entry.missing.length > 0)
    expect(offenders).toEqual([])
  })
})
