const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchJson<T>(path: string, options?: RequestInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string,string> || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  get:  <T>(path: string, token?: string | null) => fetchJson<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    fetchJson<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),
};
