# Claude Code kickoff prompt: The Touchdown interactive Draft Guide

Copy everything below the line into Claude Code as your first message. Before you do, drop the two starting files (see step 1) into an empty project folder and open Claude Code in that folder.

---

I'm building an interactive website version of The Touchdown's annual NFL Draft Guide. I run the Draft content for The Touchdown; the guide is a scouting product with a written profile for every prospect in the class. Historically it has shipped as a paid PDF. This year the model is: buying the PDF also grants access to this website. So the site is a paid product, and protecting the content matters.

I want to work through this in phases with you, not have you build the whole thing in one pass. Read this whole brief first, then propose a tech stack and a build plan and wait for me to confirm before writing code. Where I've left a decision open, surface it and ask me rather than guessing.

## 1. Starting assets (already in this folder)

- `draft-guide-prototype.html` — a working, self-contained reference UI for the board and the profile panel. This is the look and interaction I want. Treat it as the design and behaviour spec, not as the codebase to extend. Rebuild its ideas properly in the real stack.
- `2026-guide-extracted.json` — last year's full class (229 players) in the exact rendered data shape the prototype consumes. Use it as the reference for what fields a profile needs and to develop against before my live data is wired in.

## 2. Data source and how updates work

My prospect notes live in a Google Sheet, one row per player. I add players and edit notes continuously through the season, so I do not want to wait for a finished class to publish. I want the site to reflect the sheet.

Use build-time sync, not live per-request reads of the sheet:

- A script reads the Google Sheet (read-only, server-side, via the Sheets API with a service account), transforms each row into the profile JSON shape, and writes it into the project as static data.
- The site rebuilds and redeploys to publish changes. Wire this to a Netlify build hook, fired on a nightly schedule and also on demand, plus a simple "publish now" trigger I can hit myself.
- Do not have the browser fetch my sheet directly, and do not turn the sheet into a live production database. Build-time sync keeps the site fast and keeps my content off the client where the paywall can protect it.

Guide me through the service-account setup and where the sheet ID and credentials go (as environment variables / Netlify env, never committed).

Two features I want in the sync from day one:

- A `publish` column: only rows I've flagged as ready appear on the site, so I can push finished players out while the rest of the class is still in progress.
- Partial-profile rendering: a player with only some sections filled in should still render, showing the sections that exist and cleanly omitting the ones that are empty. A profile is never all-or-nothing.

## 3. Data model

My sheet columns encode my evaluation framework: identity (name, position, school, height, weight, class year), position rank, round projection, a numeric grade and the tier it maps to, a projected archetype, trait tags for "where he wins / projected role / where he can improve", strengths and weaknesses as bullet lists, a bottom line, season stats, and percentile data for advanced metrics and pre-draft testing. `2026-guide-extracted.json` shows how these render. Map my columns to that shape faithfully, and ask me about any column whose meaning isn't obvious rather than assuming. `school` must be treated as a controlled value (consistent spelling and casing) because it is the key for team colours and for filtering; flag any rows where it looks inconsistent.

## 4. The site

Rebuild what the prototype does:

- A big board of every published player. Two grouping modes: by position (default, ranked within each position group) and by round tier. Position filter chips and a name/school search.
- Tiers should come from my grade column in the sheet, since that is where my real tiering lives; the round-projection grouping in the prototype was a stand-in.
- Tapping a player opens a slide-over profile panel: scouting summary (the trait tags), strengths and weaknesses side by side, advanced-data and pre-draft-testing percentile bars, season stats, background, and the bottom line.
- Percentile bars: filled proportionally, coloured green at or above the 75th percentile, red at or below the 25th, neutral between, and shown as a dash when a drill wasn't tested. Never render an untested drill as zero.

## 5. Brand and team-colour theming

- The Touchdown brand is navy `#041E42` and gold `#C9A24B`. Editorial and restrained, not a flashy sportsbook look.
- Theme profiles in team colours, the way the print guide does: the team colour carries the profile header only, and the body stays neutral. On the board, each row gets a thin team-colour stripe down the left edge, not a flooded background, so a long list stays scannable.
- Keep the strengths block a fixed green and the weaknesses block a fixed red regardless of team, as the print guide does.
- Handle contrast automatically: many college palettes are light (black-and-gold schools, etc.). For a light team colour, fall back to the school's darker colour for the header fill, and choose black or white text based on the fill's brightness. The prototype has a working version of this rule; carry the logic over.
- Keep team colours in a single data file keyed by school (primary and secondary hex), so each season I only add new schools. The prototype embeds a starter map for last year's schools; move it into a proper file and treat my values as approximate placeholders I'll refine.
- For any UI copy you write, use regular hyphens, never en or em dashes.

## 6. The paywall (the hard part, do not build it blind)

The content must never ship in the public JavaScript bundle. A logged-out or non-paying visitor must not be able to read profiles by inspecting network traffic or view-source. That means the profile content is served from the server only to an authenticated, entitled user, not shipped statically and hidden with CSS or client-side checks.

The pieces that need to join up:

1. A store that sells the guide and records who paid.
2. A way for a buyer to log in.
3. A check on every content request that the logged-in user is a buyer.

Before you implement any of this, lay out the realistic options for a solo operator (for example a store like Gumroad or Lemon Squeezy or Stripe issuing a licence on purchase, paired with email magic-link login), with the trade-offs, and let me choose. The store and auth choice affects the stack, so we settle it early. Until I've chosen, build the content pipeline and the full UI behind a simple placeholder gate so I have a working site to look at, and leave the real entitlement check as a clearly marked seam to fill in once I decide.

## 7. How I'd like us to work

- First, propose the stack and a phased plan and wait for my go-ahead. My steer, which you can push back on: a framework that can render content server-side so the paywall can actually protect it (I've used Vite/React before for a static tool, but static won't protect paid content). Netlify for hosting unless you have a strong reason otherwise.
- Then build in this order: (a) the data pipeline from `2026-guide-extracted.json` plus the board and profile UI with team theming, so I can see the whole thing working on known data; (b) swap the data source to my live Google Sheet with the publish flag and partial rendering; (c) the store, auth and entitlement, after I've chosen the approach.
- Keep secrets in environment variables, never committed. Write a short README covering how the sheet sync runs, how to trigger a publish, and how to add a new school colour.
- Flag any decision that's mine to make instead of guessing.

Start by reading the two starting files and this brief, then come back to me with your proposed stack and plan.
