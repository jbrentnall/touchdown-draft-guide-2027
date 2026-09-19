#!/usr/bin/env node
/**
 * Run this locally (or schedule it in Windows Task Scheduler) whenever you
 * want a fresh set of grades/ranks live on the site. It:
 *   1. Reads your grading workbook directly off your laptop (read-only,
 *      same safe method as scripts/export-grades.mjs).
 *   2. Writes the flat result to data/grades-source.json in this project.
 *   3. Commits and pushes that one file to GitHub.
 * The push triggers Netlify to rebuild automatically, and the build's
 * sheet sync (scripts/sync-sheet.mjs) joins this file's data into the
 * live players by name. No spreadsheet copy-paste, no manual Netlify
 * trigger -- just run this script.
 *
 * This does NOT touch your grading workbook or your scouting Google
 * Sheet -- read-only on both. It only ever writes data/grades-source.json
 * in this project folder.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import XLSX from "xlsx";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // no .env.local -- fine, GRADING_WORKBOOK_PATH can be passed as an arg instead
}

const SOURCE_PATH =
  process.argv[2] ??
  process.env.GRADING_WORKBOOK_PATH ??
  "C:/Users/jbren/OneDrive/Documents/The Touchdown/2027 NFL Draft/2027 NFL Draft - prospect grading sheet.xlsx";
const OUT_PATH = path.join(ROOT, "data", "grades-source.json");

const POSITIONS = ["QB", "RB", "WR", "TE", "OT", "IOL", "IDL", "EDGE", "LB", "CB", "S"];

function headerIndex(headers) {
  const map = new Map();
  headers.forEach((h, i) => {
    const key = (h ?? "").toString().trim();
    if (key) map.set(key, i);
  });
  return map;
}

function cell(row, idx) {
  if (idx === undefined) return "";
  const v = row[idx];
  return v === undefined || v === null ? "" : v.toString().trim();
}

function toNumber(v) {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function extractGrades() {
  const buf = fs.readFileSync(SOURCE_PATH);
  const wb = XLSX.read(buf, { type: "buffer", cellHTML: false });
  const out = [];

  for (const position of POSITIONS) {
    const ws = wb.Sheets[position];
    if (!ws) {
      console.warn(`No "${position}" tab found -- skipped.`);
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
    const idx = headerIndex(rows[0] ?? []);
    const missing = ["Name", "Final Grade", "Tier", "Rank", "Round grade"].filter((h) => !idx.has(h));
    if (missing.length) {
      console.warn(`"${position}" tab is missing column(s): ${missing.join(", ")} -- skipped.`);
      continue;
    }

    for (let i = 1; i < rows.length; i++) {
      const name = cell(rows[i], idx.get("Name"));
      if (!name) continue;
      out.push({
        position,
        name,
        school: cell(rows[i], idx.get("Team")),
        grade: toNumber(cell(rows[i], idx.get("Final Grade"))),
        tierNumber: toNumber(cell(rows[i], idx.get("Tier"))),
        positionRankNumber: toNumber(cell(rows[i], idx.get("Rank"))),
        roundGrade: cell(rows[i], idx.get("Round grade")) || undefined,
      });
    }
  }
  return out;
}

function run(cmd, args) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: "utf-8" }).trim();
}

function main() {
  const grades = extractGrades();
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(grades, null, 2));
  console.log(`Wrote ${grades.length} graded players to ${path.relative(ROOT, OUT_PATH)}`);

  const status = run("git", ["status", "--porcelain", "--", "data/grades-source.json"]);
  if (!status) {
    console.log("No change since last publish -- nothing to push.");
    return;
  }

  run("git", ["add", "data/grades-source.json"]);
  run("git", ["commit", "-m", `Update grades (${grades.length} players)`]);
  console.log("Pushing to GitHub...");
  run("git", ["push"]);
  console.log("Pushed. Netlify will rebuild automatically -- check the Netlify dashboard for progress.");
}

main();
