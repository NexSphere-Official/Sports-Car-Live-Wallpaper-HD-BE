-- Sports car wallpaper catalogue.
-- One row per wallpaper; assets live in R2 under <type>/original and
-- <type>/thumbnails keyed by id.
CREATE TABLE IF NOT EXISTS wallpapers (
  id         TEXT PRIMARY KEY,          -- "s_001", "l_001"
  type       TEXT NOT NULL,             -- "static" | "live"
  seq        INTEGER NOT NULL,          -- numeric order within type (1..N)
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wallpapers_type_seq ON wallpapers (type, seq);
