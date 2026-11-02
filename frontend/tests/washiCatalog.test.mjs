import assert from 'node:assert/strict'
import test from 'node:test'
import { WASHI_CATALOG, WASHI_CATEGORIES, WASHI_EDGES, WASHI_KIND, WASHI_OUTLINES, WASHI_WIDTHS, getPaperieWashi, washiData } from '../src/pages/Agenda/washiCatalog.ts'
import { WASHI_OPTIONS } from '../src/pages/Agenda/editorCatalog.ts'

test('retains every legacy variant and introduces 48 unique categorized designs', () => {
  assert.deepEqual(WASHI_OPTIONS.map(item => item[0]), ['dots', 'stripes', 'checks', 'stars', 'hearts', 'flowers', 'moons', 'leaves', 'bows', 'clouds', 'sparkles', 'cherries', 'daisies', 'grid', 'scallop', 'waves', 'tickets', 'confetti', 'lace', 'plain'])
  assert.equal(WASHI_CATALOG.length, 48)
  assert.equal(new Set(WASHI_CATALOG.map(item => item.id)).size, 48)
  assert(WASHI_CATALOG.every(item => !WASHI_OPTIONS.some(old => old[0] === item.id)))
  assert.deepEqual([...new Set(WASHI_CATALOG.map(item => item.motif))], ['strawberries', 'cherries', 'flowers', 'sakura', 'daisies', 'hearts', 'bows', 'gingham', 'dots', 'stars', 'sky', 'clouds', 'leaves', 'lace', 'news', 'korean'])
  for (const category of WASHI_CATEGORIES) assert(WASHI_CATALOG.some(item => item.category === category.id))
  for (const motif of new Set(WASHI_CATALOG.map(item => item.motif))) {
    assert.deepEqual(WASHI_CATALOG.filter(item => item.motif === motif).map(item => item.arrangement), ['row', 'duet', 'diagonal'])
  }
})

test('new designs round-trip with all edges, widths, colors and transparency through existing washi data', () => {
  for (const design of WASHI_CATALOG) for (const edge of WASHI_EDGES) for (const size of WASHI_WIDTHS) {
    const element = JSON.parse(JSON.stringify({ element_type: 'washi', width: 300, height: size.height, data: washiData(design, edge.id, .55, '#faf0df') }))
    assert.deepEqual(getPaperieWashi(element.data), { design, edge: edge.id, opacity: .55, paper: '#faf0df' })
    assert.equal(element.element_type, 'washi')
    assert.equal(element.height, size.height)
  }
  assert.equal(new Set(Object.values(WASHI_OUTLINES)).size, 3)
  assert(WASHI_OUTLINES.torn.length > WASHI_OUTLINES.irregular.length)
})

test('legacy and unknown payloads keep their original renderer; malformed options have safe defaults', () => {
  for (const [pattern, color] of WASHI_OPTIONS) {
    const data = { pattern, color }
    assert.equal(getPaperieWashi(data), null)
    assert.deepEqual(data, { pattern, color })
  }
  assert.equal(getPaperieWashi({ paperieKind: 'washi-v2', pattern: WASHI_CATALOG[0].id }), null)
  assert.equal(getPaperieWashi({ paperieKind: WASHI_KIND, pattern: 'unknown' }), null)
  const data = { paperieKind: WASHI_KIND, pattern: WASHI_CATALOG[0].id, edge: 'invalid', color: 'url(https://invalid.test)', opacity: Infinity }
  const parsed = getPaperieWashi(data)
  assert.equal(parsed.paper, WASHI_CATALOG[0].paper)
  assert.equal(parsed.edge, WASHI_CATALOG[0].edge)
  assert.equal(parsed.opacity, .9)
  assert.equal(getPaperieWashi({ ...data, opacity: -1 }).opacity, .2)
  assert.equal(getPaperieWashi({ ...data, opacity: 9 }).opacity, 1)
})
