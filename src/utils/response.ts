import { corsHeaders } from "../middleware/cors";
import type { ErrorCodeValue } from "./errors";

export function ok(data: unknown, status = 200): Response {
  return Response.json(
    { success: true, data },
    { status, headers: corsHeaders() },
  );
}

export function err(
  message: string,
  code: ErrorCodeValue,
  status: number,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(corsHeaders());
  if (extraHeaders) {
    for (const [k, v] of new Headers(extraHeaders).entries()) {
      headers.set(k, v);
    }
  }
  return Response.json(
    { success: false, error: { code, message } },
    { status, headers },
  );
}
