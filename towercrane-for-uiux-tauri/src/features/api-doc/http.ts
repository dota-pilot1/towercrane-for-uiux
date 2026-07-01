// 웹(front)의 shared/api/http.ts 와 동일한 시그니처를 Tauri HTTP 플러그인으로 구현.
// 이렇게 두면 웹의 api-doc-api.ts / use-api-doc-queries.ts 를 거의 그대로 복사해 쓸 수 있다.
import { fetch } from "@tauri-apps/plugin-http";
import { API_BASE, getToken, setToken } from "../../shared/api/client";

export const API_BASE_URL = API_BASE;

type RequestOptions = RequestInit & { skipAuth?: boolean };

export async function apiRequest<T>(input: string, init?: RequestOptions) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${input}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.skipAuth || !token ? {} : { Authorization: `Bearer ${token}` }),
      ...init?.headers,
    },
  });

  if (response.status === 401 && !init?.skipAuth) {
    setToken(null);
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(data.message)) message = data.message.join(", ");
      else if (typeof data.message === "string") message = data.message;
    } catch {
      // JSON 아니면 기본 메시지
    }
    const err = new Error(message) as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}
