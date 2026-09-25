import { API_URL } from '../../services/api'

export type ReusableSticker = {
  id: number
  name: string
  category: string
  mediaType: 'sticker'
  imageUrl: string
  kitName: string | null
  metadata: {
    mimeType: string
    createdAt: string
  }
}

function resolveMediaUrl(value: string) {
  if (/^(https?:|data:|blob:)/.test(value)) return value
  return `${API_URL}${value}`
}

export function normalizeSticker(value: {
  id: number
  name: string
  media_type: string
  file_url: string
  kit_name?: string | null
  mime_type?: string
  created_at?: string
}): ReusableSticker {
  const category = value.kit_name?.trim() || 'Sem categoria'
  return {
    id: value.id,
    name: value.name,
    category,
    mediaType: 'sticker',
    imageUrl: resolveMediaUrl(value.file_url),
    kitName: value.kit_name ?? null,
    metadata: {
      mimeType: value.mime_type ?? 'image',
      createdAt: value.created_at ?? '',
    },
  }
}
