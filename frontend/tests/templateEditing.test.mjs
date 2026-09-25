import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarDays, templateDate } from '../src/pages/Agenda/templateEditingModel.ts'

test('calendar aligns weekdays and supports leap years and six-week months', () => {
  assert.equal(calendarDays(2026, 8)[0], null) // September starts on Tuesday.
  assert.equal(calendarDays(2026, 8)[1], 1)
  assert.equal(calendarDays(2028, 1).filter(Boolean).length, 29)
  assert.equal(calendarDays(2027, 1).filter(Boolean).length, 28)
  assert.equal(calendarDays(2026, 2)[36], 31) // Sunday-start March spans six rows.
})

test('template dates accept Portuguese, English and numeric months without shifting years', () => {
  const anchor = { templateDate: '2026-09-21' }
  assert.equal(templateDate(anchor).getDate(), 21)
  assert.equal(templateDate({ ...anchor, month: 'October' }).getMonth(), 9)
  assert.equal(templateDate({ ...anchor, month: 'outubro' }).getMonth(), 9)
  assert.equal(templateDate({ ...anchor, month: '2', year: '2028' }).getFullYear(), 2028)
  assert.equal(templateDate({ ...anchor, month: 'incompleto' }).getMonth(), 8)
  assert.equal(templateDate({ ...anchor, year: '' }).getFullYear(), 2026)
})
