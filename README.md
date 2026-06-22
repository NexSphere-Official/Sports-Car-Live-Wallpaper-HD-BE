# Sports Car Wallpaper API

Read-only HTTP API for the Sports Car wallpaper app. Serves wallpaper metadata
from D1; the actual image/video assets are served directly from R2 via the CDN
host. The Worker never proxies binary content.

- **Runtime:** Cloudflare Workers (TypeScript)
- **Database:** Cloudflare D1 (SQLite) — `sports-car-wallpaper-db`
- **Storage:** Cloudflare R2 (bucket `sports-car-wallpaper`, served at `CDN_BASE` = `https://cdn-sports-car-wallpaper.nex-sphere.dev`)
- **API host:** `https://sports-car-wallpaper-api.nex-sphere.dev`

Wallpapers come in two kinds:

- **static** — a `.webp` image + `.webp` thumbnail (171 items)
- **live** — an `.mp4` video + `.webp` thumbnail (221 items)

---

## Architecture

```
src/
├── index.ts                  # entry: preflight → rate limit → route → error boundary
├── router.ts                 # path/method matching, 404/405
├── config/index.ts           # limit constants
├── types/index.ts            # Env, WallpaperRow, response shapes
├── middleware/
│   ├── cors.ts               # corsHeaders + handlePreflight
│   └── rate-limit.ts         # per-IP throttle via Cloudflare ratelimit binding
├── utils/
│   ├── response.ts           # ok() / err()
│   ├── errors.ts             # public ErrorCode constants
│   ├── urls.ts               # formatWallpaper — derives asset URLs from CDN_BASE
│   └── params.ts             # parseLimit, position cursor encode/decode
├── handlers/
│   └── wallpapers.ts         # listWallpapers (ratio feed), listWallpapersByType, getWallpaperById
└── repositories/
    └── wallpapers.ts         # all D1 SQL lives here
```

**Layering rules:** handlers never write SQL; repositories never build HTTP
responses; `utils/` is dependency-free pure functions.

---

## Endpoints

All routes are versioned under `/v1`.

| Method | Path                       | Purpose                                              |
| ------ | -------------------------- | ---------------------------------------------------- |
| GET    | `/v1/wallpapers`           | Ratio-interleaved feed of all wallpapers (cursor)    |
| GET    | `/v1/wallpapers/live`      | Live wallpapers only, newest-first `seq` order       |
| GET    | `/v1/wallpapers/static`    | Static wallpapers only, newest-first `seq` order     |
| GET    | `/v1/wallpapers/:id`       | Single wallpaper                                     |

### Query params

| Param    | Default | Notes                                                              |
| -------- | ------- | ------------------------------------------------------------------ |
| `limit`  | 20      | Clamped to `[1, 50]`. Non-numeric falls back to default.           |
| `cursor` | —       | Opaque base64url. Pass `pagination.next_cursor` verbatim.          |

### The ratio feed

`/v1/wallpapers` returns **all** wallpapers — static and live — interleaved in
proportion to their real counts (currently ~221 live : 171 static, i.e. roughly
13 live for every 10 static). Each type is spread as evenly as possible through
the feed rather than clumped. The mix is read live from D1, so it self-adjusts
as the catalogue grows. Each type is read newest-first, so new uploads appear
at the top of the feed. The cursor encodes a global position, so paging is
stable and gap-free regardless of page size.

### The type feeds

`/v1/wallpapers/live` and `/v1/wallpapers/static` return only that one kind, in
newest-first `seq` order. The cursor is the offset into that type's list. Same
response shape and pagination contract as the combined feed.

---

## Response shape

Every response is `application/json` with CORS enabled and an `X-Request-ID`
header (mirrors Cloudflare `cf-ray`).

**Feed (`GET /v1/wallpapers`, `/live`, `/static`):**

```json
{
  "success": true,
  "data": {
    "wallpapers": [
      {
        "id": "s_171",
        "type": "static",
        "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/original/s_171.webp",
        "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/static/thumbnails/s_171.webp",
        "created_at": "2026-06-22 15:20:00"
      },
      {
        "id": "l_221",
        "type": "live",
        "url": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/original/l_221.mp4",
        "thumbnail": "https://cdn-sports-car-wallpaper.nex-sphere.dev/live/thumbnails/l_221.webp",
        "created_at": "2026-06-09 12:00:00"
      }
    ],
    "pagination": { "next_cursor": "MjA", "has_more": true, "limit": 20 }
  }
}
```

**Single wallpaper (`GET /v1/wallpapers/:id`):**

```json
{ "success": true, "data": { "wallpaper": { /* same per-wallpaper shape */ } } }
```

**Error:**

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Wallpaper not found" } }
```

### Error codes (stable contract)

| Code                 | Status | When                                          |
| -------------------- | ------ | --------------------------------------------- |
| `NOT_FOUND`          | 404    | Unknown route or unknown wallpaper id         |
| `METHOD_NOT_ALLOWED` | 405    | Path matches but method doesn't (`Allow` set) |
| `INVALID_CURSOR`     | 400    | Cursor is not valid base64url or malformed    |
| `RATE_LIMITED`       | 429    | Per-IP limit hit; `Retry-After` header set    |
| `INTERNAL_ERROR`     | 500    | Caught exception; check logs by request ID    |

---

## Database

```sql
CREATE TABLE wallpapers (
  id         TEXT PRIMARY KEY,          -- 's_001', 'l_001'
  type       TEXT NOT NULL,             -- 'static' | 'live'
  seq        INTEGER NOT NULL,          -- numeric order within type
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_wallpapers_type_seq ON wallpapers (type, seq);
```

See `schema.sql`. The uploader also runs `CREATE TABLE IF NOT EXISTS` before
inserting, so a fresh database is provisioned automatically.

Asset layout in R2 (mirrored on the CDN):

```
static/original/s_001.webp      static/thumbnails/s_001.webp
live/original/l_001.mp4         live/thumbnails/l_001.webp
```

---

## Uploading assets

`upload-ready/upload.mjs` pushes the local `upload-ready/{static,live}` folders
to R2 and registers each wallpaper in D1. It is idempotent — ids already present
in D1 are skipped, so re-running only retries gaps/failures.

```bash
pnpm upload      # node upload-ready/upload.mjs
```

Credentials live in the `CONFIG` block at the top of the script:

- **R2** uses the R2 API token via the S3-compatible API. The Access Key ID is
  the token's ID (resolved at startup from `/tokens/verify`) and the Secret is
  the SHA-256 of the token value — so only the token string is needed.
- **D1** uses a token carrying `D1: Edit`. The token is account-scoped, so the
  same one works across databases in the account.

---

## Local development

```bash
pnpm install
pnpm dev          # wrangler dev — local Worker on http://localhost:8787
pnpm types        # regenerate types from wrangler.toml
pnpm deploy       # publish to Cloudflare
```

Non-sensitive config goes in `wrangler.toml` `[vars]` (e.g. `CDN_BASE`).
Production secrets use `wrangler secret put NAME`; local secrets use `.dev.vars`.
