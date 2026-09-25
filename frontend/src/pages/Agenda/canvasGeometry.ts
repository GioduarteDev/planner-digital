/** Coordinates are persisted in unscaled paper pixels, never viewport pixels. */
export function clampPosition(x: number, y: number, width: number, height: number, pageWidth: number, pageHeight: number) {
  return {
    x: Math.max(0, Math.min(x, Math.max(0, pageWidth - width))),
    y: Math.max(0, Math.min(y, Math.max(0, pageHeight - height))),
  }
}
