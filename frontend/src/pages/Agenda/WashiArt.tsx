import { useId } from 'react'
import { WASHI_OUTLINES, type WashiDesign, type WashiEdge } from './washiCatalog'
import './WashiLibrary.css'

function Motif({ design }: { design: WashiDesign }) {
  const { motif, ink, accent } = design
  if (motif === 'gingham') return <g fill={ink}><path opacity=".24" d="M0 0H12V48H0ZM24 0H36V48H24ZM48 0H60V48H48Z" /><path opacity=".24" d="M0 0H64V12H0ZM0 24H64V36H0Z" /></g>
  if (motif === 'dots') return <g fill={ink} opacity=".65"><circle cx="12" cy="12" r="2.7" /><circle cx="44" cy="12" r="2.7" /><circle cx="28" cy="36" r="2.7" /><circle cx="60" cy="36" r="2.7" /></g>
  if (motif === 'strawberries') return <g transform="translate(15 8) rotate(-12 12 15)">
    <path d="M2 12C-2 1 8 -1 13 5C20 -2 30 4 25 14L16 32Q12 36 2 12Z" fill={ink} />
    <path d="M7 5l5 -8 3 7 9 -2 -5 7 -6 -3 -9 4Z" fill={accent} />
    <path d="M7 13l1 2M15 11v2M22 14l-1 2M11 21l1 2M18 22l-1 2M15 28v1" stroke="#fff4d9" strokeWidth="1.3" />
    <circle cx="40" cy="24" r="1.2" fill={accent} />
  </g>
  if (motif === 'cherries') return <g transform="translate(10 3)">
    <path d="M9 26Q23 11 23 3Q27 13 34 28M23 4q11 -5 15 1q-6 8 -15 -1" stroke={accent} strokeWidth="1.4" fill={accent} />
    <circle cx="9" cy="30" r="7" fill={ink} /><circle cx="35" cy="31" r="7" fill={ink} />
    <path d="M5 27l2 -1M31 28l2 -1" stroke="#fff3e4" strokeWidth="1.5" strokeLinecap="round" />
  </g>
  if (motif === 'flowers' || motif === 'sakura' || motif === 'daisies') return <g transform="translate(30 22)">
    {motif === 'flowers' && <path d="M0 0q-6 12 -2 24M-2 17q-16 -10 -12 -2q3 5 12 2M-2 20q15 -12 13 -4q-1 6 -13 4" stroke={accent} fill={accent} />}
    {Array.from({ length: motif === 'daisies' ? 8 : 5 }, (_, i) => <g key={i} transform={`rotate(${i * (motif === 'daisies' ? 45 : 72)})`}>
      {motif === 'sakura' ? <path d="M0 0Q-11 -8 -5 -15L0 -12 5 -15Q11 -8 0 0" fill={ink} opacity=".8" />
        : <ellipse cx="0" cy="-7" rx={motif === 'daisies' ? 3 : 4.5} ry="8" fill={motif === 'daisies' ? '#fffaf0' : ink} stroke={motif === 'daisies' ? accent : 'none'} strokeWidth=".4" />}
    </g>)}
    <circle r="3.2" fill={motif === 'daisies' ? '#d9ae59' : accent} />
    <circle cx="25" cy="13" r="1" fill={ink} opacity=".5" />
  </g>
  if (motif === 'hearts') return <g fill={ink}><path d="M8 16C1 4 17 1 21 10C26 0 41 7 33 18L21 32Z" opacity=".7" /><path d="M45 31C41 24 49 22 51 27C54 22 62 26 57 32L51 39Z" opacity=".45" /><circle cx="42" cy="10" r="1" fill={accent} /></g>
  if (motif === 'bows') return <g transform="translate(32 21)" stroke={ink} strokeWidth="1.2" fill={ink} fillOpacity=".25">
    <path d="M-2 0Q-24 -21 -24 -7Q-26 8 -2 2M2 0Q24 -21 24 -7Q26 8 2 2M-3 2l-9 18 8 -2 3 5 6 -20M2 2l11 17 -8 -1 -2 5 -5 -20" />
    <ellipse rx="3" ry="4" fill={ink} fillOpacity=".8" />
  </g>
  if (motif === 'stars' || motif === 'sky') return <g fill={ink}>
    <path d="M17 7l3 8 9 1 -7 6 2 9 -7 -5 -8 5 2 -9 -7 -6 9 -1Z" opacity=".7" />
    <path d="M46 24l2 5 6 1 -5 4 2 6 -5 -3 -5 3 1 -6 -4 -4 6 -1Z" fill={accent} />
    {motif === 'sky' && <path d="M47 3a10 10 0 1 0 10 12A10 10 0 0 1 47 3" fill="#fff9dd" />}
    <circle cx="35" cy="10" r="1" /><circle cx="5" cy="38" r=".8" />
  </g>
  if (motif === 'clouds') return <g fill="#fffaf1" stroke={ink} strokeWidth=".6" strokeOpacity=".4">
    <path d="M9 28C-2 27 3 16 10 18C9 5 27 3 31 15C43 11 49 29 37 29Z" />
    <path d="M45 42C38 41 41 33 47 34C46 27 58 26 59 34C67 33 69 43 62 43Z" opacity=".8" />
  </g>
  if (motif === 'leaves') return <g stroke={ink} fill={accent} strokeWidth=".8" transform="translate(14 4)">
    <path d="M0 40Q20 19 32 0M9 30Q-7 18 -1 13Q13 14 9 30M17 21Q31 28 37 17Q28 11 17 21M24 11Q10 1 17 -2Q28 -1 24 11" />
    <path d="M10 30L0 17M18 21l15 -2M24 11l-5 -10" fill="none" />
  </g>
  if (motif === 'lace') return <g fill="none" stroke="#fffaf0" strokeWidth="1.4">
    <path d="M0 8H64M0 40H64M0 12Q8 28 16 12Q24 28 32 12Q40 28 48 12Q56 28 64 12M0 36Q8 20 16 36Q24 20 32 36Q40 20 48 36Q56 20 64 36" />
    {[8, 24, 40, 56].map(x => <g key={x}><circle cx={x} cy="24" r="3" /><circle cx={x} cy="4" r="1" /><circle cx={x} cy="44" r="1" /></g>)}
  </g>
  if (motif === 'news') return <g fill={ink} stroke={ink} opacity=".75">
    <text x="3" y="11" fontSize="7" fontFamily="Georgia, serif" fontWeight="bold" stroke="none">PETIT MATCHA</text>
    <path d="M3 14H61M32 18V45" strokeWidth=".5" />
    {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M3 ${19 + i * 4}h${i % 3 === 0 ? 21 : 25}M36 ${19 + i * 4}h${i % 3 === 1 ? 18 : 24}`} strokeWidth=".7" />)}
  </g>
  return <g stroke={ink} strokeWidth=".65" fill="none" opacity=".8">
    <path d="M6 7H28V39H6ZM10 14H24M10 20H24M10 26H20M10 32H24" fill="#fffaf0" fillOpacity=".5" />
    <path d="M39 27h13v12q-6 4 -13 0ZM52 29q10 -1 5 7h-5" fill={accent} fillOpacity=".45" />
    <path d="M43 20q-4 -3 0 -6M35 7l2 4 5 1 -4 3 1 4 -4 -2 -4 2 1 -4 -4 -3 5 -1Z" />
    <circle cx="58" cy="10" r="1.2" fill={accent} />
  </g>
}

export function WashiArt({ design, edge, opacity = .9, paper = design.paper, width = 300, height = 54, preview = false }: {
  design: WashiDesign; edge: WashiEdge; opacity?: number; paper?: string; width?: number; height?: number; preview?: boolean
}) {
  const id = useId().replace(/:/g, '')
  const outline = <path d={WASHI_OUTLINES[edge]} transform={`scale(${width / 100} ${height / 100})`} />
  return <svg className="paperie-washi-art" viewBox={`0 0 ${width} ${height}`} width="100%" height="100%"
    role={preview ? undefined : 'img'} aria-hidden={preview || undefined} aria-label={preview ? undefined : design.name}
    preserveAspectRatio={preview ? 'xMidYMid meet' : 'none'} style={{ opacity }}>
    <defs>
      <clipPath id={`${id}-edge`}>{outline}</clipPath>
      <pattern id={`${id}-motif`} width={design.arrangement === 'duet' ? 84 : 64} height={height}
        viewBox={design.arrangement === 'duet' ? '0 0 84 48' : '0 0 64 48'}
        patternTransform={design.arrangement === 'diagonal' ? 'rotate(-12)' : undefined}
        patternUnits="userSpaceOnUse" preserveAspectRatio="xMidYMid meet">
        {design.arrangement === 'duet' ? <><g transform="translate(1 0) scale(.65)"><Motif design={design} /></g><g transform="translate(42 16) scale(.65)"><Motif design={design} /></g></> : <Motif design={design} />}
      </pattern>
      <pattern id={`${id}-fiber`} width="31" height="19" patternUnits="userSpaceOnUse">
        <path d="M3 5l4 -1M21 14l3 1M12 17l2 -2" stroke={design.ink} strokeWidth=".4" opacity=".13" />
        <path d="M15 4l5 1M2 12l3 -1" stroke="#fffdf5" strokeWidth=".6" opacity=".5" />
      </pattern>
      <linearGradient id={`${id}-sheen`} x2="0" y2="1"><stop stopColor="#ffffff" stopOpacity=".2" /><stop offset=".45" stopColor="#ffffff" stopOpacity="0" /><stop offset="1" stopColor={design.ink} stopOpacity=".08" /></linearGradient>
    </defs>
    <g clipPath={`url(#${id}-edge)`}>
      <rect width="100%" height="100%" fill={paper} /><rect width="100%" height="100%" fill={`url(#${id}-motif)`} />
      <rect width="100%" height="100%" fill={`url(#${id}-fiber)`} /><rect width="100%" height="100%" fill={`url(#${id}-sheen)`} />
      {edge !== 'straight' && <g fill="none" stroke="#fff9ed" strokeOpacity=".6" strokeWidth=".4">{outline}</g>}
    </g>
  </svg>
}
