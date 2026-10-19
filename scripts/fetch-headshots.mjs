#!/usr/bin/env node
/**
 * Run locally (not part of the site build): downloads each published
 * player's headshot ONCE into public/headshots/<player-id>.png and records
 * it in data/headshots-manifest.json. Players who already have a file are
 * skipped, so re-running only fetches new players. Commit the results --
 * the site serves them as plain static files, nothing is fetched at build
 * or visit time.
 *
 * Source: ESPN's college football player search (unofficial, undocumented
 * endpoint). Matching is deliberately strict -- the ESPN player's name AND
 * school (checked against ESPN's own team list) must match -- because a
 * wrong face on a paid profile is worse than no photo. Anything that
 * doesn't match cleanly is reported, never guessed. To fix one by hand, add
 * "<player-id>": "<espn athlete id>" to data/headshot-overrides.json.
 *
 * Rights note: these photos come via ESPN from the schools; the schools or
 * their photographers still hold the copyright. To drop headshots entirely,
 * delete public/headshots and data/headshots-manifest.json -- the site
 * simply stops showing them.
 *
 * Usage: node scripts/fetch-headshots.mjs [--all]   (--all includes
 * unpublished players too)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PLAYERS_PATH = path.join(ROOT, "data", "generated", "players.json");
const MANIFEST_PATH = path.join(ROOT, "data", "headshots-manifest.json");
const OVERRIDES_PATH = path.join(ROOT, "data", "headshot-overrides.json");
const OUT_DIR = path.join(ROOT, "public", "headshots");
const DELAY_MS = 250;

// Our school spellings -> ESPN's "location" for the team.
const SCHOOL_TO_ESPN = {
  usf: "south florida",
  pitt: "pittsburgh",
  pittsburgh: "pittsburgh",
  cal: "california",
};

// Rough ESPN position abbreviations that count as "compatible" with ours.
// Tie-breaker only, never a hard filter.
const POSITION_COMPAT = {
  QB: ["QB"],
  RB: ["RB", "FB", "HB"],
  WR: ["WR"],
  TE: ["TE"],
  OT: ["OT", "OL", "T"],
  IOL: ["OG", "C", "OL", "G"],
  IDL: ["DT", "DL", "NT"],
  EDGE: ["DE", "DL", "LB", "OLB", "EDGE"],
  LB: ["LB", "ILB", "OLB"],
  CB: ["CB", "DB"],
  S: ["S", "FS", "SS", "DB"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normSchool(s) {
  const k = s
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9&()]+/g, " ")
    .trim();
  return SCHOOL_TO_ESPN[k] ?? k;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function loadTeamNames() {
  const j = await getJson(
    "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=1000"
  );
  const map = new Map(); // normalized school -> Set(ESPN team displayName)
  for (const { team } of j.sports[0].leagues[0].teams) {
    const key = normSchool(team.location);
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(team.displayName);
  }
  return map;
}

function teamNamesOf(item) {
  return (item.teamRelationships ?? [])
    .map((t) => t.displayName ?? t.core?.displayName)
    .filter(Boolean);
}

async function search(name) {
  const url = `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(
    name
  )}&limit=10&type=player&sport=football&league=college-football`;
  const j = await getJson(url);
  return (j.items ?? []).filter(
    (it) => it.type === "player" && (it.defaultLeagueSlug === "college-football" || it.league === "college-football")
  );
}

async function findEspnPlayer(player, teams) {
  const schoolTeams = teams.get(normSchool(player.school));
  if (!schoolTeams) return { reason: `school "${player.school}" not found in ESPN's team list` };

  const queries = [player.name];
  const stripped = player.name.replace(/\b(Jr|Sr|II|III|IV)\.?$/i, "").trim();
  if (stripped !== player.name) queries.push(stripped);

  for (const q of queries) {
    const items = await search(q);
    await sleep(DELAY_MS);
    const matches = items.filter(
      (it) =>
        normName(it.displayName) === normName(player.name) &&
        teamNamesOf(it).some((t) => schoolTeams.has(t))
    );
    if (matches.length === 1) return { item: matches[0] };
    if (matches.length > 1) {
      const compat = POSITION_COMPAT[player.position] ?? [];
      const byPos = matches.filter((it) => compat.includes(it.position?.abbreviation));
      if (byPos.length === 1) return { item: byPos[0] };
      return { reason: `ambiguous (${matches.length} ESPN players share this name and school)` };
    }
  }
  return { reason: "no ESPN player with this name at this school" };
}

async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) return false;
  const type = res.headers.get("content-type") ?? "";
  const buf = Buffer.from(await res.arrayBuffer());
  if (!type.startsWith("image/") || buf.length < 1500) return false;
  fs.writeFileSync(dest, buf);
  return true;
}

async function main() {
  const includeAll = process.argv.includes("--all");
  const players = JSON.parse(fs.readFileSync(PLAYERS_PATH, "utf-8")).filter((p) => includeAll || p.publish);
  const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")) : {};
  const overrides = fs.existsSync(OVERRIDES_PATH) ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8")) : {};
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const teams = await loadTeamNames();
  let downloaded = 0;
  let cached = 0;
  const problems = [];

  for (const p of players) {
    const file = `${p.id}.png`;
    const dest = path.join(OUT_DIR, file);
    if (fs.existsSync(dest) && manifest[p.id]) {
      cached++;
      continue;
    }

    let espnId = overrides[p.id];
    let imageUrl;
    if (espnId) {
      imageUrl = `https://a.espncdn.com/i/headshots/college-football/players/full/${espnId}.png`;
    } else {
      let found;
      try {
        found = await findEspnPlayer(p, teams);
      } catch (err) {
        problems.push([p, `lookup failed: ${err.message}`]);
        continue;
      }
      if (!found.item) {
        problems.push([p, found.reason]);
        continue;
      }
      espnId = found.item.id;
      imageUrl = found.item.headshot?.href;
    }

    if (!imageUrl || !(await downloadImage(imageUrl, dest))) {
      problems.push([p, "matched on ESPN but no headshot image available"]);
      continue;
    }
    manifest[p.id] = { espnId: String(espnId), file };
    downloaded++;
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nDownloaded ${downloaded} new, ${cached} already had a photo, ${problems.length} without one.`);
  if (problems.length) {
    console.log("\nNo headshot for:");
    for (const [p, why] of problems) console.log(`  - ${p.name} (${p.position}, ${p.school}): ${why}`);
    console.log('\nTo fix one by hand, add "<player-id>": "<espn athlete id>" to data/headshot-overrides.json.');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
