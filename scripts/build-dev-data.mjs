#!/usr/bin/env node
/**
 * Phase A dev-data transform.
 *
 * Source: the DATA array embedded in draft-guide-prototype.html, NOT
 * 2026-guide-extracted.json directly. Both were checked field-by-field
 * before choosing:
 *   - 2026-guide-extracted.json's `testingPercentiles` holds raw combine
 *     numbers (e.g. 4.4, 393.7), not percentiles, despite the field name.
 *     Its `dataPercentiles` is empty on every player.
 *   - Its strengths/weaknesses/bottomLine have leftover PDF-extraction
 *     artifacts (stray trailing numbers) that the prototype already
 *     cleaned up.
 *   - The prototype's embedded DATA is the clean, complete, already-
 *     percentile-computed version of the same season -- it's what's
 *     actually rendering in the reference UI.
 * So for the throwaway Phase-A fixture, DATA is strictly better input.
 * This whole file goes away in Phase B, when scripts/sync-sheet.mjs reads
 * the live Google Sheet instead. 2026-guide-extracted.json stays in the
 * repo purely as Jack's original reference.
 *
 * One artifact DATA does NOT clean: `background` ends with a stray
 * "{positionRank} {roundProjection}" (confirmed on all 229 players) --
 * stripped below.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROTOTYPE_PATH = path.join(ROOT, "draft-guide-prototype.html");
const OUT_PATH = path.join(ROOT, "data", "generated", "players.json");

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "OT", "IOL", "IDL", "EDGE", "LB", "CB", "S"];

function roundProjectionToTierNumber(rp) {
  if (!rp) return 8;
  if (rp === "UDFA" || rp === "PFA") return 8;
  const n = Number.parseInt(rp, 10);
  return Number.isFinite(n) && n >= 1 && n <= 7 ? n : 8;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stripBackgroundSuffix(background, positionRank, roundProjection) {
  if (!background) return background;
  const suffix = ` ${positionRank} ${roundProjection}`;
  return background.endsWith(suffix) ? background.slice(0, -suffix.length) : background;
}

function loadPrototypeData() {
  const html = fs.readFileSync(PROTOTYPE_PATH, "utf-8");
  const match = html.match(/const DATA = (\[[\s\S]*?\]);\s*\n/);
  if (!match) {
    throw new Error("Could not find `const DATA = [...]` in draft-guide-prototype.html");
  }
  return JSON.parse(match[1]);
}

function loadTeamColorKeys() {
  const html = fs.readFileSync(PROTOTYPE_PATH, "utf-8");
  const match = html.match(/const COLORS = (\{[\s\S]*?\});/);
  return new Set(Object.keys(JSON.parse(match[1])));
}

// Keep in sync with lib/team-colors.ts SCHOOL_ALIASES (duplicated here
// because this plain-Node script doesn't run through the TS/Next build).
const SCHOOL_ALIASES = { CAL: "CALIFORNIA" };

function resolveSchoolKey(school) {
  const key = school.trim().toUpperCase();
  return SCHOOL_ALIASES[key] ?? key;
}

// Every player's `stats` carries a stray "0%": ["20%","40%",...,"100%"]
// entry -- a chart-axis label left over from the PDF extraction, not a
// real stat row. Drop it.
function cleanStats(stats) {
  if (!stats) return undefined;
  const cleaned = { ...stats };
  delete cleaned["0%"];
  return Object.keys(cleaned).length ? cleaned : undefined;
}

function traitTag(obj) {
  if (!obj || !obj.t) return undefined;
  return { title: obj.t, body: obj.b ?? "" };
}

function transform(raw, colorKeys) {
  const seenIds = new Set();
  const unresolvedSchools = new Set();

  const players = raw.map((p) => {
    const prNum = Number.parseInt(p.positionRank, 10);
    const rpNum = roundProjectionToTierNumber(p.roundProjection);

    if (!colorKeys.has(resolveSchoolKey(p.school))) {
      unresolvedSchools.add(p.school);
    }

    let id = slugify(p.name);
    let suffix = 2;
    while (seenIds.has(id)) {
      id = `${slugify(p.name)}-${suffix++}`;
    }
    seenIds.add(id);

    return {
      id,
      publish: true,
      name: p.name,
      first: p.name.split(" ")[0] ?? p.name,
      last: p.name.split(" ").slice(1).join(" ") || p.name,
      position: p.position,
      school: p.school,
      height: p.height || undefined,
      weight: p.weight || undefined,
      classYear: p.classYear || undefined,
      positionRank: p.positionRank || undefined,
      roundProjection: p.roundProjection || undefined,
      // No grade/tier source yet -- Phase B introduces both from the sheet.
      grade: undefined,
      tier: undefined,
      _prNum: Number.isFinite(prNum) ? prNum : 999,
      _posOrder: POSITION_ORDER.indexOf(p.position),
      winsWith: traitTag(p.wins),
      archetype: traitTag(p.role),
      improve: traitTag(p.improve),
      strengths: p.strengths ?? [],
      weaknesses: p.weaknesses ?? [],
      statYears: p.statYears ?? undefined,
      stats: cleanStats(p.stats),
      dataPercentiles: p.dataPct ?? undefined,
      testingPercentiles: p.testPct ?? undefined,
      background: stripBackgroundSuffix(p.background, p.positionRank, p.roundProjection),
      bottomLine: p.bottomLine || undefined,
    };
  });

  // Placeholder overall rank: position-group order, then position rank.
  // Phase A only -- there is no real cross-position rank in last year's
  // data. Phase B should source this from grade/tier once live.
  players.sort((a, b) => a._posOrder - b._posOrder || a._prNum - b._prNum);
  players.forEach((p, i) => {
    p.overallRank = i + 1;
    delete p._prNum;
    delete p._posOrder;
  });

  return { players, unresolvedSchools };
}

function main() {
  const raw = loadPrototypeData();
  const colorKeys = loadTeamColorKeys();
  const { players, unresolvedSchools } = transform(raw, colorKeys);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(players, null, 2));

  console.log(`Wrote ${players.length} players to ${path.relative(ROOT, OUT_PATH)}`);
  if (unresolvedSchools.size) {
    console.warn(`\nSchools with no team-colors entry (${unresolvedSchools.size}):`);
    for (const s of unresolvedSchools) console.warn(`  - ${s}`);
    console.warn("Add these to lib/team-colors.ts (or an alias) so theming/filtering work.\n");
  }
}

main();
