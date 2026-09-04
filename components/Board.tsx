"use client";

import { useMemo, useState } from "react";
import type { BoardTeaser, Position } from "@/lib/types";
import { POSITIONS, POSITION_NAMES, ROUND_TIER_ORDER, roundTierName, roundProjectionToTierNumber } from "@/lib/constants";
import { getTeamTheme } from "@/lib/team-colors";
import { isPlayerAccessible } from "@/lib/entitlement-shared";
import ProfilePanel from "./ProfilePanel";

type GroupBy = "position" | "round";

function projClass(rp: string | undefined): string {
  if (rp === "1st") return "r1";
  if (rp === "2nd") return "r2";
  if (rp === "UDFA" || rp === "PFA") return "udfa";
  return "";
}
function projText(rp: string | undefined): string {
  if (rp === "UDFA" || rp === "PFA") return rp;
  return `Rd ${rp ?? "-"}`;
}

export default function Board({
  teasers,
  entitled,
  freeLimit,
}: {
  teasers: BoardTeaser[];
  entitled: boolean;
  freeLimit: number;
}) {
  const [curPos, setCurPos] = useState<Position | "All">("All");
  const [groupBy, setGroupBy] = useState<GroupBy>("position");
  const [curQ, setCurQ] = useState("");
  const [teamTheme, setTeamTheme] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = curQ.toLowerCase().trim();
    return teasers.filter(
      (p) =>
        (curPos === "All" || p.position === curPos) &&
        (!q || p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q))
    );
  }, [teasers, curPos, curQ]);

  const groups = useMemo(() => {
    if (groupBy === "position") {
      const order = curPos === "All" ? POSITIONS : POSITIONS.filter((p) => p === curPos);
      return order
        .map((pos): [string, string, BoardTeaser[]] => [
          pos,
          POSITION_NAMES[pos],
          rows.filter((r) => r.position === pos).sort((a, b) => posRankNum(a) - posRankNum(b)),
        ])
        .filter((g) => g[2].length);
    }
    return ROUND_TIER_ORDER.map((k): [number, string, BoardTeaser[]] => [
      k,
      roundTierName(k),
      rows
        .filter((r) => roundProjectionToTierNumber(r.roundProjection) === k)
        .sort((a, b) => posRankNum(a) - posRankNum(b) || a.name.localeCompare(b.name)),
    ]).filter((g) => g[2].length);
  }, [rows, groupBy, curPos]);

  return (
    <>
      <div className="controls">
        <div className="wrap">
          <label className="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder={`Search ${teasers.length} prospects by name or school`}
              aria-label="Search prospects"
              value={curQ}
              onChange={(e) => setCurQ(e.target.value)}
            />
          </label>
          <div className="seg">
            <span className="lbl">Group by</span>
            <button className={groupBy === "position" ? "on" : ""} onClick={() => setGroupBy("position")}>
              Position
            </button>
            <button className={groupBy === "round" ? "on" : ""} onClick={() => setGroupBy("round")}>
              Round projection
            </button>
          </div>
          <div className="seg">
            <span className="lbl">Team colours</span>
            <button className={teamTheme ? "on" : ""} onClick={() => setTeamTheme(true)}>
              On
            </button>
            <button className={!teamTheme ? "on" : ""} onClick={() => setTeamTheme(false)}>
              Off
            </button>
          </div>
          <span className="count">
            {rows.length} player{rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="wrap">
        <div className="chips" role="group" aria-label="Filter by position">
          <button className={"chip" + (curPos === "All" ? " on" : "")} onClick={() => setCurPos("All")}>
            All
          </button>
          {POSITIONS.map((p) => (
            <button key={p} className={"chip" + (curPos === p ? " on" : "")} onClick={() => setCurPos(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="wrap board">
        <div>
          {groups.length === 0 ? (
            <p style={{ color: "var(--mut)", padding: "30px 4px" }}>
              No players match. Clear the search or pick another position.
            </p>
          ) : (
            groups.map(([key, label, arr]) => (
              <div key={key}>
                <div className="grouphdr">
                  <h2>{label}</h2>
                  <span className="gcount">{arr.length}</span>
                </div>
                {arr.map((p) => (
                  <Row
                    key={p.id}
                    p={p}
                    teamTheme={teamTheme}
                    accessible={isPlayerAccessible(p.overallRank, entitled, freeLimit)}
                    onOpen={() => setOpenId(p.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <ProfilePanel playerId={openId} teamTheme={teamTheme} onClose={() => setOpenId(null)} />
    </>
  );
}

function posRankNum(p: BoardTeaser): number {
  const n = Number.parseInt(p.positionRank ?? "", 10);
  return Number.isFinite(n) ? n : 999;
}

function Row({
  p,
  teamTheme,
  accessible,
  onOpen,
}: {
  p: BoardTeaser;
  teamTheme: boolean;
  accessible: boolean;
  onOpen: () => void;
}) {
  const theme = teamTheme ? getTeamTheme(p.school) : null;
  const style = theme ? ({ "--team": theme.stripe } as React.CSSProperties) : undefined;

  return (
    <div
      className={"row" + (accessible ? "" : " locked")}
      style={style}
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="rnum">
        <span className="pos">{p.position}</span>
        <span className="n">{p.positionRank ?? "-"}</span>
      </div>
      <div>
        <div className="pname">
          {p.name}
          {accessible ? null : <span className="lock-badge">Locked</span>}
        </div>
        <div className="pmeta">
          {p.school} &middot; {p.classYear ?? ""}
        </div>
      </div>
      <div className="role-tag" />
      <div className="proj">
        <span className={"pill " + projClass(p.roundProjection)}>{projText(p.roundProjection)}</span>
      </div>
    </div>
  );
}
