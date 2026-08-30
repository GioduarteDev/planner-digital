export const API_URL =
  'http://127.0.0.1:8000'


const TOKEN_KEY =
  'planner-access-token'

const USER_KEY =
  'planner-user'


export function getAccessToken() {
  return localStorage.getItem(
    TOKEN_KEY,
  )
}


export function saveAuth(
  token: string,
  user: unknown,
) {
  localStorage.setItem(
    TOKEN_KEY,
    token,
  )

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  )
}


export function clearAuth() {
  localStorage.removeItem(
    TOKEN_KEY,
  )

  localStorage.removeItem(
    USER_KEY,
  )
}


export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const headers =
    new Headers(
      options?.headers,
    )


  headers.set(
    'Content-Type',
    'application/json',
  )


  const token =
    getAccessToken()


  if (token) {
    headers.set(
      'Authorization',
      `Bearer ${token}`,
    )
  }


  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers,
      },
    )


  if (!response.ok) {
    let errorMessage =
      'Erro ao acessar a API.'


    try {
      const error =
        await response.json()

      errorMessage =
        error.detail ??
        errorMessage
    } catch {
      // mantém mensagem padrão
    }


    const isAuthRequest =
      endpoint === '/auth/login'
      || endpoint === '/auth/register'


    if (
      response.status === 401
      && token
      && !isAuthRequest
    ) {
      clearAuth()

      window.location.replace(
        '/login',
      )

      throw new Error(
        'Sua sessão expirou.',
      )
    }


    throw new Error(
      errorMessage,
    )
  }


  if (
    response.status === 204
  ) {
    return undefined as T
  }


  return response.json()
}