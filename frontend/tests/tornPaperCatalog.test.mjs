import assert from 'node:assert/strict'
import test from 'node:test'
import { TORN_PAPER_COLLECTIONS, TORN_PAPER_FORMATS, TORN_PAPER_KIND, getTornPaper, tornPaperData } from '../src/pages/Agenda/tornPaperCatalog.ts'

test('provides eight distinct torn outlines and all thirteen requested collections', () => {
  assert.deepEqual(TORN_PAPER_FORMATS.map(item => item.name), ['Canto rasgado', 'Borda rasgada', 'Tira horizontal', 'Tira vertical', 'Retalho irregular', 'Bloco de papel rasgado', 'Fragmento de página', 'Etiqueta rasgada'])
  assert.deepEqual(TORN_PAPER_COLLECTIONS.map(item => item.name), ['Papel creme', 'Papel de caderno', 'Jornal vintage', 'Página de livro antigo', 'Partitura', 'Rosa delicado', 'Lilás', 'Matcha', 'Moranguinho', 'Floral', 'Study Girl', 'Dark Academia', 'Witchy Journal'])
  for (const catalog of [TORN_PAPER_FORMATS, TORN_PAPER_COLLECTIONS]) {
    assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length)
    assert(catalog.every(item => /^[a-z]+(?:-[a-z]+)*$/.test(item.id)))
  }
  assert.equal(new Set(TORN_PAPER_FORMATS.map(item => item.path)).size, 8)
  for (const format of TORN_PAPER_FORMATS) {
    assert(format.width > 0 && format.height > 0)
    assert.match(format.path, /^M.+Z$/)
    assert(format.path.match(/\d+/g).length > 40, `${format.id} must describe an irregular outline`)
  }
})

test('all 104 combinations round-trip through the existing shape JSON payload', () => {
  const combinations = new Set()
  for (const format of TORN_PAPER_FORMATS) for (const collection of TORN_PAPER_COLLECTIONS) {
    const data = JSON.parse(JSON.stringify(tornPaperData(format, collection)))
    assert.equal(data.paperieKind, TORN_PAPER_KIND)
    assert.deepEqual(getTornPaper(data), { format, collection })
    assert.deepEqual(Object.keys(data).sort(), ['collectionId', 'formatId', 'paperieKind'])
    combinations.add(`${data.formatId}/${data.collectionId}`)
    for (const color of [collection.paper, collection.ink, collection.accent]) assert.match(color, /^#[a-f0-9]{6}$/i)
  }
  assert.equal(combinations.size, 104)
})

test('legacy shapes, post-its, unknown versions and incomplete data are not treated as torn paper', () => {
  for (const data of [{}, { shape: 'rounded' }, { variant: 'torn-wisteria', text: 'Keep me' }, { paperieKind: 'torn-paper-v2', formatId: 'corner', collectionId: 'cream' }, { paperieKind: TORN_PAPER_KIND }, { paperieKind: TORN_PAPER_KIND, formatId: 'corner', collectionId: 'unknown' }, { paperieKind: TORN_PAPER_KIND, formatId: {}, collectionId: 'cream' }]) {
    const before = JSON.stringify(data)
    assert.equal(getTornPaper(data), null)
    assert.equal(JSON.stringify(data), before)
  }
})
