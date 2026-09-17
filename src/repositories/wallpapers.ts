import type { Env, WallpaperRow, WallpaperType } from "../types";

export interface TypeCounts {
  static: number;
  live: number;
}

export class WallpaperRepository {
  constructor(private readonly db: D1Database) {}

  static fromEnv(env: Env): WallpaperRepository {
    return new WallpaperRepository(env.DB);
  }

  // Active row counts per type — drives the ratio interleave.
  async counts(): Promise<TypeCounts> {
    const { results } = await this.db
      .prepare(
        "SELECT type, COUNT(*) AS c FROM wallpapers WHERE is_active = 1 GROUP BY type",
      )
      .all<{ type: WallpaperType; c: number }>();

    const counts: TypeCounts = { static: 0, live: 0 };
    for (const row of results) counts[row.type] = row.c;
    return counts;
  }

  // A contiguous slice of one type, oldest first by sequence number.
  async pageByType(
    type: WallpaperType,
    offset: number,
    limit: number,
  ): Promise<WallpaperRow[]> {
    if (limit <= 0) return [];
    const { results } = await this.db
      .prepare(
        "SELECT * FROM wallpapers WHERE type = ? AND is_active = 1 ORDER BY seq ASC LIMIT ? OFFSET ?",
      )
      .bind(type, limit, offset)
      .all<WallpaperRow>();
    return results;
  }

  async findById(id: string): Promise<WallpaperRow | null> {
    const row = await this.db
      .prepare("SELECT * FROM wallpapers WHERE id = ? AND is_active = 1")
      .bind(id)
      .first<WallpaperRow>();
    return row ?? null;
  }
}
