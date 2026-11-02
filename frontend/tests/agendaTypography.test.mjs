import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { AGENDA_FONTS, TEXT_FONT_CATEGORIES, DEFAULT_WRITING_STYLE, agendaStyleChanges, readAgendaTextStyle, restoreTextStyleKeys } from '../src/pages/Agenda/agendaTypography.ts'

test('provides all seven requested fonts, romantic titles, four categories and legacy system fallbacks', () => {
  assert.deepEqual(AGENDA_FONTS.slice(0, 7).map(font => font.name), ['Caveat', 'Kalam', 'Patrick Hand', 'Nunito', 'Quicksand', 'Fraunces', 'Cormorant Garamond'])
  for (const category of TEXT_FONT_CATEGORIES) assert(AGENDA_FONTS.some(font => font.category === category))
  for (const font of AGENDA_FONTS) assert(font.family.includes('Segoe UI Emoji') && font.family.includes('Segoe UI Symbol'))
  assert(DEFAULT_WRITING_STYLE.fontFamily.includes('Caveat'))
  const legacy = { text: 'Notas antigas', fontFamily: 'Unknown Legacy, Georgia', custom: true }
  const snapshot = structuredClone(legacy)
  assert.equal(readAgendaTextStyle(legacy).fontFamily, legacy.fontFamily)
  assert.equal(readAgendaTextStyle({}).fontFamily, '')
  assert.deepEqual(legacy, snapshot)
})

test('style filtering cannot replace text, normalize Unicode, trim spaces or drop metadata', () => {
  const text = '  Ação\n\nᢉ𐭩   ♡  e\u0301  👩🏽‍💻 👨‍👩‍👧‍👦 (｡•ᴗ•｡)  '
  const data = { text, custom: { intact: true }, fontFamily: 'Georgia' }
  const changes = agendaStyleChanges({ fontFamily: AGENDA_FONTS[1].family, fontSize: 32, text: 'forbidden', fontWeight: 'bold' })
  const next = { ...data, ...changes }
  assert.equal(next.text, text)
  assert.deepEqual(Buffer.from(next.text), Buffer.from(text))
  assert.deepEqual(next.custom, data.custom)
  const newer = { ...next, text: text + '\nMais palavras' }
  const undo = restoreTextStyleKeys(newer, data, ['fontFamily', 'fontWeight'])
  assert.equal(undo.fontFamily, 'Georgia')
  assert(!Object.hasOwn(undo, 'fontWeight'))
  assert.equal(undo.text, newer.text)
  assert.equal(restoreTextStyleKeys(undo, next, ['fontFamily']).text, newer.text)
})

test('rejects invalid numeric/color controls without disturbing valid style fields', () => {
  assert.deepEqual(agendaStyleChanges({ fontSize: NaN, lineHeight: Infinity, color: 'url(https://example.invalid)' }), {})
  assert.deepEqual(agendaStyleChanges({ fontSize: 7, lineHeight: 0 }), {})
  assert.deepEqual(agendaStyleChanges({ fontSize: 32, lineHeight: 2, color: '#aa6677', fontStyle: 'italic', textAlign: 'center' }), { fontSize: 32, color: '#aa6677', fontStyle: 'italic', textAlign: 'center', lineHeight: 2 })
})

test('all local font assets retain official OFL licenses, valid WOFF2 headers and source checksums', async () => {
  const root = new URL('../src/assets/paperie-fonts/', import.meta.url)
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'))
  assert.equal(manifest.length, 7)
  const css = await readFile(new URL('../src/pages/Agenda/AgendaFontFaces.css', import.meta.url), 'utf8')
  assert(!/url\(https?:/.test(css))
  for (const family of manifest) {
    const slug = new URL(family.license_url).pathname.split('/').at(-2)
    const license = await readFile(new URL(`${slug}/OFL.txt`, root), 'utf8')
    assert(license.includes('SIL OPEN FONT LICENSE Version 1.1'))
    assert(family.license_url.startsWith('https://raw.githubusercontent.com/google/fonts/'))
    for (const file of family.files) {
      const binary = await readFile(new URL(`${slug}/${file.file}`, root))
      assert.equal(binary.subarray(0, 4).toString(), 'wOF2')
      assert.equal(createHash('sha256').update(binary).digest('hex'), file.sha256)
      assert(css.includes(`${slug}/${file.file}`))
      assert(['latin', 'latin-ext'].includes(file.subset))
    }
  }
})
