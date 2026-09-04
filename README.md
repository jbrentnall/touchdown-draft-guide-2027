# The Touchdown - Draft Guide (interactive)

Next.js (App Router, TypeScript) site for the interactive Draft Guide. Deploys to
Netlify. Full profile content is only ever served from the server to an
entitled request - see "How the paywall seam works" below.

## Status: Phase A

Board + profile UI + team theming, running against last year's class as dev
data (see "Where the dev data comes from"). No live Google Sheet yet, no real
store/auth yet - both come in later phases. The free/gated split (top N
players open, the rest locked) is wired and working; entitlement is currently
a placeholder passphrase, not a real purchase.

## Running locally

```bash
npm install
cp .env.example .env.local   # then edit PLACEHOLDER_ACCESS_CODE
npm run dev
```

Opens on http://localhost:3000. `npm run dev` and `npm run build` both run
`scripts/build-dev-data.mjs` first, which regenerates
`data/generated/players.json` from `draft-guide-prototype.html`'s embedded
data - you don't need to touch that file by hand.

Visit `/unlock` and enter your `PLACEHOLDER_ACCESS_CODE` to simulate being an
entitled buyer (unlocks every profile in that browser via a cookie). Without
it, only the top `FREE_PLAYER_LIMIT` players (by overall rank) are open.

## Where the dev data comes from

Two source files sit at the repo root, both from last year's guide:

- `draft-guide-prototype.html` - the reference UI (design/behaviour spec) AND,
  it turns out, the cleaner data source. Its embedded `DATA` array is what
  `scripts/build-dev-data.mjs` actually reads.
- `2026-guide-extracted.json` - kept as your original reference. Not read by
  the build. It has some PDF-extraction artifacts the prototype's data
  already cleaned up (raw, non-percentile numbers in what it calls
  `testingPercentiles`; stray trailing digits on some strengths/weaknesses;
  an empty `dataPercentiles` on every player). Worth knowing about if you
  ever go back to it.

This whole file (and `scripts/build-dev-data.mjs`) gets replaced in Phase B by
`scripts/sync-sheet.mjs` reading your live Google Sheet. Nothing else in the
app changes - both scripts produce the same `data/generated/players.json`
shape (`lib/types.ts`).

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
"California"), add it to `SCHOOL_ALIASES` instead of duplicating the colour
row - and update the matching alias table in `scripts/build-dev-data.mjs`
(Phase B: `scripts/sync-sheet.mjs`) too, since that plain-Node script can't
import the `.ts` file directly.

The sync script warns on stdout about any school it can't resolve to a
colour entry - watch for that after every sheet sync once Phase B lands.

## Known deviations from the prototype (flagged for Jack, not silently fixed)

- Board rows don't show the one-line "role" trait the prototype showed inline
  (e.g. "Gunslinger" under a QB's name) - that's scouting content, and the
  board only ever gets the content-free teaser. Worth a decision: is that
  one-liner sensitive enough to stay gated, or is it teaser-safe like the
  tier/round projection already showing?
- Grouping by "round tier" is really still grouping by round *projection*
  (the prototype's stand-in) - there's no grade/tier data yet. Phase B swaps
  this once your grade/tier columns exist.
- A few trait-tag titles in last year's data are cut short mid-phrase (e.g.
  "Out of" / "structure You're not getting..." instead of "Out of structure"
  as the title). That's an upstream PDF-extraction artifact from last year,
  not something introduced here - not worth fixing for throwaway dev data,
  but flagging in case it also affects other archived seasons you reuse.

## Environment variables

See `.env.example`. Copy to `.env.local` for local dev (never commit either
`.env` file). Netlify env vars for the Phase B/C ones get set in the Netlify
dashboard when we get there, not committed anywhere.
