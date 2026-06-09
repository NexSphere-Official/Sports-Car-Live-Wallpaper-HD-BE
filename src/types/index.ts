export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  RATE_LIMITER: RateLimitBinding;
  CDN_BASE: string;
}

export type WallpaperType = "static" | "live";

// ─────────────────────────────────────────────
//  Database row shape — matches the `wallpapers` table in D1.
// ─────────────────────────────────────────────
export interface WallpaperRow {
  id: string;            // "s_001", "l_001"
  type: WallpaperType;
  seq: number;           // numeric order within type
  is_active: number;     // 0 | 1
  created_at: string;
}

// ─────────────────────────────────────────────
//  Public response shape
// ─────────────────────────────────────────────
export interface WallpaperResponse {
  id: string;
  type: WallpaperType;
  url: string;        // original image (.webp) or video (.mp4)
  thumbnail: string;  // always .webp
  created_at: string;
}

export interface PaginationMeta {
  next_cursor: string | null;
  has_more: boolean;
  limit: number;
}
