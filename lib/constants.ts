import type { Position } from "./types";

export const POSITIONS: Position[] = [
  "QB", "RB", "WR", "TE", "OT", "IOL", "IDL", "EDGE", "LB", "CB", "S",
];

export const POSITION_NAMES: Record<Position, string> = {
  QB: "Quarterbacks",
  RB: "Running backs",
  WR: "Wide receivers",
  TE: "Tight ends",
  OT: "Offensive tackles",
  IOL: "Interior O-line",
  IDL: "Interior D-line",
  EDGE: "Edge rushers",
  LB: "Linebackers",
  CB: "Cornerbacks",
  S: "Safeties",
};

export const ROUND_TIER_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const ROUND_TIER_NAMES: Record<number, string> = {
  1: "Round 1",
  2: "Round 2",
  3: "Round 3",
  4: "Round 4",
  5: "Round 5",
  6: "Round 6",
  7: "Round 7",
  8: "Priority free agents",
  9: "Not yet projected",
};

export function roundTierName(k: number): string {
  return ROUND_TIER_NAMES[k] ?? `Round ${k}`;
}

/**
 * Keep in sync with scripts/sync-sheet.mjs TIER_NAMES (duplicated there
 * because that plain-Node script doesn't run through the TS/Next build).
 * This is the generic (position-independent) name for each tier, used for
 * the board's "Group by tier" section headers, which span every position.
 * A single player's own tier label (lib/types.ts Player.tier) may differ
 * for tier 5 -- QB/OT/IOL show "Backup" there instead -- since that's
 * unambiguous for one player but not for a header spanning many.
 */
export const TIER_NAMES: Record<number, string> = {
  1: "Blue chip talent",
  2: "High-end starter",
  3: "Good starter",
  4: "Functional starter",
  5: "Rotational contributor/role player",
  6: "Depth",
  7: "Roster fringe",
};

/** Sentinel grouping key for players with no grading-tier data yet. */
export const UNGRADED_TIER = 999;

export function tierGroupKey(tierNumber: number | undefined): number {
  return typeof tierNumber === "number" && Number.isFinite(tierNumber) ? tierNumber : UNGRADED_TIER;
}

export function tierGroupName(tierNumber: number): string {
  if (tierNumber === UNGRADED_TIER) return "Ungraded";
  return TIER_NAMES[tierNumber] ?? `Tier ${tierNumber}`;
}

/**
 * 9 ("not yet projected") is distinct from 8 (an actual UDFA/PFA
 * projection) -- a player with no roundProjection at all (true for
 * everyone in the 2027 sheet so far) is not the same as one Jack has
 * projected as a priority free agent, and grouping them together would
 * misrepresent every unranked prospect as UDFA-caliber.
 */
export function roundProjectionToTierNumber(roundProjection: string | undefined): number {
  if (!roundProjection) return 9;
  if (roundProjection === "UDFA" || roundProjection === "PFA") return 8;
  const n = Number.parseInt(roundProjection, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 7) return n;
  return 9;
}
