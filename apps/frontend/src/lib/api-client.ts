const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export interface ApiEnvelope<T> {
  data: T;
  meta: Record<string, unknown> | null;
  error: { code: string; message: string; details?: unknown } | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Thin fetch wrapper. Always sends cookies (`credentials: 'include'`) so the
 * HTTP-Only JWT cookies flow to the API, and unwraps the standard envelope.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { query?: Record<string, unknown> } = {},
): Promise<ApiEnvelope<T>> {
  const { query, ...init } = options;
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return { data: undefined as T, meta: null, error: null };
  }

  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || body.error) {
    throw new ApiError(res.status, body.error?.code ?? 'ERROR', body.error?.message ?? 'Request failed');
  }
  return body;
}
