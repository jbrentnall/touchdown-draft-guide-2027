#!/usr/bin/env node
/**
 * Phase B: live Google Sheet sync.
 *
 * Reads one tab per position (QB, RB, WR, TE, OT, IOL, IDL, EDGE, LB, CB, S)
 * and writes data/generated/players.json in the same canonical shape
 * scripts/build-dev-data.mjs produces (lib/types.ts). Nothing else in the
 * app needs to know which of the two scripts ran.
 *
 * What this deliberately does NOT pull through yet (per Jack, 2026-09-19):
 * every column to the right of "Bottom Line" -- Games watched, Notes,
 * Round projection, Position Rank, Comp, First name/Surname. Those columns
 * exist on some tabs and not others right now and aren't populated even on
 * marquee profiles (checked Arch Manning's QB row: all empty), so pulling
 * them in would just be noise. Also not pulled: "Former school" and
 * "Recruitment (Rivals Industry)" -- in scope column-wise but no agreed UI
 * spot for them yet, so left out until asked for.
 *
 * Publish rule (per Jack): a player is published if their Status is
 * "Finalised", "Summer complete", or "In season". "Not started" and
 * "Carryover" are not published.
 *
 * There is no rank/grade/tier data in the sheet yet, so `overallRank` is a
 * placeholder: position-group order, then row order within that tab (i.e.
 * "however Jack currently has the tab sorted"). Same caveat as Phase A's
 * dev-data placeholder -- swap this for a real source once grade/tier
 * exist.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleAuth } from "google-auth-library";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_PATH = path.join(ROOT, "data", "generated", "players.json");

try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // no .env.local (e.g. Netlify build, where real env vars are already set)
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

const POSITION_TABS = ["QB", "RB", "WR", "TE", "OT", "IOL", "IDL", "EDGE", "LB", "CB", "S"];
const PUBLISHABLE_STATUSES = new Set(["Finalised", "Summer complete", "In season"]);

// Keep in sync with lib/team-colors.ts SCHOOL_ALIASES (duplicated here
// because this plain-Node script doesn't run through the TS/Next build).
const SCHOOL_ALIASES = { CAL: "CALIFORNIA", PITTSBURGH: "PITT" };

function requireEnv() {
  const missing = [];
  if (!SHEET_ID) missing.push("GOOGLE_SHEET_ID");
  if (!CLIENT_EMAIL) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!PRIVATE_KEY) missing.push("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")} (check .env.local)`);
  }
}

async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

async function sheetsApi(token, endpoint) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API ${res.status}: ${body}`);
  }
  return res.json();
}

function resolveSchoolKey(school) {
  const key = school.trim().toUpperCase();
  return SCHOOL_ALIASES[key] ?? key;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatHeight(raw) {
  // Sheet gives "6-4"; the rest of the app displays "6'4\"".
  const m = /^(\d+)-(\d+)$/.exec((raw ?? "").trim());
  if (!m) return raw || undefined;
  return `${m[1]}'${m[2]}"`;
}

function headerIndex(headers) {
  const map = new Map();
  headers.forEach((h, i) => {
    const key = h.trim();
    if (key) map.set(key, i);
  });
  return map;
}

function cell(row, idx) {
  if (idx === undefined) return "";
  return (row[idx] ?? "").toString().trim();
}

function traitTag(title, body) {
  if (!title) return undefined;
  return { title, body: body || "" };
}

function transformTab(position, headers, rows, colorKeys, ctx) {
  const idx = headerIndex(headers);
  // Column 0 is always the player name, even on tabs (EDGE, CB) where its
  // header cell is blank -- flagged to Jack, not worth failing the sync over.
  const players = [];

  for (const row of rows) {
    const name = cell(row, 0);
    if (!name) continue; // blank row

    const status = cell(row, idx.get("Status"));
    const school = cell(row, idx.get("College"));

    if (school && !colorKeys.has(resolveSchoolKey(school))) {
      ctx.unresolvedSchools.add(school);
    }

    let id = slugify(name);
    let suffix = 2;
    while (ctx.seenIds.has(id)) id = `${slugify(name)}-${suffix++}`;
    ctx.seenIds.add(id);

    const strengths = [1, 2, 3, 4].map((n) => cell(row, idx.get(`Pro ${n}`))).filter(Boolean);
    const weaknesses = [1, 2, 3, 4].map((n) => cell(row, idx.get(`Con ${n}`))).filter(Boolean);

    players.push({
      id,
      publish: PUBLISHABLE_STATUSES.has(status),
      name,
      first: name.split(" ")[0] ?? name,
      last: name.split(" ").slice(1).join(" ") || name,
      position,
      school,
      height: formatHeight(cell(row, idx.get("Height"))),
      weight: cell(row, idx.get("Weight")) || undefined,
      classYear: cell(row, idx.get("Class")) || undefined,
      positionRank: undefined,
      roundProjection: undefined,
      grade: undefined,
      tier: undefined,
      winsWith: traitTag(cell(row, idx.get("Where he wins")), cell(row, idx.get("Where he wins text"))),
      archetype: traitTag(cell(row, idx.get("What's his role")), cell(row, idx.get("What's his role text"))),
      improve: traitTag(cell(row, idx.get("Where he can improve")), cell(row, idx.get("Where he can improve text"))),
      strengths,
      weaknesses,
      statYears: undefined,
      stats: undefined,
      dataPercentiles: undefined,
      testingPercentiles: undefined,
      background: undefined,
      bottomLine: cell(row, idx.get("Bottom Line")) || undefined,
      _rowOrder: ctx.seenIds.size,
    });
  }

  return players;
}

async function main() {
  requireEnv();
  console.log(`Authenticating as ${CLIENT_EMAIL} ...`);
  const token = await getAccessToken();

  const meta = await sheetsApi(token, "?fields=sheets.properties");
  const tabsByTitle = new Map(meta.sheets.map((s) => [s.properties.title, s.properties]));

  const ranges = POSITION_TABS.filter((t) => tabsByTitle.has(t)).map((t) => `'${t}'!A1:ZZ`);
  const missingTabs = POSITION_TABS.filter((t) => !tabsByTitle.has(t));
  if (missingTabs.length) {
    console.warn(`Warning: no tab found for position(s): ${missingTabs.join(", ")}`);
  }

  const query = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const batch = await sheetsApi(token, `/values:batchGet?${query}`);

  const ctx = { seenIds: new Set(), unresolvedSchools: new Set() };
  const colorKeysPath = path.join(ROOT, "lib", "team-colors.ts");
  const colorKeysSrc = fs.readFileSync(colorKeysPath, "utf-8");
  const colorKeys = new Set(
    [...colorKeysSrc.matchAll(/^\s*(?:"([A-Z0-9 &]+)"|([A-Z][A-Z0-9]*)):\s*\[/gm)].map((m) => m[1] ?? m[2])
  );

  let allPlayers = [];
  batch.valueRanges.forEach((vr, i) => {
    const position = POSITION_TABS.filter((t) => tabsByTitle.has(t))[i];
    const [headers, ...rows] = vr.values ?? [[]];
    const players = transformTab(position, headers ?? [], rows, colorKeys, ctx);
    console.log(`${position}: ${players.length} players (${players.filter((p) => p.publish).length} published)`);
    allPlayers = allPlayers.concat(players);
  });

  // Placeholder overall rank: position-group order, then sheet row order.
  const posOrder = Object.fromEntries(POSITION_TABS.map((p, i) => [p, i]));
  allPlayers.sort((a, b) => posOrder[a.position] - posOrder[b.position] || a._rowOrder - b._rowOrder);
  allPlayers.forEach((p, i) => {
    p.overallRank = i + 1;
    delete p._rowOrder;
  });

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(allPlayers, null, 2));

  console.log(`\nWrote ${allPlayers.length} players (${allPlayers.filter((p) => p.publish).length} published) to ${path.relative(ROOT, OUT_PATH)}`);
  if (ctx.unresolvedSchools.size) {
    console.warn(`\nSchools with no team-colors entry (${ctx.unresolvedSchools.size}):`);
    for (const s of ctx.unresolvedSchools) console.warn(`  - ${s}`);
    console.warn("Add these to lib/team-colors.ts (or an alias) so theming/filtering work.\n");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
