import { useLayoutEffect, useRef, useState } from 'react'
import { SYMBOL_FONT_FAMILY } from './symbolCatalog'

// Fit the complete sequence to its frame, including spaces and combining marks.
// SVG scaling follows the saved frame dimensions without changing the Unicode.
export function PaperieSymbol({ value, name, color, className = 'canvas-paperie-symbol' }: { value: string; name: string; color: string; className?: string }) {
  const textRef = useRef<SVGTextElement>(null)
  const [viewBox, setViewBox] = useState('0 -64 132 80')
  useLayoutEffect(() => {
    let cancelled = false
    const measure = () => {
      if (cancelled || !textRef.current) return
      const box = textRef.current.getBBox()
      if (box.width > 0 && box.height > 0) {
        setViewBox(`${box.x - 2} ${box.y - 2} ${box.width + 4} ${box.height + 4}`)
      }
    }
    measure()
    void document.fonts.ready.then(measure)
    return () => { cancelled = true }
  }, [value])
  return <svg className={className} width="100%" height="100%" viewBox={viewBox}
    preserveAspectRatio="xMidYMid meet" role="img" aria-label={name}>
    <text ref={textRef} fill={color} fontFamily={SYMBOL_FONT_FAMILY} fontSize="64" style={{ whiteSpace: 'pre' }}>{value}</text>
  </svg>
}
