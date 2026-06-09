import type { WallpaperResponse, WallpaperRow } from "../types";

// Original asset extension: live wallpapers are videos, static are images.
function originalExt(type: WallpaperRow["type"]): string {
  return type === "live" ? "mp4" : "webp";
}

// `${CDN_BASE}/static/original/s_001.webp`
function assetUrl(
  cdnBase: string,
  type: string,
  folder: "original" | "thumbnails",
  filename: string,
): string {
  return `${cdnBase}/${type}/${folder}/${filename}`;
}

export function formatWallpaper(
  cdnBase: string,
  row: WallpaperRow,
): WallpaperResponse {
  return {
    id: row.id,
    type: row.type,
    url: assetUrl(cdnBase, row.type, "original", `${row.id}.${originalExt(row.type)}`),
    thumbnail: assetUrl(cdnBase, row.type, "thumbnails", `${row.id}.webp`),
    created_at: row.created_at,
  };
}
