// CLIENT SAFE. Small fetch wrapper for the app's own /api routes (cookie is sent automatically).
export class ApiError extends Error {
  status: number;
  setupRequired: boolean;
  constructor(message: string, status: number, setupRequired = false) {
    super(message);
    this.status = status;
    this.setupRequired = setupRequired;
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = opts.body !== undefined;
  const res = await fetch(path, {
    method: opts.method ?? "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (HTTP ${res.status}).`, res.status, !!data?.setupRequired);
  }
  return data as T;
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : "Unknown error.";
}
