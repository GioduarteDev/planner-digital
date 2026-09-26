import assert from 'node:assert/strict'
import test from 'node:test'
import { addDays, deadlineGroup, deadlines, isoWeek, mondayOf, weeklySummary } from '../src/pages/Planning/planningModel.ts'

process.env.TZ = 'America/Sao_Paulo'
const today = '2026-09-25'
const now = new Date('2026-09-25T12:00:00-03:00')
const task = (id, day, extra = {}) => ({ id, text: `Task ${id}`, due_date: day, due_at: null, done: false, completed_at: null, subject_id: null, project_id: null, created_at: '2026-09-20T12:00:00', updated_at: null, ...extra })
const empty = () => ({ tasks: [], events: [], projects: [], studies: [], subjects: [] })

test('deadline buckets include yesterday, today, tomorrow, +3, +7, +10 without overlap', () => {
  assert.deepEqual([-1, 0, 1, 3, 7, 10].map(n => deadlineGroup(addDays(today, n), today)), ['Atrasados', 'Hoje', 'Amanhã', 'Próximos 7 dias', 'Próximos 7 dias', 'Depois'])
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})

test('one record per source, oldest overdue first; completed and undated entries excluded', () => {
  const data = empty()
  data.tasks = [task(1, today), task(2, '2026-09-23'), task(3, '2026-09-24'), task(4, today, { done: true }), task(5, null)]
  data.projects = [{ id: 1, title: 'Delivery', status: 'active', due_date: today, subject_id: 4 }, { id: 2, title: 'Done', status: 'completed', due_date: today, subject_id: null }]
  data.events = [{ id: 1, title: 'Exam', starts_at: '2026-09-26T01:30:00Z', ends_at: null, all_day: false, subject_id: 4, project_id: null }, { id: 2, title: 'Past', starts_at: '2026-09-23T10:00:00Z', ends_at: null, all_day: false, subject_id: null, project_id: null }]
  const result = deadlines(data, now)
  assert.deepEqual(result.slice(0, 2).map(x => x.id), [2, 3])
  assert.equal(result.length, 5)
  assert.equal(result.find(x => x.kind === 'event').day, today, 'UTC event belongs to local previous date')
  assert.equal(new Set(result.map(x => x.key)).size, result.length)
  data.tasks[0].done = true
  assert(!deadlines(data, now).some(x => x.key === 'task-1'))
  data.tasks[1].due_date = addDays(today, 10)
  assert.equal(deadlineGroup(deadlines(data, now).find(x => x.key === 'task-2').day, today), 'Depois')
})

test('ISO weeks start Monday and handle year boundaries', () => {
  assert.equal(mondayOf('2026-09-27'), '2026-09-21')
  assert.equal(mondayOf('2026-09-28'), '2026-09-28')
  assert.equal(isoWeek('2026-09-21'), '2026-W39')
  assert.equal(isoWeek('2026-12-31'), '2026-W53')
  assert.equal(isoWeek('2027-01-01'), '2026-W53')
  assert.equal(isoWeek('2027-01-04'), '2027-W01')
})

test('weekly totals use completion date, retain legacy uncertainty, aggregate actual subject IDs', () => {
  const data = empty()
  data.tasks = [task(1, '2026-10-01', { done: true, completed_at: '2026-09-25T13:00:00Z', project_id: 1 }), task(2, '2026-09-24'), task(3, '2026-09-26'), task(4, today, { done: true }), task(5, today, { done: true, completed_at: '2026-09-28T13:00:00Z' })]
  data.subjects = [{ id: 1, name: 'Algebra' }, { id: 2, name: 'History' }]
  data.studies = [{ id: 1, subject_id: 1, subject: 'Old name', project_id: null, study_date: today, duration_minutes: 45 }, { id: 2, subject_id: 1, subject: 'Algebra', project_id: null, study_date: today, duration_minutes: 30 }, { id: 3, subject_id: 2, subject: 'History', project_id: null, study_date: today, duration_minutes: 20 }]
  data.projects = [{ id: 1, title: 'Project', created_at: '2026-08-01T00:00:00', updated_at: null }]
  const result = weeklySummary(data, '2026-09-21', now)
  assert.deepEqual(result.completed.map(t => t.id), [1])
  assert.deepEqual(result.pending.map(t => t.id), [2, 3])
  assert.deepEqual(result.deferred.map(t => t.id), [2])
  assert.equal(result.minutes, 95)
  assert.equal(result.subjects[0].name, 'Algebra')
  assert.equal(result.subjects[0].minutes, 75)
  assert.equal(result.projects.length, 1)
  assert.equal(result.legacyCompleted.length, 1)
})
