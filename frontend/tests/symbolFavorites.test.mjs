import assert from 'node:assert/strict'
import test from 'node:test'
import { createSymbolFavorites, readSymbolFavorites, SYMBOL_FAVORITES_KEY } from '../src/pages/Agenda/symbolFavorites.ts'
import { enqueueAgendaSettingsWrite } from '../src/pages/Agenda/agendaSettingsQueue.ts'
import { SYMBOL_CATALOG, filterSymbolsByCategory, searchSymbols } from '../src/pages/Agenda/symbolCatalog.ts'

const validIds = new Set(SYMBOL_CATALOG.map(item => item.id))
const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

test('reads only stable string IDs, deduplicates, and handles missing/malformed preferences', () => {
  for (const value of [undefined, null, 'soft-heart', {}, 42]) assert.deepEqual(readSymbolFavorites(value), [])
  assert.deepEqual(readSymbolFavorites(['soft-heart', '', 2, null, 'soft-heart', 'future-id']), ['soft-heart', 'future-id'])
})

test('blocks changes before loading and ignores invalid IDs without a request', () => {
  const writes = []
  const store = createSymbolFavorites(async ids => writes.push(ids), validIds)
  store.toggle('soft-heart')
  assert.equal(store.getSnapshot().ready, false)
  store.load(['soft-heart'])
  store.toggle('not-in-catalog')
  store.load([]) // A repeated load must not overwrite user state.
  assert.deepEqual(store.getSnapshot().ids, ['soft-heart'])
  assert.deepEqual(writes, [])
})

test('rapid add/remove writes are serialized with theme, week and tabs; reload preserves final selection', async () => {
  const tabs = [{ id: 'tab-1', label: 'Notas', target: 'page:1' }]
  let settings = { editor_theme: 'dark', weekly_open_journal_week: '2026-10-26', page_tabs_v1: tabs, extra: { untouched: true }, [SYMBOL_FAVORITES_KEY]: ['future-id'] }
  let active = 0; let peak = 0
  const patches = []
  const write = patch => enqueueAgendaSettingsWrite(101, async () => {
    peak = Math.max(peak, ++active)
    await tick()
    patches.push(patch)
    settings = { ...settings, ...patch }
    active--
  })
  const store = createSymbolFavorites(ids => write({ [SYMBOL_FAVORITES_KEY]: ids }), validIds)
  store.load(settings[SYMBOL_FAVORITES_KEY])
  store.toggle('soft-heart')
  store.toggle('coquette-orbit')
  store.toggle('soft-heart')
  const week = write({ weekly_open_journal_week: '2026-11-02' })
  const theme = write({ editor_theme: 'light' })
  const markers = write({ page_tabs_v1: tabs })
  store.toggle('happy-kaomoji') // Unknown IDs cannot enter via toggle.
  await Promise.all([week, theme, markers])
  await tick()
  assert.equal(peak, 1)
  assert.deepEqual(settings[SYMBOL_FAVORITES_KEY], ['future-id', 'coquette-orbit'])
  assert.deepEqual(store.getSnapshot().ids, settings[SYMBOL_FAVORITES_KEY])
  assert.equal(store.getSnapshot().saving, false)
  assert.equal(settings.editor_theme, 'light')
  assert.equal(settings.weekly_open_journal_week, '2026-11-02')
  assert.deepEqual(settings.page_tabs_v1, tabs)
  assert.deepEqual(settings.extra, { untouched: true })
  assert(patches.every(patch => Object.keys(patch).length === 1))
  const reloaded = createSymbolFavorites(async () => {}, validIds)
  reloaded.load(settings[SYMBOL_FAVORITES_KEY])
  assert.deepEqual(reloaded.getSnapshot().ids, store.getSnapshot().ids)
  assert.deepEqual(filterSymbolsByCategory(SYMBOL_CATALOG, 'favorites', reloaded.getSnapshot().ids).map(item => item.id), ['coquette-orbit'])
  assert.equal(searchSymbols('orbita', filterSymbolsByCategory(SYMBOL_CATALOG, 'favorites', reloaded.getSnapshot().ids)).length, 1)
})

test('failed writes restore the last confirmed state, expose an error and allow retry', async () => {
  let fail = true
  const store = createSymbolFavorites(ids => enqueueAgendaSettingsWrite(102, async () => {
    if (fail) throw new Error('offline')
    return ids
  }), validIds)
  store.load(['coquette-orbit'])
  store.toggle('soft-heart')
  await tick()
  assert.deepEqual(store.getSnapshot().ids, ['coquette-orbit'])
  assert(store.getSnapshot().error)
  assert.equal(store.getSnapshot().saving, false)
  fail = false
  store.toggle('soft-heart')
  await tick()
  assert.deepEqual(store.getSnapshot().ids, ['coquette-orbit', 'soft-heart'])
  assert.equal(store.getSnapshot().error, '')
})

test('an earlier failed write cannot roll back newer clicks; final failure restores last success', async () => {
  const first = deferred(); const second = deferred()
  let count = 0
  const store = createSymbolFavorites(() => ++count === 1 ? first.promise : second.promise, validIds)
  store.load([])
  store.toggle('soft-heart')
  store.toggle('coquette-orbit')
  first.reject(new Error('offline'))
  await tick()
  assert.deepEqual(store.getSnapshot().ids, ['soft-heart', 'coquette-orbit'])
  second.resolve()
  await tick()
  assert.equal(store.getSnapshot().error, '')
  assert.equal(store.getSnapshot().saving, false)

  const writes = [deferred(), deferred()]; let index = 0
  const another = createSymbolFavorites(() => writes[index++].promise, validIds)
  another.load([])
  another.toggle('soft-heart'); another.toggle('coquette-orbit')
  writes[0].resolve(); await tick()
  writes[1].reject(new Error('offline')); await tick()
  assert.deepEqual(another.getSnapshot().ids, ['soft-heart'])
})

test('kaomoji favorites can be added, filtered and removed to an empty persisted list', async () => {
  const kaomoji = SYMBOL_CATALOG.find(item => item.category === 'kaomojis')
  let saved
  const store = createSymbolFavorites(async ids => { saved = ids }, validIds)
  store.load([])
  store.toggle(kaomoji.id); await tick()
  assert.deepEqual(filterSymbolsByCategory(SYMBOL_CATALOG, 'favorites', saved), [kaomoji])
  store.toggle(kaomoji.id); await tick()
  assert.deepEqual(saved, [])
})
