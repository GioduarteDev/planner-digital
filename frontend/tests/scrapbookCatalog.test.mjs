import assert from 'node:assert/strict'
import test from 'node:test'
import { SCRAPBOOK_KIND, SCRAPBOOK_MATERIALS, SCRAPBOOK_PALETTES, getScrapbook, scrapbookData } from '../src/pages/Agenda/scrapbookCatalog.ts'

test('scrapbook covers all requested materials with stable, distinct IDs', () => {
  assert.deepEqual(SCRAPBOOK_MATERIALS.map(item => item.id), ['polaroid', 'frame', 'photo-corners', 'torn-edge', 'book', 'news', 'vellum', 'card', 'clip', 'label', 'ticket', 'stamp', 'bookmark', 'botanical'])
  assert.equal(new Set(SCRAPBOOK_MATERIALS.map(item => item.id)).size, 14)
  assert.deepEqual([...new Set(SCRAPBOOK_MATERIALS.map(item => item.category))], ['Molduras', 'Papéis', 'Detalhes'])
  for (const item of SCRAPBOOK_MATERIALS) {
    assert.match(item.id, /^[a-z]+(?:-[a-z]+)*$/)
    assert(item.width > 0 && item.height > 0)
  }
})

test('42 material/palette combinations survive existing shape JSON storage without media data', () => {
  const combinations = new Set()
  for (const material of SCRAPBOOK_MATERIALS) for (const palette of SCRAPBOOK_PALETTES) {
    const payload = JSON.parse(JSON.stringify({ element_type: 'shape', data: scrapbookData(material, palette) }))
    assert.equal(payload.data.paperieKind, SCRAPBOOK_KIND)
    assert.deepEqual(getScrapbook(payload.data), { material, palette })
    assert.deepEqual(Object.keys(payload.data).sort(), ['materialId', 'paletteId', 'paperieKind'])
    for (const color of [palette.paper, palette.edge, palette.ink, palette.accent]) assert.match(color, /^#[a-f0-9]{6}$/i)
    combinations.add(`${material.id}/${palette.id}`)
  }
  assert.equal(combinations.size, 42)
})

test('photo apertures are inside their frame and reference no original media', () => {
  const frames = SCRAPBOOK_MATERIALS.filter(item => 'window' in item)
  assert.deepEqual(frames.map(item => item.id), ['polaroid', 'frame', 'photo-corners'])
  for (const { width, height, window: aperture } of frames) {
    assert(aperture.x > 0 && aperture.y > 0 && aperture.width > 0 && aperture.height > 0)
    assert(aperture.x + aperture.width < width && aperture.y + aperture.height < height)
  }
})

test('legacy elements, other paperie types and malformed versions remain unchanged', () => {
  for (const data of [{}, { shape: 'rounded' }, { text: 'Meu post-it' }, { paperieKind: 'torn-paper-v1' }, { paperieKind: 'washi-v1' }, { paperieKind: 'scrapbook-v2', materialId: 'clip', paletteId: 'cream' }, { paperieKind: SCRAPBOOK_KIND }, { paperieKind: SCRAPBOOK_KIND, materialId: {}, paletteId: 'cream' }, { paperieKind: SCRAPBOOK_KIND, materialId: 'clip', paletteId: 'missing' }]) {
    const before = structuredClone(data)
    assert.equal(getScrapbook(data), null)
    assert.deepEqual(data, before)
  }
})
