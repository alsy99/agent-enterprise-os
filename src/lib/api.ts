/**
 * Absolute API base for browser calls.
 * - Empty / unset → same-origin `/api/...` (local Next full-stack)
 * - Set for GitHub Pages → Cursor Cloud tunnel or other public API host
 */
export function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE ?? "";
  return raw.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = apiBase();
  return base ? `${base}${p}` : p;
}

export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), {
    ...init,
    cache: "no-store",
  });
}
