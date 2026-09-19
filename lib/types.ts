/**
 * Canonical player schema. This is the shape both the dev-data transform
 * (scripts/build-dev-data.mjs) and the future sheet transform
 * (scripts/sync-sheet.mjs, Phase B) must produce. UI code only ever reads
 * this shape, never the raw source (JSON export or sheet row) directly.
 */

export type Position =
  | "QB" | "RB" | "WR" | "TE" | "OT" | "IOL" | "IDL" | "EDGE" | "LB" | "CB" | "S";

export interface TraitTag {
  title: string;
  body: string;
}

export type StatTable = Record<string, string[]>;

/** 0-100 percentile, or null when the drill/metric wasn't tested/available. */
export type PercentileMap = Record<string, number | null>;

/**
 * Full player profile. Every field below identity/position/school is
 * optional by design -- a profile is never all-or-nothing (brief section 2).
 * Rendering components must omit sections whose data is missing, never
 * render a placeholder or a zero.
 */
export interface Player {
  id: string;
  publish: boolean;

  name: string;
  first: string;
  last: string;
  position: Position;
  /** Controlled value -- must match a key in lib/team-colors.ts. */
  school: string;
  height?: string;
  weight?: string;
  classYear?: string;

  positionRank?: string;
  /** '1'..'7', 'UDFA', or 'PFA'. Unused now that grading is joined in --
   * kept for the last-year dev-fixture path (build-dev-data.mjs). */
  roundProjection?: string;
  /** Free-text round grade from the grading workbook (e.g. "Top 5",
   * "Late 1st-Early 2nd"). Takes precedence over roundProjection when
   * present. Not a strict enum -- Jack's own wording, shown verbatim. */
  roundGrade?: string;

  /** Numeric evaluation grade from the grading workbook (0-10ish scale). */
  grade?: number;
  /** Numeric tier from the grading workbook. Source of truth for the
   * "Group by tier" board mode. */
  tierNumber?: number;
  /** Display label for tierNumber (e.g. "Tier 1"). */
  tier?: string;
  /**
   * Cross-position big-board rank used for the free/gated split and
   * default board ordering. Graded players are ranked by tier then grade
   * (real data, scripts/sync-sheet.mjs); ungraded players fall back to a
   * position-order + sheet-row-order placeholder, appended after everyone
   * graded.
   */
  overallRank?: number;

  /** "Where he wins" trait tag. */
  winsWith?: TraitTag;
  /** Projected archetype / role trait tag. */
  archetype?: TraitTag;
  /** "Where he can improve" trait tag. */
  improve?: TraitTag;

  strengths: string[];
  weaknesses: string[];

  statYears?: string[];
  stats?: StatTable;

  /** Percentile vs comparable seasons at the position. Phase A: sourced
   * from the prototype's precomputed values, see note in build-dev-data.mjs. */
  dataPercentiles?: PercentileMap;
  /** Percentile vs all prospects at the position (pre-draft testing). */
  testingPercentiles?: PercentileMap;

  background?: string;
  bottomLine?: string;
}

/**
 * Client-safe subset shown on the board regardless of entitlement.
 * Never includes scouting-report content (strengths/weaknesses/percentiles/
 * background/bottomLine/trait tags) -- that only ever travels through the
 * gated profile fetch (app/api/profile/[id]/route.ts).
 */
export interface BoardTeaser {
  id: string;
  name: string;
  position: Position;
  school: string;
  classYear?: string;
  positionRank?: string;
  roundProjection?: string;
  roundGrade?: string;
  tierNumber?: number;
  tier?: string;
  overallRank: number;
}

export function toBoardTeaser(p: Player): BoardTeaser {
  return {
    id: p.id,
    name: p.name,
    position: p.position,
    school: p.school,
    classYear: p.classYear,
    positionRank: p.positionRank,
    roundProjection: p.roundProjection,
    roundGrade: p.roundGrade,
    tierNumber: p.tierNumber,
    tier: p.tier,
    overallRank: p.overallRank ?? Number.MAX_SAFE_INTEGER,
  };
}
