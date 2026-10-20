import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { layerContract, stripComments, stripFileComments } from '../testing/contract.mjs'

/**
 * The contract reads code, not comments: a variable named only in a comment is not
 * required of the app (BetterReads had to add a dummy token for one, fabkho/libellus#365).
 */

const roots: string[] = []
const tokensCss = ':root { --color-accent: red; }'

/** A fresh layer folder with one file per entry; `cloth.ts` and the root config files are always there. */
function layerWith(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'contract-'))
  roots.push(root)
  for (const folder of ['assets', 'components', 'composables', 'plugins', 'utils']) mkdirSync(join(root, 'app', folder), { recursive: true })
  const defaults = { 'app/utils/cloth.ts': 'export const CLOTH_COUNT = 0\n', 'app/app.config.ts': '', 'nuxt.config.ts': '', 'app/router.options.ts': '' }
  for (const [name, source] of Object.entries({ ...defaults, ...files })) {
    mkdirSync(join(root, name, '..'), { recursive: true })
    writeFileSync(join(root, name), source)
  }
  return layerContract({ tokensCss, root })
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

describe('a variable named only in a comment is not required', () => {
  it('in a // line comment of a .ts file', () => {
    const found = layerWith({ 'app/utils/a.ts': '// uses --only-line\nexport const x = 1\n' })
    expect(found.missingVariables).not.toContain('--only-line')
  })

  it('in a /* */ block comment of a .ts file', () => {
    const found = layerWith({ 'app/utils/b.ts': '/* uses\n --only-block */\nexport const x = 1\n' })
    expect(found.missingVariables).not.toContain('--only-block')
  })

  it('in an HTML comment of a .vue template', () => {
    const found = layerWith({ 'app/components/ui/C.vue': '<template>\n  <!-- --only-html -->\n  <div />\n</template>\n' })
    expect(found.missingVariables).not.toContain('--only-html')
  })

  it('in a /* */ comment of a .vue <script>', () => {
    const found = layerWith({ 'app/components/ui/D.vue': '<script setup lang="ts">\n/* --only-vue-script */\n</script>\n' })
    expect(found.missingVariables).not.toContain('--only-vue-script')
  })

  it('in a /* */ comment of a .vue <style>', () => {
    const found = layerWith({ 'app/components/ui/E.vue': '<style>\n/* --only-vue-style */\n</style>\n<template><div /></template>\n' })
    expect(found.missingVariables).not.toContain('--only-vue-style')
  })

  it('in a /* */ comment of a .css file', () => {
    const found = layerWith({ 'app/assets/f.css': '/* --only-css */\n.a { color: #000; }\n' })
    expect(found.missingVariables).not.toContain('--only-css')
  })
})

describe('the same variable in code is required', () => {
  it('in .ts, .vue template, .vue style and .css code', () => {
    const found = layerWith({
      'app/utils/g.ts': 'export const s = "var(--in-ts)"\n// nothing\n',
      'app/components/ui/H.vue': '<template><div :style="{ c: \'var(--in-vue)\' }" /></template>\n',
      'app/components/ui/I.vue': '<style>.a { color: var(--in-vue-style); }</style>\n<template><div /></template>\n',
      'app/assets/j.css': '/* ok */ .a { color: var(--in-css); }\n',
    })
    expect(found.missingVariables).toEqual(expect.arrayContaining(['--in-ts', '--in-vue', '--in-vue-style', '--in-css']))
  })

  it('a variable in code next to a comment on the same line is still required', () => {
    const found = layerWith({ 'app/utils/k.ts': 'const a = "--code-here" /* --comment-here */\n' })
    expect(found.missingVariables).toContain('--code-here')
    expect(found.missingVariables).not.toContain('--comment-here')
  })

  it('a variable used only in a fallback var(--x, …) is still required, as before', () => {
    const found = layerWith({ 'app/assets/l.css': '.a { color: var(--fallback-only, #000); }\n' })
    expect(found.missingVariables).toContain('--fallback-only')
  })
})

describe('strings and URLs are not comments', () => {
  it('https:// in a string does not hide the rest of the line', () => {
    const found = layerWith({ 'app/utils/m.ts': 'const url = "https://example.com"; const v = "--after-url"\n' })
    expect(found.missingVariables).toContain('--after-url')
  })

  it('an unquoted url(https://…) in CSS does not hide the declaration after it', () => {
    const found = layerWith({ 'app/assets/n.css': '.a { background: url(https://example.com/x.png); color: var(--after-css-url); }\n' })
    expect(found.missingVariables).toContain('--after-css-url')
  })

  it('an apostrophe in .vue template prose does not hide a later comment or variable', () => {
    const source = "<template>\n  <p>don't</p>\n</template>\n<script setup>\n/* --gone */\nconst a = '--kept'\n</script>\n"
    const found = layerWith({ 'app/components/ui/O.vue': source })
    expect(found.missingVariables).not.toContain('--gone')
    expect(found.missingVariables).toContain('--kept')
  })
})

describe('stripComments', () => {
  it('keeps the newlines of a removed comment, so lines keep their numbers', () => {
    expect(stripComments('a /* x\ny */ b', 'js').split('\n')).toHaveLength(2)
  })

  it('leaves a file without comments unchanged', () => {
    const source = "const a = `x ${b}`\nlet c = 'd' // trailing\n"
    expect(stripFileComments('x.ts', source)).toBe("const a = `x ${b}`\nlet c = 'd' \n")
  })
})
