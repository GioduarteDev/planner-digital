export const SCRAPBOOK_KIND = 'scrapbook-v1'

// Original, local vector materials. IDs are persisted; names/order may evolve.
export const SCRAPBOOK_MATERIALS = [
  { id: 'polaroid', name: 'Moldura Polaroid', category: 'Molduras', width: 220, height: 270, window: { x: 18, y: 18, width: 184, height: 192 } },
  { id: 'frame', name: 'Moldura de papel', category: 'Molduras', width: 270, height: 210, window: { x: 25, y: 25, width: 220, height: 160 } },
  { id: 'photo-corners', name: 'Cantoneiras de fotografia', category: 'Molduras', width: 240, height: 200, window: { x: 28, y: 28, width: 184, height: 144 } },
  { id: 'torn-edge', name: 'Borda de papel rasgada', category: 'Papéis', width: 310, height: 80 },
  { id: 'book', name: 'Página de livro antigo', category: 'Papéis', width: 200, height: 270 },
  { id: 'news', name: 'Recorte de jornal', category: 'Papéis', width: 240, height: 190 },
  { id: 'vellum', name: 'Papel vegetal', category: 'Papéis', width: 235, height: 185 },
  { id: 'card', name: 'Cartão de memórias', category: 'Papéis', width: 260, height: 180 },
  { id: 'clip', name: 'Clip de papel', category: 'Detalhes', width: 55, height: 125 },
  { id: 'label', name: 'Etiqueta com ilhós', category: 'Detalhes', width: 215, height: 100 },
  { id: 'ticket', name: 'Ticket de lembrança', category: 'Detalhes', width: 260, height: 115 },
  { id: 'stamp', name: 'Selo botânico', category: 'Detalhes', width: 125, height: 155 },
  { id: 'bookmark', name: 'Marcador de página', category: 'Detalhes', width: 65, height: 165 },
  { id: 'botanical', name: 'Raminho de papel', category: 'Detalhes', width: 105, height: 180 },
] as const
export type ScrapbookMaterial = (typeof SCRAPBOOK_MATERIALS)[number]

export const SCRAPBOOK_PALETTES = [
  { id: 'cream', name: 'Creme vintage', paper: '#f4e7cd', edge: '#c3a77d', ink: '#77634d', accent: '#879377' },
  { id: 'rose', name: 'Rosa delicado', paper: '#f5dfe1', edge: '#c79fa6', ink: '#916775', accent: '#aa788c' },
  { id: 'matcha', name: 'Matcha', paper: '#e2e8cf', edge: '#a4af8b', ink: '#62734f', accent: '#7d9169' },
] as const
export type ScrapbookPalette = (typeof SCRAPBOOK_PALETTES)[number]

export function scrapbookData(material: ScrapbookMaterial, palette: ScrapbookPalette) {
  return { paperieKind: SCRAPBOOK_KIND, materialId: material.id, paletteId: palette.id }
}

export function getScrapbook(data: Record<string, unknown>) {
  if (data.paperieKind !== SCRAPBOOK_KIND) return null
  const material = SCRAPBOOK_MATERIALS.find(item => item.id === data.materialId)
  const palette = SCRAPBOOK_PALETTES.find(item => item.id === data.paletteId)
  return material && palette ? { material, palette } : null
}
