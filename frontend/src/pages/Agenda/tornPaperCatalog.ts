export const TORN_PAPER_KIND = 'torn-paper-v1'

// Paths use a 100 × 100 coordinate space. Uneven tears are intentionally
// asymmetric; straight edges on the corner/page cuts suggest the original sheet.
export const TORN_PAPER_FORMATS = [
  { id: 'corner', name: 'Canto rasgado', width: 190, height: 180, path: 'M3 3 L97 3 L95 11 89 13 90 19 82 22 80 31 73 30 70 39 63 42 64 47 55 48 52 57 44 59 42 65 35 64 31 74 23 77 24 83 15 85 12 93 3 97 Z' },
  { id: 'edge', name: 'Borda rasgada', width: 310, height: 75, path: 'M1 2 L99 2 99 77 95 81 92 75 88 88 83 82 80 95 75 84 71 91 66 81 62 88 57 76 53 86 49 80 44 94 39 85 35 91 31 78 27 87 22 80 17 93 12 84 8 89 4 76 1 82 Z' },
  { id: 'horizontal', name: 'Tira horizontal', width: 310, height: 100, path: 'M2 15 L7 8 12 13 18 5 23 10 29 4 34 9 39 6 45 14 51 7 57 11 63 3 68 9 74 5 79 12 84 6 90 13 96 8 99 18 97 29 99 42 96 57 99 73 97 88 91 85 86 95 79 89 74 96 68 90 62 94 56 86 49 93 44 88 38 96 32 90 27 94 21 84 15 93 9 86 3 90 1 73 4 61 2 43 4 29 Z' },
  { id: 'vertical', name: 'Tira vertical', width: 100, height: 300, path: 'M15 3 L31 6 47 3 62 5 80 2 91 7 87 13 96 19 89 25 94 31 86 38 93 44 89 51 97 58 90 64 94 71 85 78 92 85 88 94 73 97 57 94 40 98 24 95 10 97 13 89 5 82 11 76 4 69 12 61 7 54 14 46 6 39 11 32 3 25 10 19 6 11 Z' },
  { id: 'scrap', name: 'Retalho irregular', width: 230, height: 175, path: 'M12 18 L19 16 23 9 32 12 39 5 46 9 55 4 63 11 70 8 75 16 83 15 85 24 94 29 91 38 98 46 94 55 97 63 89 67 91 76 82 77 78 87 68 85 63 94 54 91 46 97 40 91 31 93 27 84 18 85 19 77 9 74 12 65 4 59 8 49 3 43 10 35 7 26 Z' },
  { id: 'block', name: 'Bloco de papel rasgado', width: 250, height: 215, path: 'M4 8 L13 5 21 8 30 3 38 6 47 2 56 7 66 4 75 8 85 3 95 7 92 18 97 27 94 38 98 47 94 57 97 68 93 79 97 90 87 94 78 91 68 97 58 92 49 96 40 91 31 95 22 91 13 96 4 91 7 80 2 70 6 60 3 49 7 39 2 29 6 19 Z' },
  { id: 'page', name: 'Fragmento de página', width: 215, height: 285, path: 'M5 2 L97 2 97 17 94 22 98 31 94 39 98 48 93 56 97 64 91 72 92 81 83 83 79 91 70 88 65 97 56 91 47 96 41 91 33 97 26 92 17 95 10 90 3 94 7 84 3 75 7 65 4 54 8 45 4 34 7 24 3 14 Z' },
  { id: 'label', name: 'Etiqueta rasgada', width: 220, height: 95, path: 'M10 10 L22 6 34 10 45 4 57 9 70 5 82 10 92 7 96 20 92 31 99 45 94 56 97 70 91 86 79 89 69 84 57 94 45 87 34 93 22 87 11 91 13 78 6 69 9 57 2 46 8 35 5 22 Z' },
] as const

export type TornPaperFormat = (typeof TORN_PAPER_FORMATS)[number]
export type TornPaperPattern = 'fibers' | 'ruled' | 'news' | 'book' | 'music' | 'strawberry' | 'floral' | 'study' | 'academia' | 'witchy'
export const TORN_PAPER_COLLECTIONS = [
  { id: 'cream', name: 'Papel creme', paper: '#f4e8ce', ink: '#79654b', accent: '#ccb792', pattern: 'fibers' },
  { id: 'notebook', name: 'Papel de caderno', paper: '#f7f2e5', ink: '#8dabb4', accent: '#ca8e95', pattern: 'ruled' },
  { id: 'vintage-news', name: 'Jornal vintage', paper: '#d9c49f', ink: '#554b3c', accent: '#b19669', pattern: 'news' },
  { id: 'old-book', name: 'Página de livro antigo', paper: '#e4cba0', ink: '#665038', accent: '#b18d59', pattern: 'book' },
  { id: 'sheet-music', name: 'Partitura', paper: '#efe0c0', ink: '#574c42', accent: '#bda681', pattern: 'music' },
  { id: 'soft-pink', name: 'Rosa delicado', paper: '#f0d2d6', ink: '#976d79', accent: '#c99ba9', pattern: 'fibers' },
  { id: 'lilac', name: 'Lilás', paper: '#dfd5ed', ink: '#82718f', accent: '#b4a0c7', pattern: 'fibers' },
  { id: 'matcha', name: 'Matcha', paper: '#d6dfbd', ink: '#65754e', accent: '#a6b68c', pattern: 'fibers' },
  { id: 'strawberry', name: 'Moranguinho', paper: '#fae8df', ink: '#b55d6d', accent: '#7c9166', pattern: 'strawberry' },
  { id: 'floral', name: 'Floral', paper: '#f3e8d8', ink: '#af7e94', accent: '#829671', pattern: 'floral' },
  { id: 'study-girl', name: 'Study Girl', paper: '#f1dfda', ink: '#9b6f78', accent: '#87977b', pattern: 'study' },
  { id: 'dark-academia', name: 'Dark Academia', paper: '#554c40', ink: '#dbca9e', accent: '#aa9270', pattern: 'academia' },
  { id: 'witchy', name: 'Witchy Journal', paper: '#393849', ink: '#d8c6a1', accent: '#a69ab9', pattern: 'witchy' },
] as const satisfies readonly { id: string; name: string; paper: string; ink: string; accent: string; pattern: TornPaperPattern }[]
export type TornPaperCollection = (typeof TORN_PAPER_COLLECTIONS)[number]

export function getTornPaper(data: Record<string, unknown>) {
  if (data.paperieKind !== TORN_PAPER_KIND) return null
  const format = TORN_PAPER_FORMATS.find(item => item.id === data.formatId)
  const collection = TORN_PAPER_COLLECTIONS.find(item => item.id === data.collectionId)
  return format && collection ? { format, collection } : null
}

export function tornPaperData(format: TornPaperFormat, collection: TornPaperCollection) {
  return { paperieKind: TORN_PAPER_KIND, formatId: format.id, collectionId: collection.id }
}
