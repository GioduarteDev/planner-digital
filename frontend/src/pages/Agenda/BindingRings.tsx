export function BindingRings({ left, top, height, scale }: {
  left: number; top: number; height: number; scale: number
}) {
  const count = Math.max(5, Math.min(13, Math.floor(height / 78)))
  return <div className="binding-rings" aria-hidden="true"
    style={{ left, top, height, '--ring-scale': scale } as CSSProperties}>
    {Array.from({ length: count }, (_, index) => <span className="binding-ring" key={index} />)}
  </div>
}
import type { CSSProperties } from 'react'
