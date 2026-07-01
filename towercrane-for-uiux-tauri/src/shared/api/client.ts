// 공용 API 클라이언트 (Tauri HTTP 플러그인 → 브라우저 CORS 우회)
import { fetch } from "@tauri-apps/plugin-http";

// 개발(npm run tauri dev)은 로컬, 빌드된 앱은 운영을 가리킴
export const API_BASE = import.meta.env.DEV
  ? "http://localhost:3000/api"
  : "https://api.hibot-docu.com/api";

// 웹 프론트 오리진 (개발도구 등 web 화면 임베드/새 창용). dev=vite front(5174), prod=운영
export const WEB_BASE = import.meta.env.DEV
  ? "http://localhost:5174"
  : "https://hibot-docu.com";

const TOKEN_KEY = "towercrane.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  errorMessage?: string;
};

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    let message = opts.errorMessage ?? "요청에 실패했습니다.";
    try {
      const data = JSON.parse(text) as { message?: string | string[] };
      if (data?.message) {
        message = Array.isArray(data.message) ? data.message.join("\n") : data.message;
      }
    } catch {
      // 본문이 JSON이 아니면 기본 메시지 사용
    }
    throw new ApiError(message, res.status);
  }

  return (text ? JSON.parse(text) : undefined) as T;
}
