import { DEFAULT_LIMIT, MAX_LIMIT, MIN_LIMIT } from "../config";

export function parseLimit(
  params: URLSearchParams,
  defaultLimit: number = DEFAULT_LIMIT,
): number {
  const raw = params.get("limit");
  if (raw === null) return defaultLimit;
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultLimit;
  return Math.min(Math.max(Math.floor(n), MIN_LIMIT), MAX_LIMIT);
}

// The feed cursor is just an opaque encoding of the global position (an
// integer offset into the ratio-interleaved sequence). Base64url so it reads
// as a token rather than a guessable number.
export function decodePosition(value: string | null): number | "INVALID" {
  if (!value) return 0;
  try {
    const raw = atob(fromBase64Url(value));
    if (!/^\d+$/.test(raw)) return "INVALID";
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < 0) return "INVALID";
    return n;
  } catch {
    return "INVALID";
  }
}

export function encodePosition(p: number): string {
  return toBase64Url(btoa(String(p)));
}

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/");
}
