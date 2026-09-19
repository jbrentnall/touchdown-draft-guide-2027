#!/usr/bin/env node
/**
 * Run this locally whenever you want fresh advanced-metric percentile
 * bars on the site (same pattern as scripts/publish-grades.mjs). Reads
 * the per-position "Comp tool data" CSVs directly off your laptop
 * (read-only -- these are the same files your prospect-comp-tool.netlify.app
 * uses), pulls each current prospect's most recent season only, and
 * pushes the result to GitHub to trigger a Netlify rebuild.
 *
 * Only QB, RB, WR, TE have this data -- PFF doesn't export the same
 * route/coverage-based metrics for other positions, so the other 7
 * position groups simply don't get an "Advanced data percentile"
 * section (partial-profile rendering already handles that).
 *
 * Season rule (per Jack, 2026-09-19): only TARGET_SEASON below counts.
 * A player with no row for that exact year gets nothing -- older seasons
 * are never used as a fallback, since that would show stale production.
 * Bump TARGET_SEASON by one every year this guide runs.
 *
 * The percentile columns in these CSVs are already pre-computed (not
 * something this script calculates) -- verified against the live comp
 * tool's own numbers for Jeremiah Smith's 2025 season before trusting
 * this approach.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_PATH = path.join(ROOT, "data", "analytics-source.json");
const TARGET_SEASON = "2025";

const CSV_DIR =
  process.argv[2] ?? "C:/Users/jbren/OneDrive/Documents/The Touchdown/Comp tool data";

// Maps each position to {csvFile, metrics: [[displayLabel, csvColumnName], ...]}.
// Column names matched case-insensitively. Labels match Jack's own
// comp-tool "Metric Guide" wording for each position.
const POSITION_CONFIG = {
  QB: {
    file: "QB comp tool data.csv",
    metrics: [
      ["Adj Cmp%", "adj cmp percentile"],
      ["P2S%", "p2sack percentile"],
      ["Clean Pocket QBR", "clean pocket QBR percentile"],
      ["Pressured QBR", "pressure QBR percentile"],
      ["True Dropback Rate", "true dropback rate percentile"],
      ["Time to Throw", "ttt percentile"],
      ["BTT Rate", "btt percentile"],
      ["TWP Rate", "twp percentile"],
    ],
  },
  RB: {
    file: "RB comp tool data.csv",
    metrics: [
      ["FMT/Att", "FMTOE Percentile"],
      ["YCO/Att", "YCO/A Percentile"],
      ["1D/Att", "FDpc Percentile"],
      ["Explosive Rate", "ECR Percentile"],
      ["Breakaway Rate", "BCR Percentile"],
      ["YPC+", "YPC+ Percentile"],
      ["Fumble Rate", "Fumble rate percentile"],
      ["YPRR", "YPRR percentile"],
    ],
  },
  WR: {
    file: "WR comp tool data.csv",
    metrics: [
      ["YPRR", "yprr percentile"],
      ["Threat Rate", "threat rate percentile"],
      ["1D/Route", "first down per route percentile"],
      ["YAC/Rec", "yac per reception percentile"],
      ["ADOT", "ADOT percentile"],
      ["Contested Catch", "contested catch rate percentile"],
      ["Man YPRR", "man yprr percentile"],
      ["Zone YPRR", "zone yprr percentile"],
    ],
  },
  TE: {
    file: "TE comp tool data.csv",
    metrics: [
      ["YPRR", "yprr percentile"],
      ["Threat Rate", "threat rate percentile"],
      ["1D/Route", "first down per route percentile"],
      ["YAC/Rec", "YAC per reception percentile"],
      ["ADOT", "ADOT percentile"],
      ["Contested Catch", "contested catch rate percentile"],
      ["Man YPRR", "man yprr percentile"],
      ["Zone YPRR", "zone yprr percentile"],
    ],
  },
};

function readCsvRows(filePath) {
  let text = fs.readFileSync(filePath, "utf-8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const headers = lines[0].split(",");
  const lowerIndex = new Map(headers.map((h, i) => [h.trim().toLowerCase(), i]));
  return { lowerIndex, dataLines: lines.slice(1) };
}

function parsePercentile(raw) {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed.replace("%", ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function extractPosition(position, config) {
  const filePath = path.join(CSV_DIR, config.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`No file at ${filePath} -- skipping ${position}.`);
    return [];
  }
  const { lowerIndex, dataLines } = readCsvRows(filePath);
  // Column 0 is always the player name, even on the TE file, whose header
  // row is missing that label (blank cell where "player" should be) --
  // flagged to Jack, not worth failing the extraction over.
  const nameIdx = 0;
  const yearIdx = lowerIndex.get("year");
  const schoolIdx = lowerIndex.get("team_name");

  const metricIdx = config.metrics.map(([label, col]) => [label, lowerIndex.get(col.toLowerCase())]);
  const missing = metricIdx.filter(([, i]) => i === undefined);
  if (missing.length) {
    console.warn(`${position}: missing column(s) ${missing.map(([l]) => l).join(", ")}`);
  }

  const out = [];
  for (const line of dataLines) {
    const cols = line.split(",");
    if (cols[yearIdx] !== TARGET_SEASON) continue;
    const name = (cols[nameIdx] ?? "").trim();
    if (!name) continue;

    const percentiles = {};
    for (const [label, idx] of metricIdx) {
      if (idx === undefined) continue;
      percentiles[label] = parsePercentile(cols[idx]);
    }
    out.push({ position, name, school: (cols[schoolIdx] ?? "").trim(), percentiles });
  }
  return out;
}

function run(cmd, args) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: "utf-8" }).trim();
}

function main() {
  let all = [];
  for (const [position, config] of Object.entries(POSITION_CONFIG)) {
    const rows = extractPosition(position, config);
    console.log(`${position}: ${rows.length} players with a ${TARGET_SEASON} season`);
    all = all.concat(rows);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(all, null, 2));
  console.log(`\nWrote ${all.length} player-seasons to ${path.relative(ROOT, OUT_PATH)}`);

  const status = run("git", ["status", "--porcelain", "--", "data/analytics-source.json"]);
  if (!status) {
    console.log("No change since last publish -- nothing to push.");
    return;
  }
  run("git", ["add", "data/analytics-source.json"]);
  run("git", ["commit", "-m", `Update advanced-metric percentiles (${all.length} players)`]);
  console.log("Pushing to GitHub...");
  run("git", ["push"]);
  console.log("Pushed. Netlify will rebuild automatically.");
}

main();
