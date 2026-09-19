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
        Phase B build - live from the 2027 sheet, placeholder access gate.{" "}
        {entitled ? "Unlocked in this browser." : <a href="/unlock" style={{ color: "var(--navy)" }}>Enter access code</a>}
      </div>
      <header className="top">
        <div className="wrap">
          <span className="brand">
            THE <span className="td">TOUCHDOWN</span>
          </span>
          <span className="tagbadge">2027 NFL Draft Guide</span>
          <span className="yr">2027 class &middot; {teasers.length} prospects</span>
        </div>
      </header>

      <div className="wrap board-head">
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
