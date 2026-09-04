import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Player, BoardTeaser } from "./types";
import { toBoardTeaser } from "./types";

/**
 * Server-only data access. Reads the file the sync scripts generate at
 * build time (scripts/build-dev-data.mjs for now, scripts/sync-sheet.mjs
 * in Phase B). Nothing in this module is imported by client components --
 * full profile content only ever leaves the server through the gated
 * route handler (app/api/profile/[id]/route.ts).
 */

const DATA_PATH = path.join(process.cwd(), "data", "generated", "players.json");

let cache: Player[] | null = null;

function loadAll(): Player[] {
  if (cache) return cache;
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  cache = JSON.parse(raw) as Player[];
  return cache;
}

/** Published players only, sorted by overallRank. */
export function getPublishedPlayers(): Player[] {
  return loadAll()
    .filter((p) => p.publish)
    .sort((a, b) => (a.overallRank ?? Infinity) - (b.overallRank ?? Infinity));
}

export function getBoardTeasers(): BoardTeaser[] {
  return getPublishedPlayers().map(toBoardTeaser);
}

export function getPlayerById(id: string): Player | undefined {
  return getPublishedPlayers().find((p) => p.id === id);
}
