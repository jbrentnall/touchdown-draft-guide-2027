"use client";

import { useEffect, useState } from "react";
import type { Player, PercentileMap, StatTable } from "@/lib/types";
import { getTeamTheme } from "@/lib/team-colors";

type ProfileResponse = { locked: true } | { locked: false; player: Player };

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

export default function ProfilePanel({
  playerId,
  teamTheme,
  onClose,
}: {
  playerId: string | null;
  teamTheme: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/api/profile/${playerId}`)
      .then((res) => res.json())
      .then((body: ProfileResponse) => {
        if (!cancelled) setData(body);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = playerId !== null;
  const player = data && !data.locked ? data.player : null;
  const theme = teamTheme && player ? getTeamTheme(player.school) : null;
  const headStyle = theme
    ? ({ "--phead": theme.fill, "--ptext": theme.text } as React.CSSProperties)
    : undefined;

  return (
    <>
      <div className={"scrim" + (open ? " open" : "")} onClick={onClose} />
      <aside className={"panel" + (open ? " open" : "")} aria-label="Prospect profile">
        {loading ? (
          <div style={{ padding: 26 }}>Loading...</div>
        ) : data && data.locked ? (
          <LockedProfile onClose={onClose} />
        ) : player ? (
          <>
            <div className="p-head" style={headStyle}>
              <button className="p-close" aria-label="Close" onClick={onClose}>
                &times;
              </button>
              <div className="p-rankline">
                <span className="p-rankbadge">
                  {player.position}
                  {player.positionRank ?? ""}
                </span>
                <span className={"pill " + projClass(player.roundProjection)}>
                  {projText(player.roundProjection)}
                </span>
              </div>
              <div className="p-name">{player.name}</div>
              <div className="p-sub">
                {player.position}, {player.school} &middot; {player.classYear ?? ""}
              </div>
              <div className="p-stats-strip">
                <div className="ps">
                  Position rank<b className="gold">{player.positionRank ?? "-"}</b>
                </div>
                <div className="ps">
                  Round proj.<b>{projText(player.roundProjection)}</b>
                </div>
                <div className="ps">
                  Height<b>{player.height ?? "-"}</b>
                </div>
                <div className="ps">
                  Weight<b>{player.weight ? `${player.weight} lb` : "-"}</b>
                </div>
              </div>
            </div>
            <div className="p-body">
              {player.winsWith || player.archetype || player.improve ? (
                <section>
                  <div className="h-lbl">Scouting summary</div>
                  <Trait tag={player.winsWith} />
                  <Trait tag={player.archetype} />
                  <Trait tag={player.improve} />
                </section>
              ) : null}

              {player.strengths.length || player.weaknesses.length ? (
                <section className="sw">
                  {player.strengths.length ? (
                    <div>
                      <div className="lab pos">Strengths</div>
                      <ul>
                        {player.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {player.weaknesses.length ? (
                    <div>
                      <div className="lab neg">Areas to improve</div>
                      <ul>
                        {player.weaknesses.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <PercentileChart
                title="Advanced data percentile"
                data={player.dataPercentiles}
                note="Percentile vs comparable seasons since 2014."
              />

              {player.stats && Object.keys(player.stats).length ? (
                <section>
                  <div className="h-lbl">Season stats</div>
                  <StatsTable statYears={player.statYears} stats={player.stats} />
                </section>
              ) : null}

              <PercentileChart
                title="Pre-draft testing percentile"
                data={player.testingPercentiles}
                note="Percentile vs all prospects since 2014. Dashes are drills not tested."
              />

              {player.background ? (
                <section>
                  <div className="h-lbl">Background</div>
                  <p style={{ fontSize: 14, color: "#333", margin: 0 }}>{player.background}</p>
                </section>
              ) : null}

              {player.bottomLine ? (
                <div className="bl">
                  <div className="h-lbl">Bottom line</div>
                  {player.bottomLine}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}

function Trait({ tag }: { tag?: { title: string; body: string } }) {
  if (!tag || !tag.title) return null;
  return (
    <div className="trait">
      <div className="tt">{tag.title}</div>
      <div className="tb">{tag.body}</div>
    </div>
  );
}

function PercentileChart({ title, data, note }: { title: string; data?: PercentileMap; note: string }) {
  const entries = Object.entries(data ?? {});
  if (!entries.length) return null;
  return (
    <section>
      <div className="h-lbl">{title}</div>
      <div className="pctblock">
        {entries.map(([label, value]) => (
          <div className="pctrow" key={label}>
            <div className="pctname">{label}</div>
            <div className="pcttrack">
              {value !== null ? (
                <div
                  className={"pctfill " + (value >= 75 ? "hi" : value <= 25 ? "lo" : "")}
                  style={{ width: `${value}%` }}
                />
              ) : null}
            </div>
            <div className={"pctval" + (value === null ? " na" : "")}>{value === null ? "-" : value}</div>
          </div>
        ))}
        <div className="pctnote">{note}</div>
      </div>
    </section>
  );
}

function StatsTable({ statYears, stats }: { statYears?: string[]; stats: StatTable }) {
  const years = statYears ?? [];
  return (
    <table className="stats">
      <thead>
        <tr>
          <th></th>
          {years.map((y) => (
            <th key={y}>{y}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(stats).map(([label, values]) => (
          <tr key={label}>
            <td>{label}</td>
            {values.map((v, i) => (
              <td key={i}>{v}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LockedProfile({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ padding: 26 }}>
      <button className="p-close" style={{ position: "static", marginBottom: 16, background: "#eee", color: "#333" }} aria-label="Close" onClick={onClose}>
        &times;
      </button>
      <div className="locked-block">
        <div className="h-lbl">Full profile locked</div>
        <p>
          This player&apos;s scouting profile is part of the paid guide. For now (Phase A/B),
          entering the development access code unlocks it in this browser.
        </p>
        <a className="cta" href="/unlock">
          Enter access code
        </a>
      </div>
    </div>
  );
}
