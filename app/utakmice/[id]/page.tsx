import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = { id: string; name: string; slug: string };

type TeamRow = {
  team: "A" | "B";
  player_id: string;
  players: Player | null;
};

type EventRow = {
  type: "goal" | "assist" | "mvp";
  player_id: string;
  value: number | null;
  players: Player | null;
};

type MatchRow = {
  id: string;
  date: string;
  home_score: number;
  away_score: number;
};

type ColumnRow = {
  title: string;
  content: string;
  author: string;
};

const TEAM_A = "EKIPA MARKERI";
const TEAM_B = "EKIPA ŠARENI";

function formatDateSr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function sumByPlayer(events: EventRow[]) {
  const map = new Map<string, { name: string; slug: string; total: number }>();

  for (const e of events) {
    if (!e.players) continue;

    const key = e.player_id;
    const value = Number(e.value ?? 1);

    const cur = map.get(key) || {
      name: e.players.name,
      slug: e.players.slug,
      total: 0,
    };

    cur.total += value;
    cur.slug = e.players.slug || cur.slug;
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .map(([playerId, v]) => ({ playerId, name: v.name, slug: v.slug, total: v.total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "sr"));
}

export default async function UtakmicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1) match
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, date, home_score, away_score")
    .eq("id", id)
    .single<MatchRow>();

  if (matchError || !match) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Utakmica nije pronađena</h1>
        <Link href="/utakmice">← Nazad na mečeve</Link>
      </div>
    );
  }

  // 2) teams + events + column
  const [
    { data: teams, error: teamsError },
    { data: events, error: eventsError },
    { data: column, error: columnError },
  ] = await Promise.all([
    supabase
      .from("match_teams")
      .select("team, player_id, players ( id, name, slug )")
      .eq("match_id", id)
      .returns<TeamRow[]>(),
    supabase
      .from("match_events")
      .select("type, player_id, value, players ( id, name, slug )")
      .eq("match_id", id)
      .returns<EventRow[]>(),
    supabase
      .from("match_columns")
      .select("title, content, author")
      .eq("match_id", id)
      .maybeSingle<ColumnRow>(),
  ]);

  // safe
  const safeTeams = teamsError ? [] : teams || [];
  const safeEvents = eventsError ? [] : events || [];
  const safeColumn = columnError ? null : column || null;

  // Map: player_id -> team ("A" | "B")
  const playerTeam = new Map<string, "A" | "B">();
  for (const t of safeTeams) {
    if (!t.player_id) continue;
    playerTeam.set(t.player_id, t.team);
  }

  const teamA = safeTeams
    .filter((t) => t.team === "A")
    .map((t) => t.players?.name)
    .filter(Boolean) as string[];

  const teamB = safeTeams
    .filter((t) => t.team === "B")
    .map((t) => t.players?.name)
    .filter(Boolean) as string[];

  // SUM (ukupno) -> pa podela po ekipama
  const allGoals = sumByPlayer(safeEvents.filter((e) => e.type === "goal"));
  const allAssists = sumByPlayer(safeEvents.filter((e) => e.type === "assist"));

  const goalsA = allGoals.filter((g) => playerTeam.get(g.playerId) === "A");
  const goalsB = allGoals.filter((g) => playerTeam.get(g.playerId) === "B");

  const assistsA = allAssists.filter((a) => playerTeam.get(a.playerId) === "A");
  const assistsB = allAssists.filter((a) => playerTeam.get(a.playerId) === "B");

  const mvpPlayer = safeEvents.find((e) => e.type === "mvp")?.players ?? null;

  const isDraw = match.home_score === match.away_score;
  const winner = isDraw ? "D" : match.home_score > match.away_score ? "A" : "B";

  return (
    <div className="match-page" style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* TOP BAR */}
      <div className="topbar">
        <Link href="/utakmice" className="back-pill">
          ← Nazad na mečeve
        </Link>

        <div className="meta">
          <span className="meta-chip">Utakmica</span>
          <span className="meta-date">{formatDateSr(match.date)}</span>
        </div>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-title">Rezultat</div>

          <div className="scoreline">
            <div className="team team-a">
              <span className="team-dot a" />
              {TEAM_A}
            </div>

            <div className="scorebox">
              <span className="score">{match.home_score}</span>
              <span className="colon">:</span>
              <span className="score">{match.away_score}</span>
            </div>

            <div className="team team-b">
              <span className="team-dot b" />
              {TEAM_B}
            </div>
          </div>

          <div className="hero-badges">
            <span className={`badge ${winner === "A" ? "W" : winner === "B" ? "L" : "D"}`}>
              {isDraw ? "NEREŠENO" : winner === "A" ? "POBEDA MARKERA" : "POBEDA ŠARENIH"}
            </span>

            <span className="badge soft">⚽ {TEAM_A} vs {TEAM_B}</span>
          </div>
        </div>

        <div className="hero-right">
          <div className="mini-title">MVP</div>

          <div className="mvp">
            {mvpPlayer?.slug ? (
              <Link href={`/igraci/${mvpPlayer.slug}`} className="plink">
                {mvpPlayer.name}
              </Link>
            ) : (
              <span>{mvpPlayer?.name ?? "—"}</span>
            )}
          </div>

          <div className="mini-note">(Strelci/asistencije su zbir događaja za ovaj meč.)</div>
        </div>
      </section>

      {/* GRID */}
      <div
        className="two-col"
        style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16, alignItems: "start" }}
      >
        {/* LEVO */}
        <div className="left-col">
          {/* Sastavi */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Sastavi ekipa</h2>
              <div className="panel-sub">Ko je bio na terenu.</div>
            </div>

            <div className="teams-grid">
              <div className="team-card">
                <div className="team-card-title">
                  <span className="team-dot a" />
                  {TEAM_A}
                </div>

                {teamA.length ? (
                  <ul className="plist">
                    {teamA.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty">Nema podataka.</div>
                )}
              </div>

              <div className="team-card">
                <div className="team-card-title">
                  <span className="team-dot b" />
                  {TEAM_B}
                </div>

                {teamB.length ? (
                  <ul className="plist">
                    {teamB.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty">Nema podataka.</div>
                )}
              </div>
            </div>
          </section>

          {/* Strelci (po ekipama) */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Strelci</h2>
              <div className="panel-sub">Po ekipama.</div>
            </div>

            {(goalsA.length === 0 && goalsB.length === 0) ? (
              <div className="empty">Nema upisanih strelaca.</div>
            ) : (
              <div className="split">
                <div className="split-card">
                  <div className="split-title">
                    <span className="team-dot a" /> {TEAM_A}
                  </div>

                  {goalsA.length === 0 ? (
                    <div className="empty">—</div>
                  ) : (
                    <div className="table">
                      {goalsA.map((g, idx) => (
                        <div key={g.playerId} className={`row ${idx === goalsA.length - 1 ? "last" : ""}`}>
                          <div className="name">
                            {g.slug ? (
                              <Link href={`/igraci/${g.slug}`} className="plink">
                                {g.name}
                              </Link>
                            ) : (
                              g.name
                            )}
                          </div>
                          <div className="val">⚽ {g.total}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="split-card">
                  <div className="split-title">
                    <span className="team-dot b" /> {TEAM_B}
                  </div>

                  {goalsB.length === 0 ? (
                    <div className="empty">—</div>
                  ) : (
                    <div className="table">
                      {goalsB.map((g, idx) => (
                        <div key={g.playerId} className={`row ${idx === goalsB.length - 1 ? "last" : ""}`}>
                          <div className="name">
                            {g.slug ? (
                              <Link href={`/igraci/${g.slug}`} className="plink">
                                {g.name}
                              </Link>
                            ) : (
                              g.name
                            )}
                          </div>
                          <div className="val">⚽ {g.total}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Asistenti (po ekipama) */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Asistenti</h2>
              <div className="panel-sub">Po ekipama.</div>
            </div>

            {(assistsA.length === 0 && assistsB.length === 0) ? (
              <div className="empty">Nema upisanih asistenata.</div>
            ) : (
              <div className="split">
                <div className="split-card">
                  <div className="split-title">
                    <span className="team-dot a" /> {TEAM_A}
                  </div>

                  {assistsA.length === 0 ? (
                    <div className="empty">—</div>
                  ) : (
                    <div className="table">
                      {assistsA.map((a, idx) => (
                        <div key={a.playerId} className={`row ${idx === assistsA.length - 1 ? "last" : ""}`}>
                          <div className="name">
                            {a.slug ? (
                              <Link href={`/igraci/${a.slug}`} className="plink">
                                {a.name}
                              </Link>
                            ) : (
                              a.name
                            )}
                          </div>
                          <div className="val">🅰️ {a.total}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="split-card">
                  <div className="split-title">
                    <span className="team-dot b" /> {TEAM_B}
                  </div>

                  {assistsB.length === 0 ? (
                    <div className="empty">—</div>
                  ) : (
                    <div className="table">
                      {assistsB.map((a, idx) => (
                        <div key={a.playerId} className={`row ${idx === assistsB.length - 1 ? "last" : ""}`}>
                          <div className="name">
                            {a.slug ? (
                              <Link href={`/igraci/${a.slug}`} className="plink">
                                {a.name}
                              </Link>
                            ) : (
                              a.name
                            )}
                          </div>
                          <div className="val">🅰️ {a.total}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* DESNO: Miljanov ugao */}
        <aside className="panel panel-column">
          <div className="panel-head">
            <h2 className="panel-title">Miljanov ugao</h2>
            <div className="panel-sub">Ako postoji — ovde je. Ako ne postoji — nema laži.</div>
          </div>

          {!safeColumn ? (
            <div className="empty">Nema izveštaja za ovu utakmicu.</div>
          ) : (
            <div className="column">
              <div className="column-title">{safeColumn.title}</div>
              <div className="column-author">
                Autor: <strong>{safeColumn.author}</strong>
              </div>

              <div className="column-content">{safeColumn.content}</div>
            </div>
          )}
        </aside>
      </div>

      <style>{`
        .match-page{ animation: pageFade 360ms ease-out both; }
        @keyframes pageFade{
          from{ opacity:0; transform: translateY(6px); }
          to{ opacity:1; transform: translateY(0); }
        }

        .topbar{
          display:flex; justify-content: space-between; align-items:center;
          gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
        }
        .back-pill{
          text-decoration:none; color:inherit; font-weight: 1000; font-size: 13px;
          padding: 9px 11px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.90); box-shadow: 0 14px 28px rgba(0,0,0,0.06);
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
        }
        .back-pill:hover{ transform: translateY(-1px); border-color: rgba(240,180,41,0.55); box-shadow: 0 18px 34px rgba(0,0,0,0.09); }

        .meta{ display:flex; gap: 10px; align-items:center; flex-wrap: wrap; }
        .meta-chip{
          font-weight: 1000; font-size: 12px; padding: 7px 10px; border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12); background: white; opacity: 0.95;
        }
        .meta-date{ font-weight: 950; opacity: 0.8; }

        .hero{
          display:grid; grid-template-columns: 1fr 320px; gap: 14px;
          border-radius: 26px; border: 1px solid rgba(0,0,0,0.08); padding: 16px;
          background:
            radial-gradient(900px 260px at 10% 0%, rgba(240,180,41,0.22), transparent 60%),
            radial-gradient(700px 240px at 90% 0%, rgba(90,160,255,0.14), transparent 58%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.97));
          box-shadow: 0 22px 60px rgba(0,0,0,0.08);
          overflow:hidden; position: relative;
        }
        .hero::before{
          content:""; position:absolute; inset:-80px;
          background:
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.40), transparent 40%),
            radial-gradient(circle at 85% 15%, rgba(255,255,255,0.30), transparent 45%),
            radial-gradient(circle at 60% 70%, rgba(240,180,41,0.10), transparent 55%);
          filter: blur(6px); opacity: 0.75; pointer-events:none;
        }
        .hero-left, .hero-right{ position: relative; z-index: 1; }
        .hero-title{ font-weight: 1000; letter-spacing: 0.2px; opacity: 0.85; margin-bottom: 10px; }

        .scoreline{ display:flex; gap: 14px; align-items:center; flex-wrap: wrap; }
        .team{ font-weight: 950; display:flex; gap: 8px; align-items:center; opacity: 0.95; }
        .team-dot{ width: 10px; height: 10px; border-radius: 999px; display:inline-block; }
        .team-dot.a{ background: rgba(240,180,41,0.95); }
        .team-dot.b{ background: rgba(90,160,255,0.92); }

        .scorebox{
          display:flex; gap: 10px; align-items: baseline;
          padding: 10px 14px; border-radius: 18px; border: 1px solid rgba(0,0,0,0.10);
          background: rgba(255,255,255,0.80); backdrop-filter: blur(10px);
          box-shadow: 0 14px 34px rgba(0,0,0,0.07);
        }
        .score{ font-size: 26px; font-weight: 1100; letter-spacing: 0.4px; }
        .colon{ font-size: 18px; font-weight: 1000; opacity: 0.7; }

        .hero-badges{ margin-top: 12px; display:flex; gap: 10px; flex-wrap: wrap; }
        .badge{
          font-size: 12px; padding: 6px 10px; border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.78);
          backdrop-filter: blur(10px); font-weight: 1000; letter-spacing: 0.2px;
        }
        .badge.W{ border-color: rgba(31,157,85,0.30); background: rgba(230,246,236,0.92); color: #137a3a; }
        .badge.D{ border-color: rgba(120,120,120,0.22); background: rgba(245,245,245,0.92); color: #555; }
        .badge.L{ border-color: rgba(198,40,40,0.24); background: rgba(253,234,234,0.92); color: #a32020; }
        .badge.soft{ opacity: 0.85; }

        .mini-title{ font-weight: 1000; opacity: 0.85; }
        .mvp{
          margin-top: 10px; font-size: 18px; font-weight: 1100; letter-spacing: 0.2px;
          padding: 12px 12px; border-radius: 18px; border: 1px solid rgba(0,0,0,0.10);
          background: rgba(255,255,255,0.86); box-shadow: 0 14px 34px rgba(0,0,0,0.06);
        }
        .mini-note{ margin-top: 10px; font-size: 12px; opacity: 0.72; line-height: 1.5; }

        .left-col{ display:grid; gap: 12px; }
        .panel{
          border: 1px solid rgba(0,0,0,0.08); border-radius: 20px; padding: 14px;
          background: white; box-shadow: 0 12px 30px rgba(0,0,0,0.05); overflow: hidden;
        }
        .panel-head{
          display:flex; justify-content: space-between; gap: 10px; align-items: baseline;
          flex-wrap: wrap; margin-bottom: 10px;
        }
        .panel-title{ margin: 0; font-weight: 1100; letter-spacing: 0.2px; font-size: 18px; }
        .panel-sub{ font-size: 12px; opacity: 0.7; font-weight: 800; }

        .teams-grid{ display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .team-card{
          border-radius: 18px; border: 1px solid rgba(0,0,0,0.08); padding: 12px;
          background:
            radial-gradient(700px 220px at 10% 0%, rgba(240,180,41,0.12), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }
        .team-card-title{ display:flex; gap: 8px; align-items:center; font-weight: 1000; margin-bottom: 10px; }
        .plist{ margin: 0; padding-left: 18px; line-height: 1.65; }

        .table{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 16px;
          overflow: hidden;
          background: white;
        }
        .row{ display:flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .row.last{ border-bottom: none; }
        .name{ font-weight: 850; opacity: 0.92; }
        .val{ font-weight: 1100; letter-spacing: 0.2px; }

        .empty{ opacity: 0.72; padding: 6px 2px; line-height: 1.5; }

        .panel-column{
          background:
            radial-gradient(900px 260px at 10% 0%, rgba(240,180,41,0.14), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }
        .column{ display:grid; gap: 10px; }
        .column-title{ font-weight: 1100; font-size: 16px; letter-spacing: 0.2px; }
        .column-author{ font-size: 12px; opacity: 0.75; }
        .column-content{ white-space: pre-wrap; line-height: 1.65; opacity: 0.92; padding-top: 6px; }

        .plink{
          color: inherit; text-decoration: none; font-weight: 950;
          border-bottom: 1px dashed rgba(0,0,0,0.22);
          padding-bottom: 1px;
          transition: border-color 140ms ease, opacity 140ms ease;
        }
        .plink:hover{ border-color: rgba(240,180,41,0.75); opacity: 0.95; }

        /* NOVO: split two tables inside one panel */
        .split{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .split-card{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 12px;
          background:
            radial-gradient(700px 220px at 10% 0%, rgba(240,180,41,0.10), transparent 62%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }
        .split-title{
          display:flex;
          align-items:center;
          gap: 8px;
          font-weight: 1100;
          margin-bottom: 10px;
          opacity: 0.95;
        }

        @media (max-width: 980px) {
          .two-col { grid-template-columns: 1fr !important; }
          .hero { grid-template-columns: 1fr; }
          .teams-grid { grid-template-columns: 1fr; }
          .split { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
