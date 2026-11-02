export const WASHI_KIND = 'washi-v1'
export const WASHI_CATEGORIES = [
  { id: 'fruit', name: 'Frutinhas' }, { id: 'garden', name: 'Jardim' },
  { id: 'romantic', name: 'Corações & Laços' }, { id: 'geometry', name: 'Clássicos' },
  { id: 'sky', name: 'Céu & Estrelas' }, { id: 'vintage', name: 'Vintage & Rendas' },
  { id: 'korean', name: 'Papelaria coreana' },
] as const
export const WASHI_PALETTES = [
  { id: 'cream', name: 'Creme', paper: '#f6e9ce', ink: '#a67460', accent: '#879578' },
  { id: 'rose', name: 'Rosa', paper: '#f3d8de', ink: '#ab526a', accent: '#849967' },
  { id: 'matcha', name: 'Matcha', paper: '#dce5c9', ink: '#63794d', accent: '#bf7989' },
  { id: 'lilac', name: 'Lilás', paper: '#e4dcf0', ink: '#8a6d9e', accent: '#bda56d' },
  { id: 'sky', name: 'Azul névoa', paper: '#dbeaf0', ink: '#6b91a6', accent: '#d09b9f' },
  { id: 'vintage', name: 'Vintage', paper: '#dac6a5', ink: '#695344', accent: '#9f805d' },
] as const
type PaletteId = (typeof WASHI_PALETTES)[number]['id']
type CategoryId = (typeof WASHI_CATEGORIES)[number]['id']
export type WashiMotif = 'strawberries' | 'cherries' | 'flowers' | 'sakura' | 'daisies' | 'hearts' | 'bows' | 'gingham' | 'dots' | 'stars' | 'sky' | 'clouds' | 'leaves' | 'lace' | 'news' | 'korean'
export const WASHI_EDGES = [
  { id: 'straight', name: 'Reta' }, { id: 'irregular', name: 'Pontas irregulares' }, { id: 'torn', name: 'Papel rasgado' },
] as const
export type WashiEdge = (typeof WASHI_EDGES)[number]['id']
export const WASHI_WIDTHS = [{ height: 32, name: 'Fininha' }, { height: 54, name: 'Clássica' }, { height: 80, name: 'Larga' }] as const

const motifs: readonly { id: WashiMotif; name: string; category: CategoryId; palettes: readonly PaletteId[] }[] = [
  { id: 'strawberries', name: 'Morangos de jardim', category: 'fruit', palettes: ['cream', 'rose', 'matcha'] },
  { id: 'cherries', name: 'Cerejas em dupla', category: 'fruit', palettes: ['rose', 'cream', 'sky'] },
  { id: 'flowers', name: 'Flores prensadas', category: 'garden', palettes: ['cream', 'lilac', 'matcha'] },
  { id: 'sakura', name: 'Sakura em flor', category: 'garden', palettes: ['rose', 'sky', 'cream'] },
  { id: 'daisies', name: 'Campo de margaridas', category: 'garden', palettes: ['matcha', 'lilac', 'sky'] },
  { id: 'hearts', name: 'Bilhetes de carinho', category: 'romantic', palettes: ['rose', 'cream', 'lilac'] },
  { id: 'bows', name: 'Laços de cetim', category: 'romantic', palettes: ['rose', 'lilac', 'matcha'] },
  { id: 'gingham', name: 'Xadrez de piquenique', category: 'geometry', palettes: ['matcha', 'rose', 'lilac'] },
  { id: 'dots', name: 'Poá de açúcar', category: 'geometry', palettes: ['cream', 'sky', 'rose'] },
  { id: 'stars', name: 'Estrelinhas miúdas', category: 'sky', palettes: ['lilac', 'cream', 'sky'] },
  { id: 'sky', name: 'Céu de sonhos', category: 'sky', palettes: ['sky', 'lilac', 'rose'] },
  { id: 'clouds', name: 'Nuvens de algodão', category: 'sky', palettes: ['sky', 'rose', 'matcha'] },
  { id: 'leaves', name: 'Herbário matcha', category: 'garden', palettes: ['matcha', 'cream', 'vintage'] },
  { id: 'lace', name: 'Renda de gaveta', category: 'vintage', palettes: ['cream', 'rose', 'vintage'] },
  { id: 'news', name: 'Gazeta de memórias', category: 'vintage', palettes: ['vintage', 'cream', 'rose'] },
  { id: 'korean', name: 'Meu pequeno estudo', category: 'korean', palettes: ['matcha', 'lilac', 'rose'] },
]
export type WashiDesign = {
  id: string; name: string; category: CategoryId; motif: WashiMotif
  paletteId: PaletteId; paper: string; ink: string; accent: string; edge: WashiEdge
  arrangement: 'row' | 'duet' | 'diagonal'
}
// Stable motif/palette IDs let future kits add designs without changing saved tapes.
export const WASHI_CATALOG: readonly WashiDesign[] = motifs.flatMap((motif, motifIndex) => motif.palettes.map((paletteId, index) => {
  const palette = WASHI_PALETTES.find(item => item.id === paletteId)!
  return { id: `${motif.id}-${paletteId}`, name: `${motif.name} · ${palette.name}`, category: motif.category,
    motif: motif.id, paletteId, paper: palette.paper,
    ink: motif.category === 'fruit' ? (paletteId === 'rose' ? '#a94e66' : '#ba6376') : palette.ink,
    accent: motif.category === 'fruit' ? '#7b9468' : palette.accent,
    edge: WASHI_EDGES[(motifIndex + index) % WASHI_EDGES.length].id,
    arrangement: (['row', 'duet', 'diagonal'] as const)[index] }
}))

export function washiData(design: WashiDesign, edge: WashiEdge, opacity: number, paper = design.paper) {
  return { paperieKind: WASHI_KIND, pattern: design.id, edge, opacity, color: paper }
}
export function getPaperieWashi(data: Record<string, unknown>) {
  if (data.paperieKind !== WASHI_KIND) return null
  const design = WASHI_CATALOG.find(item => item.id === data.pattern)
  if (!design) return null
  const edge = WASHI_EDGES.find(item => item.id === data.edge)?.id ?? design.edge
  const opacity = typeof data.opacity === 'number' && Number.isFinite(data.opacity) ? Math.min(1, Math.max(.2, data.opacity)) : .9
  const paper = typeof data.color === 'string' && /^#[a-f0-9]{6}$/i.test(data.color) ? data.color : design.paper
  return { design, edge, opacity, paper }
}

export const WASHI_OUTLINES: Record<WashiEdge, string> = {
  straight: 'M0 0H100V100H0Z',
  irregular: 'M2 0H98L97 12 100 26 98 39 99 53 97 67 100 81 98 100H2L3 86 0 72 2 59 1 44 3 30 0 17Z',
  torn: 'M2 5L7 2 11 5 16 1 21 4 26 2 31 5 36 1 41 4 47 2 52 5 58 1 64 4 70 2 76 5 82 1 88 4 94 2 98 5L97 18 100 31 98 44 99 58 97 72 100 86 98 96L93 99 88 96 82 100 76 97 70 99 65 95 59 99 53 97 47 100 41 96 36 99 30 97 24 100 18 96 12 99 7 97 2 99L3 85 0 72 2 58 1 44 3 29 0 16Z',
}
