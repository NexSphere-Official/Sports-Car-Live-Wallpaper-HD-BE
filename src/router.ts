import {
  getWallpaperById,
  listWallpapers,
  listWallpapersByType,
} from "./handlers/wallpapers";
import { ErrorCode } from "./utils/errors";
import { err } from "./utils/response";
import type { Env } from "./types";

const ID_PATTERN = /^\/wallpapers\/([^/]+)$/;

function allowedMethodsFor(pathname: string): string[] {
  if (pathname === "/wallpapers") return ["GET"];
  // /wallpapers/live and /wallpapers/static also match ID_PATTERN below, so a
  // single check covers the type feeds and the :id route alike.
  if (ID_PATTERN.test(pathname)) return ["GET"];
  return [];
}

export async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const rawPath = url.pathname.replace(/\/$/, "");

  // All routes are versioned under /v1. Anything else is 404.
  if (!rawPath.startsWith("/v1/") && rawPath !== "/v1") {
    return err("Route not found", ErrorCode.NOT_FOUND, 404);
  }
  const pathname = rawPath.slice(3) || "/";

  const params = url.searchParams;
  const method = request.method;

  if (method === "GET") {
    if (pathname === "/wallpapers") return listWallpapers(env, params);

    // Type feeds must be matched before the :id route — "live"/"static" would
    // otherwise be treated as wallpaper ids.
    if (pathname === "/wallpapers/live")
      return listWallpapersByType(env, "live", params);
    if (pathname === "/wallpapers/static")
      return listWallpapersByType(env, "static", params);

    const idMatch = pathname.match(ID_PATTERN);
    if (idMatch) return getWallpaperById(env, idMatch[1]);
  }

  // Path is known but method isn't → 405 with Allow header.
  const allowed = allowedMethodsFor(pathname);
  if (allowed.length > 0) {
    return err(
      `Method ${method} not allowed for ${pathname}`,
      ErrorCode.METHOD_NOT_ALLOWED,
      405,
      { Allow: allowed.join(", ") },
    );
  }

  return err("Route not found", ErrorCode.NOT_FOUND, 404);
}
