import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clampPosition, reorderLayers } from '../src/pages/Agenda/canvasGeometry.ts'

test('keeps the full post-it within the paper at each edge', () => {
  assert.deepEqual(clampPosition(-500, -100, 220, 180, 886, 1253), { x: 0, y: 0 })
  assert.deepEqual(clampPosition(9000, 9000, 220, 180, 886, 1253), { x: 666, y: 1073 })
})
test('preserves fractional persisted coordinates and handles oversized legacy elements', () => {
  assert.deepEqual(clampPosition(10.5, 20.25, 220, 180, 886, 1253), { x: 10.5, y: 20.25 })
  assert.deepEqual(clampPosition(100, 100, 1000, 1500, 886, 1253), { x: 0, y: 0 })
})

test('reorders one layer at a time and compacts the existing order', () => {
  const layers = [
    { id: 1, zIndex: -20 },
    { id: 2, zIndex: 4001 },
    { id: 3, zIndex: 8 },
  ]
  assert.deepEqual(reorderLayers(layers, 3, 'up'), [
    { id: 1, zIndex: 0 },
    { id: 2, zIndex: 1 },
    { id: 3, zIndex: 2 },
  ])
  assert.deepEqual(reorderLayers(layers, 1, 'front'), [
    { id: 3, zIndex: 0 },
    { id: 2, zIndex: 1 },
    { id: 1, zIndex: 2 },
  ])
  assert.deepEqual(reorderLayers(layers, 3, 'back'), [
    { id: 3, zIndex: 0 },
    { id: 1, zIndex: 1 },
    { id: 2, zIndex: 2 },
  ])
  assert.deepEqual(reorderLayers(layers, 1, 'back'), [])
})
