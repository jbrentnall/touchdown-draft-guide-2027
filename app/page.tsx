import { getBoardTeasers } from "@/lib/players";
import { isEntitled, getFreePlayerLimit } from "@/lib/entitlement";
import Board from "@/components/Board";

export default async function BoardPage() {
  const teasers = getBoardTeasers();
  const entitled = await isEntitled();
  const freeLimit = getFreePlayerLimit();

  return (
    <>
      <div className="buildbar">
        Phase A build - dev data from last year&apos;s class, placeholder access gate.{" "}
        {entitled ? "Unlocked in this browser." : <a href="/unlock" style={{ color: "#5b4a1e" }}>Enter access code</a>}
      </div>
      <header className="top">
        <div className="wrap">
          <span className="brand">
            THE <span className="td">TOUCHDOWN</span>
          </span>
          <span className="tagbadge">Draft Guide</span>
          <span className="yr">2026 class &middot; {teasers.length} prospects</span>
        </div>
      </header>

      <div className="wrap board-head">
        <div className="kicker">Scouting-led. Film-first.</div>
        <h1>The Big Board</h1>
        <p className="sub">
          Every prospect in the guide, grouped by position and ranked within it. Search by
          name or school, switch to round projection, and tap any player for the full
          scouting profile.
        </p>
      </div>

      <Board teasers={teasers} entitled={entitled} freeLimit={freeLimit} />
    </>
  );
}
