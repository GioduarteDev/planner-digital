import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  filterSymbolsByCategory,
  normalizeSymbolSearchTerm,
  searchSymbols,
  SYMBOL_CATALOG,
  SYMBOL_CATEGORIES,
  getSymbolCardLayout,
} from '../src/pages/Agenda/symbolCatalog.ts'

const requiredSymbols = [
  '⋆˚꩜｡',
  '𐙚⋆.˚',
  'ᢉ𐭩   ♡',
  '₊˚⊹♡',
  '𓆩♡𓆪',
  '⋆｡°✩',
  '✧˖°.',
  '⊹₊⟡⋆',
  '☾⋆⁺₊',
  '˚₊‧꒰ა ♡ ໒꒱ ‧₊˚',
  '˖⁺‧₊˚ ♡ ˚₊‧⁺˖',
  '๋࣭ ⭑',
  'ᯓᡣ𐭩',
  'ᝰ.ᐟ',
  '⟡ ݁₊ .',
  '·˚ ༘ ⋆',
  '౨ৎ ⋆˚｡⋆',
  '⋆.˚ᡣ𐭩.𖥔˚',
  '°❀⋆.ೃ࿔*',
  '⋆˚｡⋆୨୧˚',
  '༊·˚',
  '*.✧',
  '❥',
  'ღ',
  'ᥫ᭡',
  'ꨄ',
  'ᰔ',
  'ᰔᩚ',
  '𖹭',
  '❣',
]

test('preserves every required Unicode sequence exactly', () => {
  const values = new Set(SYMBOL_CATALOG.map(symbol => symbol.value))
  for (const value of requiredSymbols) assert(values.has(value), `Missing exact sequence: ${value}`)
  assert.equal(SYMBOL_CATALOG.find(symbol => symbol.value === 'ᢉ𐭩   ♡')?.value, 'ᢉ𐭩   ♡')
})

test('provides stable unique IDs and at least 60 additional options', () => {
  const ids = SYMBOL_CATALOG.map(symbol => symbol.id)
  assert.equal(new Set(ids).size, ids.length)
  const values = SYMBOL_CATALOG.map(symbol => symbol.value)
  assert.equal(new Set(values).size, values.length)
  const required = new Set(requiredSymbols)
  const additions = new Set(values.filter(value => !required.has(value)))
  assert(additions.size >= 60, `Expected at least 60 new values; got ${additions.size}`)
})

test('exposes all requested categories, with favorites as a dynamic category', () => {
  assert.deepEqual(SYMBOL_CATEGORIES.map(category => category.label), [
    'Corações',
    'Laços',
    'Estrelas',
    'Lua e céu',
    'Flores e natureza',
    'Símbolos aesthetic',
    'Coquette',
    'Kaomojis fofinhos',
    'Kaomojis divertidos',
    'Separadores decorativos',
    'Símbolos para estudos',
    'Símbolos para listas',
    'Witchy e místicos',
    'Emojis',
    'Favoritos',
  ])
  for (const category of SYMBOL_CATEGORIES.slice(0, -1)) {
    assert(filterSymbolsByCategory(SYMBOL_CATALOG, category.id).length > 0)
  }

  const favoriteIds = ['coquette-orbit', 'soft-heart']
  assert.deepEqual(
    filterSymbolsByCategory(SYMBOL_CATALOG, 'favorites', favoriteIds).map(symbol => symbol.id),
    favoriteIds,
  )
})

test('preserves all 167 original stable IDs and exact sequences, including whitespace and combining marks', () => {
  const original = JSON.parse(readFileSync(new URL('./fixtures/symbolCatalog.legacy.json', import.meta.url), 'utf8'))
  assert.equal(original.length, 167)
  for (const symbol of original) {
    assert.equal(SYMBOL_CATALOG.find(item => item.id === symbol.id)?.value, symbol.value, symbol.id)
  }
  assert(SYMBOL_CATALOG.length >= original.length + 200)
})

test('uses wide cards for kaomojis and full-width separators without splitting Unicode', () => {
  assert.equal(getSymbolCardLayout(SYMBOL_CATALOG.find(s => s.id === 'outlined-heart')), 'short')
  assert.equal(getSymbolCardLayout(SYMBOL_CATALOG.find(s => s.id === 'kao-table-flip')), 'kaomoji')
  assert.equal(getSymbolCardLayout(SYMBOL_CATALOG.find(s => s.id === 'happy-face')), 'kaomoji')
  assert.equal(getSymbolCardLayout(SYMBOL_CATALOG.find(s => s.id === 'divider-moon-long')), 'separator')
  assert.equal(getSymbolCardLayout(SYMBOL_CATALOG.find(s => s.id === 'heart-mending')), 'short')
  assert.equal(SYMBOL_CATALOG.find(s => s.id === 'kao-shrug-classic').value, '¯\\_(ツ)_/¯')
  assert.equal(SYMBOL_CATALOG.find(s => s.id === 'heart-mending').value, '❤️‍🩹')
})

test('searches multiple keywords and category labels without normalizing stored values', () => {
  assert(searchSymbols('lista tarefa').some(s => s.id === 'list-empty-square'))
  assert(searchSymbols('estudo papelaria').some(s => s.id === 'study-pencil'))
  assert(searchSymbols('MISTICOS').some(s => s.id === 'witchy-eye'))
  assert(searchSymbols('❤️‍🩹').some(s => s.id === 'heart-mending'))
  assert.deepEqual(searchSymbols('inexistente-abcd-xyz'), [])
})

test('search ignores accents in metadata without changing original symbol values', () => {
  assert.equal(normalizeSymbolSearchTerm(' Coração '), 'coracao')
  assert(searchSymbols('coracao').some(symbol => symbol.id === 'soft-heart'))
  assert(searchSymbols('girassol').some(symbol => symbol.id === 'sunflower-emoji'))
  assert(searchSymbols('GIRASSOL').some(symbol => symbol.id === 'sunflower-emoji'))
  assert(searchSymbols('♡').some(symbol => symbol.value.includes('♡')))

  const combinedSymbol = SYMBOL_CATALOG.find(symbol => symbol.id === 'angel-heart')
  assert.equal(combinedSymbol?.value, '˚₊‧꒰ა ♡ ໒꒱ ‧₊˚')
})

test('category filtering and search are pure and composable', () => {
  const original = [...SYMBOL_CATALOG]
  const hearts = filterSymbolsByCategory(SYMBOL_CATALOG, 'hearts')
  assert(hearts.every(symbol => symbol.category === 'hearts'))
  assert(searchSymbols('pink', hearts).some(symbol => symbol.id === 'pink-heart-emoji'))
  assert.deepEqual(SYMBOL_CATALOG, original)
})
