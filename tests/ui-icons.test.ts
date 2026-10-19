import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `UiIcon` is one set, the union of BetterReads' and Bookretreats' icons: every name in `IconName` is drawn
 * (a template branch), no branch is for a name the type lacks, and the icons story shows each of them.
 * Static scan of the files; nothing is rendered here.
 */
const read = (name: string) => readFileSync(fileURLToPath(new URL(`../components/ui/${name}`, import.meta.url)), 'utf8')
const icon = read('Icon.vue')
const story = read('Icon.stories.ts')

const union = icon.slice(icon.indexOf('export type IconName'), icon.indexOf('</script>'))
const names = [...union.matchAll(/^\s*\| '([A-Za-z0-9]+)'/gm)].map(m => m[1]!)
// `margins0`–`3` share one branch (`name.startsWith('margins')`), told apart inside it by `name === 'marginsN'`.
const drawn = [...icon.matchAll(/name === '([A-Za-z0-9]+)'/g)].map(m => m[1]!)
if (icon.includes("name.startsWith('margins')")) drawn.push('margins3')
const listed = [...story.slice(story.indexOf('const NAMES'), story.indexOf('const meta')).matchAll(/'([A-Za-z0-9]+)'/g)].map(m => m[1]!)

describe('the icon set', () => {
  it('has a name once', () => {
    expect(names.length).toBeGreaterThan(80)
    expect(new Set(names).size).toBe(names.length)
  })

  it('draws every name, and nothing else', () => {
    expect(names.filter(name => !drawn.includes(name))).toEqual([])
    expect(drawn.filter(name => !names.includes(name))).toEqual([])
  })

  it('shows every name in the story', () => {
    expect(names.filter(name => !listed.includes(name))).toEqual([])
  })

  it('carries BetterReads\' share, bookmarks and formats beside Bookretreats\' marks', () => {
    for (const name of ['share', 'bookmark', 'bookmarkPlus', 'hardcover', 'paperback', 'tablet', 'audiobook', 'map', 'orga', 'feed']) {
      expect(names).toContain(name)
    }
  })

  it('lets an app draw a name itself through ui.icons, before the layer drawing', () => {
    expect(icon).toContain('v-if="override"')
    expect(icon).toContain('useAppConfig().ui')
    expect(read('../../app.config.ts')).toContain('icons:')
  })
})
