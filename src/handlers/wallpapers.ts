import { WallpaperRepository } from "../repositories/wallpapers";
import { ErrorCode } from "../utils/errors";
import { err, ok } from "../utils/response";
import { formatWallpaper } from "../utils/urls";
import { decodePosition, encodePosition, parseLimit } from "../utils/params";
import type { Env, PaginationMeta, WallpaperRow, WallpaperType } from "../types";

// GET /v1/wallpapers
// One ratio-interleaved feed of every active wallpaper. The cursor is the
// global position `p`; the two types are spread evenly through each other in
// proportion to their real counts (read live from D1, so the mix self-adjusts
// as the catalogue grows). Each type is read oldest-first, so new wallpapers
// appear at the end of the mixed feed while preserving the live/static ratio.
export async function listWallpapers(
  env: Env,
  params: URLSearchParams,
): Promise<Response> {
  const p0 = decodePosition(params.get("cursor"));
  if (p0 === "INVALID")
    return err("Invalid cursor", ErrorCode.INVALID_CURSOR, 400);

  const limit = parseLimit(params);
  const repo = WallpaperRepository.fromEnv(env);
  const { static: Ns, live: Nl } = await repo.counts();
  const total = Ns + Nl;

  // Past the end (or empty catalogue) → empty page, no cursor.
  if (p0 >= total) {
    return ok({
      wallpapers: [],
      pagination: { next_cursor: null, has_more: false, limit },
    });
  }

  const p1 = Math.min(p0 + limit, total);

  // Live items strictly before global position p. floor((p * Nl) / total)
  // distributes the Nl live items as evenly as possible across `total` slots.
  const liveBefore = (p: number): number => Math.floor((p * Nl) / total);

  const liveStart = liveBefore(p0);
  const liveCount = liveBefore(p1) - liveStart;
  const staticStart = p0 - liveStart;
  const staticCount = p1 - p0 - liveCount;

  const [statics, lives] = await Promise.all([
    repo.pageByType("static", staticStart, staticCount),
    repo.pageByType("live", liveStart, liveCount),
  ]);

  // Re-merge in position order using the same even-distribution rule.
  const merged: WallpaperRow[] = [];
  let si = 0;
  let li = 0;
  for (let p = p0; p < p1; p++) {
    const isLive = liveBefore(p + 1) > liveBefore(p);
    const row = isLive ? lives[li++] : statics[si++];
    if (row) merged.push(row); // guard against a missing row (shouldn't occur)
  }

  const hasMore = p1 < total;
  const pagination: PaginationMeta = {
    next_cursor: hasMore ? encodePosition(p1) : null,
    has_more: hasMore,
    limit,
  };

  return ok({
    wallpapers: merged.map((row) => formatWallpaper(env.CDN_BASE, row)),
    pagination,
  });
}

// GET /v1/wallpapers/live  and  GET /v1/wallpapers/static
// A single-type feed in oldest-first `seq` order. The cursor is the offset into
// that type's list (no interleaving — every row here is the same type).
export async function listWallpapersByType(
  env: Env,
  type: WallpaperType,
  params: URLSearchParams,
): Promise<Response> {
  const p0 = decodePosition(params.get("cursor"));
  if (p0 === "INVALID")
    return err("Invalid cursor", ErrorCode.INVALID_CURSOR, 400);

  const limit = parseLimit(params);
  const repo = WallpaperRepository.fromEnv(env);
  const total = (await repo.counts())[type];

  if (p0 >= total) {
    return ok({
      wallpapers: [],
      pagination: { next_cursor: null, has_more: false, limit },
    });
  }

  const rows = await repo.pageByType(type, p0, limit);
  const p1 = p0 + rows.length;
  const hasMore = p1 < total;
  const pagination: PaginationMeta = {
    next_cursor: hasMore ? encodePosition(p1) : null,
    has_more: hasMore,
    limit,
  };

  return ok({
    wallpapers: rows.map((row) => formatWallpaper(env.CDN_BASE, row)),
    pagination,
  });
}

// GET /v1/wallpapers/:id
export async function getWallpaperById(
  env: Env,
  id: string,
): Promise<Response> {
  const repo = WallpaperRepository.fromEnv(env);
  const row = await repo.findById(id);
  if (!row) return err("Wallpaper not found", ErrorCode.NOT_FOUND, 404);
  return ok({ wallpaper: formatWallpaper(env.CDN_BASE, row) });
}
