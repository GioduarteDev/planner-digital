// Only new drafts pass through these helpers. Persisted strokes stay untouched.
export type InkPoint = { x: number; y: number; pressure?: number }
export type Stabilization = 0 | 1 | 2 | 3

export function stabilizePoint(previous: InkPoint, point: InkPoint, level: Stabilization): InkPoint {
  const alpha = [1, 0.75, 0.5, 0.25][level]
  return { ...point, x: previous.x + (point.x - previous.x) * alpha, y: previous.y + (point.y - previous.y) * alpha }
}

export const SHAPE_HOLD_MS = 650

// Conservative recognition: open lines, closed axis-aligned rectangles and ellipses.
// Results remain ordinary points, compatible with saving, rendering and erasing.
export function recognizeHeldShape(points: InkPoint[]): InkPoint[] | null {
  if (points.length < 4) return null
  const first = points[0], last = points[points.length - 1]
  const distance = (a: InkPoint, b: InkPoint) => Math.hypot(a.x - b.x, a.y - b.y)
  const length = points.slice(1).reduce((sum, p, i) => sum + distance(p, points[i]), 0)
  const chord = distance(first, last)
  if (chord > 24 && length < chord * 1.15 && points.every(p =>
    Math.abs((last.y - first.y) * (p.x - first.x) - (last.x - first.x) * (p.y - first.y)) / chord < Math.max(4, chord * 0.035))) {
    return [{ ...first }, { ...last }]
  }
  const xs = points.map(p => p.x), ys = points.map(p => p.y)
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys)
  const width = right - left, height = bottom - top
  if (Math.min(width, height) < 24 || chord > Math.max(10, Math.min(width, height) * 0.22)) return null
  const corners = [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }]
  const tolerance = Math.min(width, height) * 0.1
  if (length > (width + height) * 1.7 && length < (width + height) * 2.5
    && points.every(p => Math.min(Math.abs(p.x - left), Math.abs(p.x - right), Math.abs(p.y - top), Math.abs(p.y - bottom)) < tolerance)
    && corners.every(c => points.some(p => distance(c, p) < tolerance * 1.8))) {
    return [...corners, corners[0]].map(p => ({ ...p, pressure: first.pressure }))
  }
  const cx = (left + right) / 2, cy = (top + bottom) / 2
  const radii = points.map(p => Math.hypot((p.x - cx) / (width / 2), (p.y - cy) / (height / 2)))
  const sectors = new Set(points.map(p => Math.floor((Math.atan2((p.y - cy) / height, (p.x - cx) / width) + Math.PI) / (Math.PI / 4)) % 8))
  const perimeter = Math.PI * (3 * (width + height) / 2 - Math.sqrt((3 * width + height) * (width + 3 * height)) / 2)
  if (sectors.size < 8 || length < perimeter * 0.8 || length > perimeter * 1.3 || radii.some(r => Math.abs(r - 1) > 0.18)) return null
  const start = Math.atan2((first.y - cy) / height, (first.x - cx) / width)
  return Array.from({ length: 65 }, (_, i) => ({ x: cx + width / 2 * Math.cos(start + i * Math.PI / 32), y: cy + height / 2 * Math.sin(start + i * Math.PI / 32), pressure: first.pressure }))
}
