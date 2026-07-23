const API_BASE = (process.env.NEXT_PUBLIC_CMS_ADMIN_API_URL ?? "http://localhost:4000").replace(/\/$/, "")

let csrfToken = ""

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message)
  }
}

export function setCsrf(token: string) { csrfToken = token }

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase()
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData) && init.body !== undefined) headers.set("content-type", "application/json")
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) headers.set("x-csrf-token", csrfToken)
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, method, headers, credentials: "include" })
  } catch {
    throw new ApiError(0, "NETWORK", "Không thể kết nối tới CMS. Hãy kiểm tra API và thử lại.")
  }
  let body: unknown = null
  try { body = await response.json() } catch { /* empty */ }
  if (!response.ok) {
    const envelope = body as { error?: { code?: string; message?: string; details?: unknown } }
    throw new ApiError(response.status, envelope.error?.code ?? "ERROR", envelope.error?.message ?? `Yêu cầu thất bại (${response.status})`, envelope.error?.details)
  }
  return body as T
}

export async function restoreSession(): Promise<{ username: string } | null> {
  try {
    const me = await api<{ username: string }>("/auth/me")
    const csrf = await api<{ csrfToken: string }>("/auth/csrf")
    setCsrf(csrf.csrfToken)
    return me
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
