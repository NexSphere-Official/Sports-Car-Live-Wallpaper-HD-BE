# Sports Car Wallpaper API — Frontend Integration Guide

Everything a client app needs to consume the wallpaper API. All endpoints are
**read-only `GET`** requests — there are no request bodies. Pagination is via an
opaque cursor.

- **Base URL:** `https://sports-car-wallpaper-api.nex-sphere.dev`
- **Version prefix:** every route is under `/v1`
- **CDN host (assets):** `https://cdn-sports-car-wallpaper.nex-sphere.dev`
- **Content-Type:** `application/json` on every response
- **CORS:** open (`Access-Control-Allow-Origin: *`) — call directly from the browser

Catalogue size: **221 live** (`.mp4`) + **171 static** (`.webp`) = 392 wallpapers.

---

## Conventions

### Envelope

Every response is wrapped. Check `success` first.

```jsonc
// success
{ "success": true,  "data": { /* ... */ } }
// error
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Wallpaper not found" } }
```

### Headers returned

| Header          | Notes                                              |
| --------------- | -------------------------------------------------- |
| `X-Request-ID`  | Mirrors Cloudflare `cf-ray` — quote it in bug reports |
| `Retry-After`   | Only on `429` — seconds to wait                    |
| `Allow`         | Only on `405` — methods the path accepts           |

### Wallpaper object

The same shape everywhere a wallpaper appears:

```jsonc
{
  "id": "l_010",                  // "s_###" = static, "l_###" = live
  "type": "live",                 // "live" | "static"
  "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/original/l_010.mp4",
  "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/thumbnails/l_010.webp",
  "created_at": "2026-06-09 10:07:34"
}
```

- **static** → `url` is a `.webp` image, `thumbnail` is `.webp`
- **live** → `url` is an `.mp4` video, `thumbnail` is `.webp` (use it as the poster/placeholder)

### Query params (shared by all list endpoints)

| Param    | Type   | Default | Notes                                                          |
| -------- | ------ | ------- | -------------------------------------------------------------- |
| `limit`  | int    | `20`    | Clamped to `[1, 50]`. Non-numeric → falls back to default.     |
| `cursor` | string | —       | Opaque base64url. Pass `pagination.next_cursor` back verbatim. |

### Pagination

List endpoints return a `pagination` block:

```jsonc
"pagination": {
  "next_cursor": "MjA",   // pass as ?cursor= for the next page; null when finished
  "has_more": true,       // false on the last page
  "limit": 20             // the effective limit applied
}
```

To page: start with no cursor → keep calling with `?cursor=<next_cursor>` until
`has_more` is `false` (`next_cursor` becomes `null`). Cursors are stable, so page
size can change between calls without gaps or duplicates.

---

## Endpoints

| Method | Path                    | Returns                                              |
| ------ | ----------------------- | ---------------------------------------------------- |
| GET    | `/v1/wallpapers`        | All wallpapers, live + static interleaved by ratio   |
| GET    | `/v1/wallpapers/live`   | Live wallpapers only                                 |
| GET    | `/v1/wallpapers/static` | Static wallpapers only                               |
| GET    | `/v1/wallpapers/:id`    | A single wallpaper by id                             |

---

### 1. Combined feed — `GET /v1/wallpapers`

Mixed feed of **all** wallpapers. Live and static are interleaved in proportion
to their real counts (~221 live : 171 static, roughly 13 live for every 10
static) and spread evenly rather than clumped. Each type is ordered newest-first,
so new uploads appear at the top of the home grid.

**Request**
```
GET /v1/wallpapers?limit=5
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "wallpapers": [
      { "id": "s_171", "type": "static", "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/original/s_171.webp", "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/thumbnails/s_171.webp", "created_at": "2026-06-22 15:20:00" },
      { "id": "l_221", "type": "live",   "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/original/l_221.mp4",     "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/thumbnails/l_221.webp",  "created_at": "2026-06-09 10:07:00" },
      { "id": "s_170", "type": "static", "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/original/s_170.webp", "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/thumbnails/s_170.webp", "created_at": "2026-06-22 15:20:00" },
      { "id": "l_220", "type": "live",   "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/original/l_220.mp4",     "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/thumbnails/l_220.webp",  "created_at": "2026-06-09 10:07:01" },
      { "id": "s_169", "type": "static", "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/original/s_169.webp", "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/thumbnails/s_169.webp", "created_at": "2026-06-22 15:20:00" }
    ],
    "pagination": { "next_cursor": "NQ", "has_more": true, "limit": 5 }
  }
}
```

---

### 2. Live feed — `GET /v1/wallpapers/live`

Only `live` (video) wallpapers, newest first. Same params and pagination.

**Request**
```
GET /v1/wallpapers/live?limit=3
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "wallpapers": [
      { "id": "l_221", "type": "live", "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/original/l_221.mp4", "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/thumbnails/l_221.webp", "created_at": "2026-06-09 10:07:00" },
      { "id": "l_220", "type": "live", "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/original/l_220.mp4", "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/thumbnails/l_220.webp", "created_at": "2026-06-09 10:07:01" },
      { "id": "l_219", "type": "live", "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/original/l_219.mp4", "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/thumbnails/l_219.webp", "created_at": "2026-06-09 10:07:02" }
    ],
    "pagination": { "next_cursor": "Mw", "has_more": true, "limit": 3 }
  }
}
```

