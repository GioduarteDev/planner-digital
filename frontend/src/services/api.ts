export const API_URL =
  'http://127.0.0.1:8000'


export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,

      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    },
  )

  if (!response.ok) {
    const error = await response.json()

    throw new Error(
      error.detail ??
        'Erro ao acessar a API.',
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}