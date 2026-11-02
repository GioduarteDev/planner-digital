import { useId } from 'react'
import type { TornPaperCollection, TornPaperFormat } from './tornPaperCatalog'

// Original vector motifs, shared by thumbnails and inserted papers. No external assets.
export function TornPaperArt({ format, collection, preview = false }: {
  format: TornPaperFormat; collection: TornPaperCollection; preview?: boolean
}) {
  const id = useId().replace(/:/g, '')
  const { paper, ink, accent, pattern } = collection
  const path = <path d={format.path} transform={`scale(${format.width / 100} ${format.height / 100})`} />
  const repeat = pattern === 'news' || pattern === 'book' || pattern === 'academia' ? 138 : pattern === 'music' ? 90 : 64
  return <svg className={`torn-paper-art${preview ? ' is-preview' : ''}`} viewBox={`0 0 ${format.width} ${format.height}`}
    width="100%" height="100%" preserveAspectRatio={preview ? 'xMidYMid meet' : 'none'}
    role={preview ? undefined : 'img'} aria-label={preview ? undefined : `${format.name} · ${collection.name}`} aria-hidden={preview || undefined}>
    <defs>
      <clipPath id={`${id}-cut`}>{path}</clipPath>
      <linearGradient id={`${id}-wash`} x2=".9" y2="1">
        <stop stopColor={paper} /><stop offset=".65" stopColor={paper} /><stop offset="1" stopColor={accent} stopOpacity=".45" />
      </linearGradient>
      <pattern id={`${id}-fiber`} width="37" height="29" patternUnits="userSpaceOnUse">
        <path d="M3 6l4 -1M21 19l5 1M12 25l2 -2M30 3l3 1" stroke={ink} strokeWidth=".45" opacity=".16" />
        <path d="M7 17l3 1M31 24l2 -1" stroke="#fff8e8" strokeWidth=".7" opacity=".35" />
      </pattern>
      <pattern id={`${id}-print`} width={repeat} height={pattern === 'ruled' ? 20 : repeat} patternUnits="userSpaceOnUse">
        {pattern === 'ruled' && <path d="M0 19.5H64" stroke={ink} strokeWidth=".7" opacity=".65" />}
        {pattern === 'news' && <g fill={ink} opacity=".75">
          <text x="7" y="14" fontSize="9" fontFamily="Georgia, serif" fontWeight="bold">MATCHA JOURNAL</text>
          <path d="M7 19H130M7 22H130M69 28V133" stroke={ink} strokeWidth=".65" />
          {[0, 1, 2].map(col => <g key={col} transform={`translate(${8 + col * 43} 29)`}>
            {Array.from({ length: 17 }, (_, row) => <path key={row} d={`M0 ${row * 6}h${row % 4 === 0 ? 27 : 36}`} stroke={ink} strokeWidth=".8" />)}
          </g>)}
        </g>}
        {pattern === 'book' && <g fill={ink} opacity=".7" fontFamily="Georgia, serif">
          <text x="12" y="21" fontSize="15" fontStyle="italic">Pequenas memórias</text>
          <text x="12" y="36" fontSize="6">Um instante, uma folha, um novo começo.</text>
          {Array.from({ length: 12 }, (_, row) => <path key={row} d={`M12 ${47 + row * 7}h${row % 5 === 4 ? 78 : 112}`} stroke={ink} strokeWidth=".8" />)}
          <text x="64" y="136" fontSize="6">12</text>
        </g>}
        {pattern === 'music' && <g stroke={ink} fill={ink} opacity=".75">
          {[10, 19, 28, 37, 46, 61, 68, 75, 82, 89].map(y => <path key={y} d={`M0 ${y}H90`} strokeWidth=".6" />)}
          {[12, 38, 64].map((x, i) => <g key={x} transform={`translate(${x} ${28 + i % 2 * 9})`}>
            <ellipse rx="3.5" ry="2.5" transform="rotate(-20)" /><path d="M3 0V-20q10 3 6 10" fill="none" strokeWidth="1.3" />
          </g>)}
          <path d="M8 61V89M74 10V46" strokeWidth="1" />
        </g>}
        {pattern === 'strawberry' && <g transform="translate(16 15) rotate(-12 10 12)">
          <path d="M1 8C0 0 9 -1 12 4C18 -2 26 4 22 12L13 27Q9 29 1 8" fill={ink} opacity=".85" />
          <path d="M6 3l4 -6 3 5 7 -1 -4 6 -5 -3 -7 3" fill={accent} />
          <path d="M5 9l1 2M12 8v2M18 9l-1 2M9 15l1 2M15 15l-1 2M12 21v1" stroke="#fff1d7" strokeWidth="1.2" />
          <circle cx="37" cy="32" r="1" fill={ink} opacity=".45" />
        </g>}
        {pattern === 'floral' && <g transform="translate(30 28)">
          <path d="M0 0q-7 15 0 29M-1 17q-18 -8 -14 -1q4 7 14 1M-2 22q17 -13 15 -5q-1 8 -15 5" stroke={accent} strokeWidth="1" fill={accent} />
          {[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} rx="4" ry="8" cy="-7" fill={ink} opacity=".65" transform={`rotate(${angle})`} />)}
          <circle r="3" fill="#d3b575" />
        </g>}
        {pattern === 'study' && <g fill="none" stroke={ink} strokeWidth=".8" opacity=".7">
          <path d="M7 8H30V37H7ZM11 15H26M11 20H26M11 25H20M11 30H24" />
          <path d="M41 36h14v13q-7 5 -14 0ZM55 38q11 -1 5 9h-5" fill={accent} fillOpacity=".3" />
          <path d="M47 27q-4 -3 0 -6M13 48l3 3 6 -7M39 9l2 4 5 1 -4 3 1 5 -4 -2 -4 2 1 -5 -4 -3 5 -1Z" />
        </g>}
        {pattern === 'academia' && <g stroke={ink} fill="none" opacity=".55">
          <path d="M10 8H127V129H10ZM15 13H122V124H15M20 21H117M20 118H117" strokeWidth=".6" />
          <path d="M34 39q17 -8 34 0q17 -8 34 0v41q-17 -8 -34 0q-17 -8 -34 0ZM68 39V80" strokeWidth="1" />
          <path d="M42 47H59M42 53H59M42 59H59M77 47H94M77 53H94M77 59H94M37 96H99M43 102H93M51 108H85" strokeWidth=".7" />
        </g>}
        {pattern === 'witchy' && <g stroke={ink} fill="none" opacity=".8">
          <path d="M22 8a12 12 0 1 0 11 19A12 12 0 0 1 22 8Z" fill={ink} stroke="none" />
          <path d="M48 8l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2ZM42 38l9 6 -3 17 -9 -6Z M42 38l1 16 5 7M9 45l3 -4 3 4 -3 4Z" strokeWidth=".8" />
          <circle cx="10" cy="28" r="1" fill={ink} /><circle cx="29" cy="50" r=".8" fill={ink} />
        </g>}
        {pattern === 'fibers' && <g fill={accent} opacity=".4"><circle cx="14" cy="20" r=".8" /><circle cx="44" cy="49" r=".6" /></g>}
      </pattern>
    </defs>
    <g clipPath={`url(#${id}-cut)`}>
      <rect width="100%" height="100%" fill={paper} />
      <rect width="100%" height="100%" fill={`url(#${id}-wash)`} opacity=".6" />
      <rect width="100%" height="100%" fill={`url(#${id}-print)`} />
      {pattern === 'ruled' && <path d={`M27 0V${format.height}`} stroke={accent} strokeWidth="1" opacity=".6" />}
      <rect width="100%" height="100%" fill={`url(#${id}-fiber)`} />
      <g fill="none" stroke="#fff7e3" strokeOpacity=".55" strokeWidth="1.4">{path}</g>
    </g>
  </svg>
}
