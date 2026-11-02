import { useId } from 'react'
import type { ScrapbookMaterial, ScrapbookPalette } from './scrapbookCatalog'

// The catalogue and canvas share this renderer, including the transparent photo
// apertures. No image is embedded, cropped or substituted for the original media.
export function ScrapbookArt({ material, palette, preview = false }: {
  material: ScrapbookMaterial; palette: ScrapbookPalette; preview?: boolean
}) {
  const id = `scrap-${useId().replace(/:/g, '')}`
  const { width: w, height: h } = material
  const { paper, edge, ink, accent } = palette
  const window = 'window' in material ? material.window : null
  const torn = `M3 6L23 3 43 7 63 2 85 6 108 3 132 8 158 3 181 6 ${w - 4} 3L${w - 2} ${h - 18} ${w - 13} ${h - 12} ${w - 29} ${h - 15} ${w - 42} ${h - 5} ${w - 60} ${h - 10} ${w - 79} ${h - 3} ${w - 101} ${h - 9} ${w - 123} ${h - 4} ${w - 149} ${h - 11} 22 ${h - 4} 4 ${h - 12} 7 ${h - 35} 2 ${h - 61}Z`
  const fiber = `url(#${id}-fiber)`
  const stock = `url(#${id}-stock)`
  const sprig = <g fill="none" stroke={accent} strokeWidth="1.7" strokeLinecap="round">
    <path d="M0 0Q-6 -32 6 -70" />
    {[-15, -30, -45, -60].map((y, i) => <path key={y} d={`M0 ${y}q${i % 2 ? -22 : 22} -20 ${i % 2 ? -17 : 17} -3q-5 9 ${i % 2 ? 17 : -17} 3`} fill={accent} fillOpacity=".3" />)}
  </g>
  return <svg className={`scrapbook-art${window ? ' has-window' : ''}${preview ? ' is-preview' : ''}`}
    data-scrapbook-material={material.id} viewBox={`0 0 ${w} ${h}`} width="100%" height="100%"
    preserveAspectRatio={preview ? 'xMidYMid meet' : 'none'} role={preview ? undefined : 'img'}
    aria-hidden={preview || undefined} aria-label={preview ? undefined : `${material.name} · ${palette.name}`}>
    <defs>
      <linearGradient id={`${id}-stock`} x2=".8" y2="1"><stop stopColor="#fffcf2" /><stop offset=".3" stopColor={paper} /><stop offset="1" stopColor={edge} stopOpacity=".65" /></linearGradient>
      <linearGradient id={`${id}-metal`}><stop stopColor={ink} /><stop offset=".3" stopColor="#f8f0e4" /><stop offset=".55" stopColor={edge} /><stop offset="1" stopColor={ink} /></linearGradient>
      <pattern id={`${id}-fiber`} width="29" height="31" patternUnits="userSpaceOnUse"><path d="M3 6l4 -1M17 22l5 1M24 12l2 -2" stroke={ink} strokeWidth=".5" opacity=".13" /><path d="M6 25l5 1M19 4l3 1" stroke="#fffdf1" opacity=".5" /></pattern>
      <clipPath id={`${id}-tear`}><path d={torn} /></clipPath>
    </defs>
    {window && material.id !== 'photo-corners' && <>
      <path data-photo-aperture="true" fillRule="evenodd" d={`M2 2H${w - 2}V${h - 2}H2ZM${window.x} ${window.y}v${window.height}h${window.width}V${window.y}Z`} fill={stock} stroke={edge} strokeWidth=".8" />
      <path fillRule="evenodd" d={`M3 3H${w - 3}V${h - 3}H3ZM${window.x} ${window.y}v${window.height}h${window.width}V${window.y}Z`} fill={fiber} />
      {material.id === 'polaroid' ? <path d={`M75 ${h - 27}q25 -5 70 0`} fill="none" stroke={ink} strokeWidth=".7" opacity=".3" />
        : <rect x="10" y="10" width={w - 20} height={h - 20} fill="none" stroke={ink} strokeWidth=".8" opacity=".5" />}
    </>}
    {material.id === 'photo-corners' && <g data-photo-aperture="true">
      {[`translate(2 2)`, `translate(${w - 2} 2) rotate(90)`, `translate(${w - 2} ${h - 2}) rotate(180)`, `translate(2 ${h - 2}) rotate(270)`].map(transform => <g key={transform} transform={transform}>
        <path d="M0 0H35L0 35Z" fill={stock} stroke={edge} strokeWidth=".8" /><path d="M1 29L29 1M4 4H23L4 23Z" fill="none" stroke={ink} strokeWidth=".6" opacity=".5" />
      </g>)}
    </g>}
    {['torn-edge', 'book', 'news', 'vellum'].includes(material.id) && <g clipPath={`url(#${id}-tear)`} opacity={material.id === 'vellum' ? .48 : 1}>
      <path d={torn} fill={stock} stroke={edge} strokeWidth="1" />
      <rect width={w} height={h} fill={fiber} />
      {material.id === 'torn-edge' && <path d={`M0 6H${w}M0 ${h - 13}q30 -7 50 2t50 -1t50 1t50 -2t55 0t55 1`} stroke="#fffaf0" strokeWidth="2" fill="none" opacity=".65" />}
      {material.id === 'vellum' && <g transform={`translate(${w - 50} ${h - 35})`}>{sprig}</g>}
      {material.id === 'book' && <g fill={ink} fontFamily="Georgia, serif">
        <text x="22" y="37" fontSize="12" fontStyle="italic">Um pequeno instante</text>
        <text x="22" y="55" fontSize="6.5">Colecionar dias, guardar memórias.</text>
        {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M22 ${70 + i * 8}h${i % 5 === 4 ? 107 : 155}`} stroke={ink} strokeWidth=".8" opacity=".62" />)}
        <text x="96" y="250" fontSize="7">24</text>
      </g>}
      {material.id === 'news' && <g fill={ink} fontFamily="Georgia, serif">
        <text x="18" y="28" fontSize="17" fontWeight="bold">THE PAPERIE POST</text>
        <text x="20" y="42" fontSize="6" letterSpacing="2">PEQUENAS HISTÓRIAS DO COTIDIANO</text>
        <path d="M18 48H220M18 51H220M119 58V174" stroke={ink} strokeWidth=".6" />
        {[0, 1].map(col => <g key={col} transform={`translate(${20 + col * 105} 62)`}>{Array.from({ length: 18 }, (_, i) => <path key={i} d={`M0 ${i * 6}h${i % 6 === 5 ? 65 : 91}`} stroke={ink} strokeWidth=".8" opacity=".65" />)}</g>)}
      </g>}
    </g>}
    {material.id === 'clip' && <>
      <path d="M19 88V28a9 9 0 0 1 18 0v67a16 16 0 0 1 -32 0V25a22 22 0 0 1 44 0v66" fill="none" stroke="#4f433730" strokeWidth="6" transform="translate(1 2)" />
      <path d="M19 88V28a9 9 0 0 1 18 0v67a16 16 0 0 1 -32 0V25a22 22 0 0 1 44 0v66" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="4" strokeLinecap="round" />
    </>}
    {material.id === 'label' && <>
      <path d="M30 6H209V94H30L5 50ZM26 50a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" fillRule="evenodd" fill={stock} stroke={edge} />
      <circle cx="31" cy="50" r="8" fill="none" stroke={ink} strokeWidth="2" opacity=".6" />
      <path d="M54 20H194V80H54M68 60H177" fill="none" stroke={ink} strokeWidth=".6" opacity=".55" />
      <path d="M31 48C6 25 2 63 28 53" fill="none" stroke={edge} strokeWidth="1.4" />
    </>}
    {material.id === 'ticket' && <>
      <path d="M4 4H256V43a14 14 0 0 0 0 28v40H4V71a14 14 0 0 0 0 -28Z" fill={stock} stroke={edge} />
      <path d="M191 10V105" stroke={ink} strokeDasharray="2 4" strokeWidth=".8" />
      <rect x="24" y="15" width="152" height="85" fill="none" stroke={ink} strokeWidth=".7" />
      <g fill={ink} textAnchor="middle" fontFamily="Georgia, serif"><text x="100" y="40" fontSize="9" letterSpacing="2">ADMIT ONE</text><text x="100" y="66" fontSize="17" fontStyle="italic">Little moments</text><text x="100" y="87" fontSize="7">MATCHA PAPERIE · 00024</text><text transform="translate(225 58) rotate(-90)" fontSize="10" letterSpacing="3">Nº 0024</text></g>
    </>}
    {material.id === 'stamp' && <>
      <rect x="5" y="5" width="115" height="145" fill={stock} stroke={paper} strokeWidth="8" strokeDasharray="3 5" />
      <rect x="14" y="14" width="97" height="127" fill="none" stroke={ink} strokeWidth=".7" />
      <g transform="translate(62 118)">{sprig}</g>
      <g fill={ink} fontFamily="Georgia, serif" textAnchor="middle"><text x="62" y="31" fontSize="8" letterSpacing="1.4">BOTANICAL</text><text x="62" y="132" fontSize="8">PAPERIE · 24</text></g>
      <path d="M80 60q22 -10 39 -3M78 65q22 -10 39 -3" stroke={ink} opacity=".25" fill="none" />
    </>}
    {material.id === 'card' && <>
      <rect x="3" y="3" width={w - 6} height={h - 6} fill={stock} stroke={edge} />
      <rect x="12" y="12" width={w - 24} height={h - 24} fill={fiber} stroke={ink} strokeWidth=".6" />
      <text x="26" y="42" fill={ink} fontFamily="Georgia, serif" fontSize="15" fontStyle="italic">Memórias do dia</text>
      {[75, 98, 121, 144].map(y => <path key={y} d={`M26 ${y}H199`} stroke={ink} opacity=".25" strokeWidth=".7" />)}
      <g transform="translate(226 149) scale(.65)">{sprig}</g>
    </>}
    {material.id === 'bookmark' && <>
      <path d="M5 3H60V159L32 140 5 159Z" fill={stock} stroke={edge} />
      <path d="M11 9H54V146L32 132 11 146Z" fill={fiber} stroke={ink} strokeWidth=".5" />
      <circle cx="32" cy="19" r="3" fill={ink} opacity=".45" /><g transform="translate(32 117) scale(.8)">{sprig}</g>
    </>}
    {material.id === 'botanical' && <g transform="translate(48 170) scale(1.8)">
      <g stroke="#fff7e8" strokeWidth="5" strokeLinejoin="round">{sprig}</g>{sprig}
    </g>}
  </svg>
}
