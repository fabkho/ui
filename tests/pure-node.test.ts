import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The pure utils run under plain Node, with no Nuxt and no Vite: trappist's data layer (Playwright,
 * Node) imports them as `@fabkho/ui/pure/<name>`. The script runs in a child `node` process, so what
 * this proves is what a consumer gets: the built `dist/pure` files, resolved through the `exports`
 * map (the self-reference of this package). `pretest` builds them first.
 */
const root = fileURLToPath(new URL('..', import.meta.url))

const script = `
import { voiceMime, voiceExtension, VOICE_TYPES, canPlayVoice, clock } from '@fabkho/ui/pure/voice'
import { timeline, dayKey, clockTime } from '@fabkho/ui/pure/timeline'
import { REPLY_THRESHOLD, EDGE_PX } from '@fabkho/ui/pure/reply'
const at = new Date(2026, 2, 4, 9, 5)
console.log(JSON.stringify({
  mime: voiceMime('audio/webm;codecs=opus'),
  ext: voiceExtension('audio/ogg'),
  types: VOICE_TYPES.length,
  playable: canPlayVoice('audio/mp4', null),
  clock: clock(125),
  dayKey: dayKey(at),
  clockTime: clockTime(at),
  rows: timeline([{ createdAt: at.toISOString(), id: 'a' }], at, (i) => i.id, { today: 'Heute', yesterday: 'Gestern', locale: 'de' }).map((r) => r.type),
  replyThreshold: REPLY_THRESHOLD,
  edge: EDGE_PX,
}))
`

describe('pure utils under plain node', () => {
  it('import with node, no Nuxt and no Vite, through the exports map', () => {
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: root, encoding: 'utf8' })
    expect(JSON.parse(out)).toEqual({
      mime: 'audio/webm',
      ext: 'ogg',
      types: 3,
      playable: true,
      clock: '2:05',
      dayKey: '2026-03-04',
      clockTime: '9:05',
      rows: ['day', 'item'],
      replyThreshold: 60,
      edge: 20,
    })
  })
})
