#!/usr/bin/env node
/**
 * Local-only helper, not part of the site build. Run this on your own
 * laptop whenever you want a fresh flat export of your grading workbook
 * (Name, Position, School, Final Grade, Tier, Rank, Round grade) across
 * all 11 position tabs.
 *
 * Deliberately does NOT touch the source workbook -- it only reads it,
 * then writes a brand-new, separate file. A script rewriting your entire
 * complex workbook (formulas, external links to your other databases)
 * isn't something a library can guarantee perfect fidelity on; reading it
 * and writing something fresh carries no such risk. Drag the resulting
 * sheet into your main workbook yourself with Excel's own "Move or Copy
 * Sheet" (right-click the sheet tab -> Move or Copy -> pick the workbook
 * -> check "Create a copy") if you want it living there permanently --
 * that's Excel's own engine, so nothing about your file's fidelity is at
 * risk from this script either way.
 */
import XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

const SOURCE_PATH =
  process.argv[2] ??
  "C:/Users/jbren/OneDrive/Documents/The Touchdown/2027 NFL Draft/2027 NFL Draft - prospect grading sheet.xlsx";
const OUTPUT_PATH = path.join(path.dirname(SOURCE_PATH), "2027 NFL Draft - Grades Export.xlsx");

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
  return Number.isFinite(n) ? n : v || "";
}

function main() {
  const buf = fs.readFileSync(SOURCE_PATH);
  const wb = XLSX.read(buf, { type: "buffer", cellHTML: false });
  const out = [["Position", "Name", "School", "Grade", "Tier", "Position Rank", "Round Grade"]];

  for (const position of POSITIONS) {
    const ws = wb.Sheets[position];
    if (!ws) {
      console.warn(`No "${position}" tab found in the source workbook -- skipped.`);
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
    const idx = headerIndex(rows[0] ?? []);
    const missing = ["Name", "Final Grade", "Tier", "Rank", "Round grade"].filter((h) => !idx.has(h));
    if (missing.length) {
      console.warn(`"${position}" tab is missing expected column(s): ${missing.join(", ")} -- skipped.`);
      continue;
    }

    const rowsForPosition = [];
    for (let i = 1; i < rows.length; i++) {
      const name = cell(rows[i], idx.get("Name"));
      if (!name) continue;
      rowsForPosition.push([
        position,
        name,
        cell(rows[i], idx.get("Team")),
        toNumber(cell(rows[i], idx.get("Final Grade"))),
        toNumber(cell(rows[i], idx.get("Tier"))),
        toNumber(cell(rows[i], idx.get("Rank"))),
        cell(rows[i], idx.get("Round grade")),
      ]);
    }
    rowsForPosition.sort((a, b) => (a[5] || 999) - (b[5] || 999));
    out.push(...rowsForPosition);
    console.log(`${position}: ${rowsForPosition.length} graded players`);
  }

  const newSheet = XLSX.utils.aoa_to_sheet(out);
  const newWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWb, newSheet, "Grades Export");
  const outBuf = XLSX.write(newWb, { type: "buffer", bookType: "xlsx" });
  fs.writeFileSync(OUTPUT_PATH, outBuf);

  console.log(`\nWrote ${out.length - 1} rows to:\n${OUTPUT_PATH}`);
  console.log(`Source workbook was not modified.`);
}

main();