---

### 3. Static feed — `GET /v1/wallpapers/static`

Only `static` (image) wallpapers, newest first. Same params and pagination.

**Request**
```
GET /v1/wallpapers/static?limit=3
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "wallpapers": [
      { "id": "s_171", "type": "static", "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/original/s_171.webp", "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/thumbnails/s_171.webp", "created_at": "2026-06-22 15:20:00" },
      { "id": "s_170", "type": "static", "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/original/s_170.webp", "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/thumbnails/s_170.webp", "created_at": "2026-06-22 15:20:00" },
      { "id": "s_169", "type": "static", "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/original/s_169.webp", "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/thumbnails/s_169.webp", "created_at": "2026-06-22 15:20:00" }
    ],
    "pagination": { "next_cursor": "Mw", "has_more": true, "limit": 3 }
  }
}
```

---

### 4. Single wallpaper — `GET /v1/wallpapers/:id`

Fetch one wallpaper by id (`s_001`, `l_010`, …). Note this returns a `wallpaper`
object (singular), not a `wallpapers` array.

**Request**
```
GET /v1/wallpapers/l_010
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "wallpaper": {
      "id": "l_010",
      "type": "live",
      "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/original/l_010.mp4",
      "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/thumbnails/l_010.webp",
      "created_at": "2026-06-09 10:07:34"
    }
  }
}
```

**Response `404`** (unknown id)
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Wallpaper not found" } }
```

---

## Errors

| HTTP | `error.code`         | Meaning / when                                   |
| ---- | -------------------- | ------------------------------------------------ |
| 400  | `INVALID_CURSOR`     | `cursor` isn't valid base64url / malformed       |
| 404  | `NOT_FOUND`          | Unknown route, or unknown wallpaper id           |
| 405  | `METHOD_NOT_ALLOWED` | Right path, wrong method (see `Allow` header)    |
| 429  | `RATE_LIMITED`       | Too many requests — see `Retry-After` header     |
| 500  | `INTERNAL_ERROR`     | Server error — quote `X-Request-ID` when reporting |

Always branch on `success`; only read `data` when `true`, only read `error` when `false`.

**Rate limit:** 1000 requests per 60s per IP. A browsing app won't hit this in
normal use; on `429`, back off for `Retry-After` seconds.

---

## Client examples

### TypeScript types

```ts
export type WallpaperType = "live" | "static";

export interface Wallpaper {
  id: string;
  type: WallpaperType;
  url: string;        // .mp4 (live) or .webp (static)
  thumbnail: string;  // always .webp
  created_at: string;
}

export interface Pagination {
  next_cursor: string | null;
  has_more: boolean;
  limit: number;
}

export type ApiResponse<T> =
  | { success: true;  data: T }
  | { success: false; error: { code: string; message: string } };

export type FeedData = { wallpapers: Wallpaper[]; pagination: Pagination };
export type SingleData = { wallpaper: Wallpaper };
```

### Fetch helper + paging

```ts
const BASE = "https://sports-car-wallpaper-api.nex-sphere.dev";

async function getFeed(
  kind: "all" | "live" | "static" = "all",
  opts: { limit?: number; cursor?: string | null } = {},
): Promise<FeedData> {
  const path = kind === "all" ? "/v1/wallpapers" : `/v1/wallpapers/${kind}`;
  const qs = new URLSearchParams();
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.cursor) qs.set("cursor", opts.cursor);

  const res = await fetch(`${BASE}${path}?${qs}`);
  const json: ApiResponse<FeedData> = await res.json();
  if (!json.success) throw new Error(`${json.error.code}: ${json.error.message}`);
  return json.data;
}

// Load every page of the live feed:
async function getAllLive(): Promise<Wallpaper[]> {
  const all: Wallpaper[] = [];
  let cursor: string | null = null;
  do {
    const { wallpapers, pagination } = await getFeed("live", { limit: 50, cursor });
    all.push(...wallpapers);
    cursor = pagination.next_cursor;
  } while (cursor);
  return all;
}

async function getWallpaper(id: string): Promise<Wallpaper> {
  const res = await fetch(`${BASE}/v1/wallpapers/${id}`);
  const json: ApiResponse<SingleData> = await res.json();
  if (!json.success) throw new Error(json.error.code);
  return json.data.wallpaper;
}
```

### Rendering tips

- **Grids:** render `thumbnail` (cheap `.webp`) — never the full `url`. Load the
  full asset only when a wallpaper is opened/applied.
- **Live wallpapers:** use `thumbnail` as the video poster; lazy-load the `.mp4`
  on tap. `<video src={url} poster={thumbnail} muted loop playsInline autoPlay>`.
- **Caching:** assets are immutable per id, served from the CDN — safe to cache
  aggressively on device.
```
