import assert from 'node:assert/strict'
import test from 'node:test'
import { BUILT_IN_TEMPLATES, getTemplateEditableFields } from '../src/pages/Agenda/templateCatalog.ts'
import { WEEKLY_FREE_TEMPLATE_ID, freeWeekDates, freeWeekHeading, freeWeekNoteKey, freeWeekStart, shiftFreeWeek } from '../src/pages/Agenda/weeklyFreeModel.ts'

test('adds one optional spread without changing or replacing the previous template choices', () => {
  const prior = ['dashboard-blue', 'dashboard-kawaii', 'roadmap-blue', 'monthly-project', 'daily-study-grid', 'weekly-planning-clean', 'weekly-dotted-cat', 'weekly-cute-pastel', 'daily-study-focus', 'monthly-focus-tracker', 'weekly-scrapbook', 'weekly-open-journal', 'daily-time-block-study']
  assert.deepEqual(BUILT_IN_TEMPLATES.filter(item=>item.id!==WEEKLY_FREE_TEMPLATE_ID).map(item=>item.id), prior)
  const template = BUILT_IN_TEMPLATES.find(item=>item.id===WEEKLY_FREE_TEMPLATE_ID)
  assert.equal(template.createOnly, true)
  assert.equal(template.supportedMode, 'spread')
  assert.equal(template.paperType, 'blank')
  assert.equal(template.rightPaperType, 'grid')
  assert.deepEqual(template.spreadTitles, ['Planejamento', 'Página livre'])
  assert.deepEqual(getTemplateEditableFields(template, 886, 1253, 'right'), [])
  for (const item of BUILT_IN_TEMPLATES.filter(item=>item.id!==WEEKLY_FREE_TEMPLATE_ID)) assert.equal(item.createOnly, undefined)
})

test('generates Monday to Sunday including leap days and month/year transitions', () => {
  assert.deepEqual(freeWeekDates('2024-02-26').map(day=>day.key), ['2024-02-26','2024-02-27','2024-02-28','2024-02-29','2024-03-01','2024-03-02','2024-03-03'])
  assert.deepEqual(freeWeekDates('2026-12-28').map(day=>day.key), ['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'])
  assert.deepEqual(freeWeekDates('2026-11-02').map(day=>day.label), ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'])
  assert.equal(freeWeekStart('2026-11-01'), '2026-10-26')
  assert.equal(freeWeekStart('2026-02-30', '2026-03-04'), '2026-03-02')
  assert.equal(freeWeekStart('invalid', '2026-11-02'), '2026-11-02')
})

test('week navigation is reversible across DST boundaries and headings include both years when necessary', () => {
  for (const start of ['2026-03-02','2026-10-26','2026-12-28','2024-02-26']) {
    assert.equal(shiftFreeWeek(shiftFreeWeek(start, 1), -1), start)
    assert.equal(new Set([...freeWeekDates(start), ...freeWeekDates(shiftFreeWeek(start, 1))].map(day=>day.key)).size, 14)
  }
  assert.equal(freeWeekHeading('2026-12-28').month, 'dezembro 2026 / janeiro 2027')
  assert.equal(freeWeekHeading('2026-11-02').month, 'novembro 2026')
})

test('notes use date-specific keys and preserve whitespace/Unicode without touching other template data', () => {
  const text = '  Atividade\n\nᢉ𐭩   ♡ 👩🏽‍💻  '
  const first = freeWeekNoteKey('2026-11-02'), next = freeWeekNoteKey('2026-11-09')
  const data = { templateId: WEEKLY_FREE_TEMPLATE_ID, spreadSide: 'left', unrelated: { intact: true }, [first]: text }
  const changed = { ...data, [next]: 'Próxima semana' }
  assert.equal(changed[first], text)
  assert.notEqual(first, next)
  assert.deepEqual(changed.unrelated, data.unrelated)
})
