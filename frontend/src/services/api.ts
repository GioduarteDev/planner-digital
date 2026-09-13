const DEV_API_HOST =
  typeof window !== 'undefined'
    ? window.location.hostname
    : '127.0.0.1'


export const API_URL =
  import.meta.env.VITE_API_URL
  || `http://${DEV_API_HOST}:8000`


const USER_KEY =
  'planner-user'

const LEGACY_TOKEN_KEY =
  'planner-access-token'

const CSRF_COOKIE_NAME =
  'planner_csrf'


export function getStoredUser() {
  const raw =
    localStorage.getItem(
      USER_KEY,
    )

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(
      USER_KEY,
    )

    return null
  }
}


export function saveAuth(
  user: unknown,
) {
  // O JWT N?O fica mais acess?vel ao JavaScript.
  // O backend guarda a autentica??o em cookie HttpOnly.
  localStorage.removeItem(
    LEGACY_TOKEN_KEY,
  )

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  )
}


export function clearAuth() {
  // Tamb?m remove qualquer token antigo que tenha
  // sobrado de vers?es anteriores do planner.
  localStorage.removeItem(
    LEGACY_TOKEN_KEY,
  )

  localStorage.removeItem(
    USER_KEY,
  )
}


function getCookie(
  name: string,
) {
  const cookies =
    document.cookie
      .split(';')
      .map(
        (item) =>
          item.trim(),
      )

  const prefix =
    `${encodeURIComponent(name)}=`

  const found =
    cookies.find(
      (item) =>
        item.startsWith(prefix),
    )

  if (!found) {
    return null
  }

  return decodeURIComponent(
    found.slice(prefix.length),
  )
}


export function getCsrfToken() {
  return getCookie(
    CSRF_COOKIE_NAME,
  )
}


function isMutation(
  method?: string,
) {
  const normalized =
    (method ?? 'GET')
      .toUpperCase()

  return [
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
  ].includes(normalized)
}


export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const headers =
    new Headers(
      options?.headers,
    )

  const body =
    options?.body

  const isFormData =
    typeof FormData !== 'undefined'
    && body instanceof FormData

  if (
    body !== undefined
    && !isFormData
    && !headers.has(
      'Content-Type',
    )
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    )
  }

  if (
    isMutation(
      options?.method,
    )
  ) {
    const csrfToken =
      getCsrfToken()

    if (csrfToken) {
      headers.set(
        'X-CSRF-Token',
        csrfToken,
      )
    }
  }

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers,

        credentials:
          'include',
      },
    )

  if (!response.ok) {
    let errorMessage =
      'Erro ao acessar a API.'

    try {
      const error =
        await response.json()

      errorMessage =
        error.detail
        ?? errorMessage
    } catch {
      // mant?m mensagem padr?o
    }

    const isAuthRequest =
      endpoint === '/auth/login'
      || endpoint === '/auth/register'

    if (
      response.status === 401
      && !isAuthRequest
    ) {
      clearAuth()

      if (
        window.location.pathname
        !== '/login'
      ) {
        window.location.replace(
          '/login',
        )
      }

      throw new Error(
        'Sua sess?o expirou.',
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
