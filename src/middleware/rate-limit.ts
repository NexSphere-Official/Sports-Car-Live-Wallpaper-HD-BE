import { ErrorCode } from "../utils/errors";
import { err } from "../utils/response";
import type { Env } from "../types";

export const RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * Per-IP rate limiting via Cloudflare's `ratelimit` binding.
 * Limit/window are configured in wrangler.toml; this just enforces.
 *
 * Returns a 429 Response if blocked, or null to continue.
 */
export async function enforceRateLimit(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const { success } = await env.RATE_LIMITER.limit({ key: ip });
  if (success) return null;

  return err(
    "Too many requests. Please slow down.",
    ErrorCode.RATE_LIMITED,
    429,
    {
      "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS),
    },
  );
}
