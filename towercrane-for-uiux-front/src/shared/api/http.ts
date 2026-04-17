import { useSessionStore } from '../store/session-store'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api'

type RequestOptions = RequestInit & {
  skipAuth?: boolean
}

export async function apiRequest<T>(input: string, init?: RequestOptions) {
  const token = useSessionStore.getState().token
  const response = await fetch(`${API_BASE_URL}${input}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.skipAuth || !token ? {} : { Authorization: `Bearer ${token}` }),
      ...init?.headers,
    },
  })

  if (response.status === 401 && !init?.skipAuth) {
    useSessionStore.getState().clearSession()
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`

    try {
      const data = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(data.message)) {
        message = data.message.join(', ')
      } else if (typeof data.message === 'string') {
        message = data.message
      }
    } catch {
      // Ignore non-JSON error bodies and keep the fallback message.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}
