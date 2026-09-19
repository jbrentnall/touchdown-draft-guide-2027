# The Touchdown - Draft Guide (interactive)

Next.js (App Router, TypeScript) site for the interactive Draft Guide. Deploys to
Netlify. Full profile content is only ever served from the server to an
entitled request - see "How the paywall seam works" below.

## Status: Phase B

Board + profile UI + team theming, now running on live data synced from the
2027 Google Sheet at build time. No real store/auth yet - that's Phase C. The
free/gated split (top N players open, the rest locked) is wired and working;
entitlement is currently a placeholder passphrase, not a real purchase.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the Google + placeholder-gate values
npm run dev
```

Opens on http://localhost:3000. `npm run dev` and `npm run build` both run
`scripts/sync-sheet.mjs` first, which reads the live sheet and regenerates
`data/generated/players.json` - you don't need to touch that file by hand.
To work offline against last year's class instead (no Google credentials
needed), run `npm run sync:fixture` once, then `next dev` directly.

Visit `/unlock` and enter your `PLACEHOLDER_ACCESS_CODE` to simulate being an
entitled buyer (unlocks every profile in that browser via a cookie). Without
it, only the top `FREE_PLAYER_LIMIT` players (by overall rank) are open.

## Google Sheets service account setup

One-time setup, per Google Cloud project:

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com) (no billing needed).
2. **APIs & Services -> Library** -> enable "Google Sheets API".
3. **APIs & Services -> Credentials -> Create Credentials -> Service account**. No project role needed - access comes from sharing the sheet directly (step 5).
4. Open the service account -> **Keys** -> **Add Key -> Create new key -> JSON**. Downloads a credential file - treat it like a password.
5. Copy the service account's email (looks like `name@project-id.iam.gserviceaccount.com`). Share the Google Sheet with it as **Viewer**.
6. From the downloaded JSON, put `client_email` and `private_key` into `.env.local` as `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (keep the key's `\n` sequences literal, wrap the whole value in double quotes), plus `GOOGLE_SHEET_ID` from the sheet's URL (`.../spreadsheets/d/<THIS>/edit`).

If a private key is ever pasted somewhere it shouldn't be (chat, a screenshot, a public repo), rotate it: Service Account -> Keys -> delete the old key -> Add Key -> new JSON, then update `.env.local`/Netlify env with the new value. Nothing else depends on a specific key file.

## Where the data comes from

`scripts/sync-sheet.mjs` reads one tab per position (QB, RB, WR, TE, OT, IOL,
IDL, EDGE, LB, CB, S) from the sheet and writes `data/generated/players.json`
in the canonical shape (`lib/types.ts`). `scripts/build-dev-data.mjs` is the
Phase A fallback (last year's class, from `draft-guide-prototype.html`'s
embedded data) - still there for offline work, not used by default anymore.

**What's mapped:** Player -> name, College -> school, Height/Weight (sheet's
"6-4" is reformatted to "6'4\""), Pro 1-4 -> strengths, Con 1-4 -> weaknesses,
"Where he wins"/"What's his role"/"Where he can improve" (+ their text
columns) -> the three trait tags, Bottom Line -> bottomLine, Status -> the
publish flag (see below).

**What's deliberately not pulled through yet** (per Jack, 2026-09-19): every
column to the right of Bottom Line - Games watched, Notes, Round projection,
Position Rank, Comp, First name/Surname - plus "Former school" and
"Recruitment (Rivals Industry)" even though they're in scope column-wise.
None of these have an agreed mapping or UI spot yet. `background`,
`roundProjection`, `positionRank`, `grade`, and `tier` are all `undefined`
for every player as a result - partial-profile rendering already handles
that (those sections just don't render).

**Publish rule:** a player is published if their sheet `Status` is
`Finalised`, `Summer complete`, or `In season`. `Not started` and
`Carryover` are not published. Change `PUBLISHABLE_STATUSES` in
`scripts/sync-sheet.mjs` if that rule changes.

**Overall rank (for the free/gated split) is a placeholder**: position-group
order (QB, RB, WR, ...), then whatever order rows are in within that
position's tab. There's no grade/tier or rank data in the sheet yet - once
there is, swap the sort in `scripts/sync-sheet.mjs`'s `main()` for that
instead of row order.

**Board grouping:** "Round projection" mode groups everyone into "Not yet
projected" right now, since none of the current data has a projection - that's
distinct from "Priority free agents" (an actual UDFA/PFA projection), so
unranked prospects don't get mislabeled as replacement-level. See
`lib/constants.ts`'s `roundProjectionToTierNumber`.

## How the paywall seam works

Nothing in `lib/players.ts` (full profile data) is imported by any client
component. The board only ever receives `BoardTeaser` (name, position,
school, rank, tier, round projection - no scouting content). Full profiles
are fetched on demand, only through `app/api/profile/[id]/route.ts`, which
checks entitlement server-side before returning anything. A locked request
gets back `{"locked":true}` and nothing else.

Right now "entitled" means "has the placeholder cookie from `/unlock`" -
that's `lib/entitlement.ts`. Phase C replaces the inside of that one file
with a real session + purchase-record check; every caller
(`app/api/profile/[id]/route.ts`, `components/Board.tsx` via
`lib/entitlement-shared.ts`) stays the same.

## Adding a new school's colours

Open `lib/team-colors.ts` and add a row to `TEAM_COLORS`, keyed by the
school's name in upper case, with `[primaryHex, secondaryHex]`. If a school
appears in your data under a short or alternate name (e.g. "Cal" for
"California", "Pittsburgh" for last year's "PITT"), add it to
`SCHOOL_ALIASES` instead of duplicating the colour row - and update the
matching alias table in `scripts/build-dev-data.mjs` and
`scripts/sync-sheet.mjs` too, since those plain-Node scripts can't import
the `.ts` file directly.

The sync script warns on stdout about any school it can't resolve to a
colour entry - watch for that after every sheet sync. It resolves
case-insensitively, so a typo like "MInnesota" vs "Minnesota" won't trip the
warning (both resolve to the same colour key) but is still worth fixing at
the source - it's exactly the kind of inconsistency that'll bite you if
`school` is ever used for exact-match filtering instead of theming.

## Known open items (flagged, not guessed at)

- **Class year format** ("3Jr", "4Sr" etc.) is shown verbatim - not
  reformatted, since the leading-digit convention hasn't been confirmed.
- Everything under "What's deliberately not pulled through yet" above is a
  standing decision point, not a bug - background, comps, games watched,
  round projection/position rank, and the recruiting-star/transfer-school
  columns can all be wired in once there's an agreed shape and UI spot.
- Last year's dev-fixture data has a couple of upstream PDF-extraction
  artifacts (trait-tag titles cut short mid-phrase) - not touched, not worth
  fixing on throwaway comparison data, only relevant if `sync:fixture` is
  still in use.

## Environment variables

See `.env.example`. Copy to `.env.local` for local dev (never commit either
`.env` file). Netlify env vars for the Phase B/C ones get set in the Netlify
dashboard when we get there, not committed anywhere.
