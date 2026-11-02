// Keep the original CSS, seven marks and opacity for all saved legacy variants.
export function LegacyWashi({ pattern, color }: { pattern: string; color: string }) {
  return <div className={`canvas-washi-element washi-${pattern}`} style={{ backgroundColor: color }}>
    <span /><span /><span /><span /><span /><span /><span />
  </div>
}
