import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stabilizePoint, recognizeHeldShape } from '../src/pages/Agenda/drawingProcessing.ts'

test('four stabilization levels reduce jitter progressively and preserve pressure', () => {
  const raw = Array.from({ length: 40 }, (_, x) => ({ x: x * 5, y: x % 2 ? 10 : -10, pressure: 0.8 }))
  const variation = []
  for (let level = 0; level < 4; level++) {
    const filtered = [raw[0]]
    for (const p of raw.slice(1)) filtered.push(stabilizePoint(filtered.at(-1), p, level))
    assert.equal(filtered.at(-1).pressure, 0.8)
    if (level === 0) assert.deepEqual(filtered, raw)
    variation.push(filtered.slice(1).reduce((sum, p, i) => sum + Math.abs(p.y - filtered[i].y), 0))
  }
  assert(variation.every((v, i) => i === 0 || v < variation[i - 1]))
})

test('recognizes near-straight lines without mutating the original points', () => {
  const points = [{ x: 0, y: 0 }, { x: 30, y: 1 }, { x: 60, y: -1 }, { x: 100, y: 0 }]
  const original = structuredClone(points)
  assert.deepEqual(recognizeHeldShape(points), [points[0], points.at(-1)])
  assert.deepEqual(points, original)
})

test('recognizes closed ellipses and rectangles, rejects incomplete shapes and scribbles', () => {
  const ellipse = Array.from({ length: 49 }, (_, i) => ({ x: 100 + 70 * Math.cos(i * Math.PI / 24), y: 100 + 40 * Math.sin(i * Math.PI / 24) }))
  assert.equal(recognizeHeldShape(ellipse)?.length, 65)
  const corners = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }, { x: 0, y: 80 }, { x: 0, y: 0 }]
  const rectangle = corners.slice(1).flatMap((end, i) => Array.from({ length: 10 }, (_, j) => ({ x: corners[i].x + (end.x - corners[i].x) * j / 10, y: corners[i].y + (end.y - corners[i].y) * j / 10 })))
  rectangle.push(corners[0])
  assert.equal(recognizeHeldShape(rectangle)?.length, 5)
  assert.equal(recognizeHeldShape(ellipse.slice(0, 30)), null)
  assert.equal(recognizeHeldShape([{ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 0 }]), null)
  assert.equal(recognizeHeldShape([{ x: 1, y: 1 }]), null)
})
