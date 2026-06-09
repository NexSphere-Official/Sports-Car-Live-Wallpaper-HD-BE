import { handlePreflight } from "./middleware/cors";
import { enforceRateLimit } from "./middleware/rate-limit";
import { route } from "./router";
import { ErrorCode } from "./utils/errors";
import { err } from "./utils/response";
import type { Env } from "./types";

export type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = request.headers.get("cf-ray");
    const { pathname } = new URL(request.url);
    console.log(`${request.method} ${pathname} - ${Date.now()}`);

    const preflight = handlePreflight(request);
    if (preflight) return withRequestId(preflight, requestId);

    try {
      const blocked = await enforceRateLimit(request, env);
      if (blocked) return withRequestId(blocked, requestId);

      const response = await route(request, env);
      return withRequestId(response, requestId);
    } catch (e) {
      console.error("Worker error:", { requestId, error: e });
      return withRequestId(
        err("Internal server error", ErrorCode.INTERNAL_ERROR, 500),
        requestId,
      );
    }
  },
};

function withRequestId(response: Response, requestId: string | null): Response {
  if (!requestId) return response;
  // Response objects from Response.json() have immutable headers in some
  // contexts — clone safely by constructing a new Response.
  const headers = new Headers(response.headers);
  if (!headers.has("X-Request-ID")) headers.set("X-Request-ID", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
