import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* =====================
   [NOVO] AWARDS ENGINE IMPORTI
   - ovo koristimo da izračunamo trofeje (prestiž) kroz periode
===================== */
import {
  computeAwards,
  listPeriodsForYear,
  listYears,
  matchIdsForPeriod,
  type MatchRow as AwardsMatchRow,
  type EventRow as AwardsEventRow,
  type TeamRow as AwardsTeamRow,
} from "@/lib/awards";

// =====================
// TIPOVI
// =====================
type PageProps = {
  params: Promise<{
    id: string; // slug iz URL-a
  }>;
};

type Player = {
  id: string;
  name: string;
  slug: string;
  nickname: string | null;
  description: string | null;
  image_url: string | null;
};

type Match = {
  id: string;
  date: string;
  home_score: number;
  away_score: number;
};

type MatchTeamRow = {
  match_id: string;
  team: "A" | "B";
};

type MatchEvent = {
  match_id: string;
  type: "goal" | "assist" | "mvp";
  value: number | null;
};

type RivalryRow = {
  opponent_name: string | null;
  opponent_slug: string | null;
  duels: number;
  a_wins: number;
  a_losses: number;
  draws: number;
  a_goal_diff: number;
  a_net: number;
};

function formatDateSr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtGD(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

// =====================
// STRANICA IGRAČA
// =====================
export default async function IgracPage({ params }: PageProps) {
  const { id: raw } = await params;
  const slug = decodeURIComponent(raw).trim();

  // =====================
  // IGRAČ
  // =====================
  const { data: player } = await supabase
    .from("players")
    .select("id, name, slug, nickname, description, image_url")
    .eq("slug", slug)
    .maybeSingle<Player>();

  if (!player) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Igrač nije pronađen</h1>
      </main>
    );
  }

  // =====================
  // RIVALRIES (Nemesis / Mušterije)
  // =====================
  const MIN_DUELS = 3;

  const { data: nemesisRows } = await supabase
    .from("player_rivalries_named")
    .select("opponent_name, opponent_slug, duels, a_wins, a_losses, draws, a_goal_diff, a_net")
    .eq("player_a_id", player.id)
    .gte("duels", MIN_DUELS)
    .order("a_net", { ascending: true })
    .order("a_goal_diff", { ascending: true })
    .limit(3)
    .returns<RivalryRow[]>();

  const { data: dominanceRows } = await supabase
    .from("player_rivalries_named")
    .select("opponent_name, opponent_slug, duels, a_wins, a_losses, draws, a_goal_diff, a_net")
    .eq("player_a_id", player.id)
    .gte("duels", MIN_DUELS)
    .order("a_net", { ascending: false })
    .order("a_goal_diff", { ascending: false })
    .limit(3)
    .returns<RivalryRow[]>();

  // =====================
  // MEČEVI + TIM (samo mečevi ovog igrača)
  // =====================
  const { data: teamRows } = await supabase
    .from("match_teams")
    .select("match_id, team")
    .eq("player_id", player.id)
    .returns<MatchTeamRow[]>();

  const teamByMatchId = new Map<string, "A" | "B">();
  teamRows?.forEach((r) => teamByMatchId.set(r.match_id, r.team));

  const matchIds = teamRows?.map((r) => r.match_id) ?? [];

  const matches: Match[] = matchIds.length
    ? (
        await supabase
          .from("matches")
          .select("id, date, home_score, away_score")
          .in("id", matchIds)
          .order("date", { ascending: false })
      ).data ?? []
    : [];

  // =====================
  // EVENTI (samo event-i ovog igrača)
  // =====================
  const { data: events } = await supabase
    .from("match_events")
    .select("match_id, type, value")
    .eq("player_id", player.id)
    .returns<MatchEvent[]>();

  // =====================
  // AGREGACIJA (total i per-meč, samo za prikaz profila)
  // =====================
  const totalStats = { goals: 0, assists: 0, mvps: 0 };
  const perMatch: Record<string, { goals: number; assists: number; mvp: boolean }> = {};

  events?.forEach((e) => {
    if (!perMatch[e.match_id]) {
      perMatch[e.match_id] = { goals: 0, assists: 0, mvp: false };
    }

    if (e.type === "goal") {
      const v = e.value ?? 1;
      perMatch[e.match_id].goals += v;
      totalStats.goals += v;
    }
    if (e.type === "assist") {
      const v = e.value ?? 1;
      perMatch[e.match_id].assists += v;
      totalStats.assists += v;
    }
    if (e.type === "mvp") {
      perMatch[e.match_id].mvp = true;
      totalStats.mvps += 1;
    }
  });

  // =====================
  // FORMA (poslednjih 5)
  // =====================
  const form = matches.slice(0, 5).map((m) => {
    const team = teamByMatchId.get(m.id);
    let gf = m.home_score;
    let ga = m.away_score;
    if (team === "B") {
      gf = m.away_score;
      ga = m.home_score;
    }
    return gf > ga ? "W" : gf < ga ? "L" : "D";
  });

  /* =====================
     [NOVO] PRESTIŽ / TROFEJI
     Ideja: prođemo kroz sve periode (mesec/kvartal/godina) i brojimo
     koliko puta je ovaj igrač bio među pobednicima u tim periodima.
     
     Ovo je “brute force” varijanta (radi odmah).
     Kasnije možemo optimizovati snapshot tabelom.
  ===================== */

  // 1) Učitaj SVE mečeve/evente/timove (za računanje istorije nagrada)
  const { data: allMatches } = await supabase
    .from("matches")
    .select("id, date, home_score, away_score")
    .order("date", { ascending: false })
    .returns<AwardsMatchRow[]>();

  const { data: allEvents } = await supabase
    .from("match_events")
    .select(
      `
      match_id,
      player_id,
      type,
      value,
      players ( id, name, slug, image_url, is_public )
    `
    )
    .returns<AwardsEventRow[]>();

  const { data: allTeams } = await supabase
    .from("match_teams")
    .select(
      `
      match_id,
      team,
      player_id,
      players ( id, name, slug, image_url, is_public )
    `
    )
    .returns<AwardsTeamRow[]>();

  // 2) Prebroj trofeje kroz sve periode
  const trophyCount = {
    golden_shoe: 0, // ⚽ najviše golova
    assist_king: 0, // 🅰️ najviše asistencija
    mvp: 0, // 🏅 najviše MVP
    ironman: 0, // 🛡️ najviše odigranih
  };

  const safeAllMatches = allMatches ?? [];
  const safeAllEvents = allEvents ?? [];
  const safeAllTeams = allTeams ?? [];

  const years = listYears(safeAllMatches);

  for (const y of years) {
    const { monthPeriods,  yearPeriod } = listPeriodsForYear(safeAllMatches, y);

    // redosled nije bitan za brojanje, ali je jasno:
    const periods = [...monthPeriods, yearPeriod];

    for (const p of periods) {
      const ids = matchIdsForPeriod(safeAllMatches, p);
      if (!ids.length) continue;

      const a = computeAwards({
        matches: safeAllMatches,
        events: safeAllEvents,
        teams: safeAllTeams,
        matchIds: ids,
      });

      if (a.goals.winners.some((w) => w.id === player.id)) trophyCount.golden_shoe += 1;
      if (a.assists.winners.some((w) => w.id === player.id)) trophyCount.assist_king += 1;
      if (a.mvps.winners.some((w) => w.id === player.id)) trophyCount.mvp += 1;
      if (a.ironman.winners.some((w) => w.id === player.id)) trophyCount.ironman += 1;
    }
  }

  const hasAnyTrophy =
    trophyCount.golden_shoe + trophyCount.assist_king + trophyCount.mvp + trophyCount.ironman > 0;

  // =====================
  // RENDER
  // =====================
  return (
    <main className="player-page" style={{ padding: 24, maxWidth: 1050, margin: "0 auto" }}>
      {/* HERO */}
      <section className="player-hero">
        <div className="hero-top">
          <Link href="/igraci" className="back-pill">
            ← Igrači
          </Link>
        </div>

        <div className="hero-body">
          <div className="avatar-wrap">
            <img
              src={player.image_url ?? "/player-images/placeholder.png"}
              alt={player.name}
              className="player-hero-avatar"
            />
            <div className="avatar-ring" />
          </div>

          <div className="player-hero-info">
            <h1 className="player-title">{player.name}</h1>

            <div className="chips">
              <span className="chip chip-amber">⚽ {totalStats.goals}</span>
              <span className="chip chip-sky">🅰️ {totalStats.assists}</span>
              <span className="chip chip-gold">🏆 {totalStats.mvps}</span>

              {/* =====================
                  [NOVO] PRESTIŽ / TROFEJI - prikaz u hero delu
                  (pokazujemo samo ako postoji bar jedan trofej)
                 ===================== */}
              {hasAnyTrophy ? (
                <>
                  {trophyCount.golden_shoe ? <span className="chip chip-amber">🥇⚽ × {trophyCount.golden_shoe}</span> : null}
                  {trophyCount.assist_king ? <span className="chip chip-sky">🅰️ × {trophyCount.assist_king}</span> : null}
                  {trophyCount.mvp ? <span className="chip chip-gold">🏅 × {trophyCount.mvp}</span> : null}
                  {trophyCount.ironman ? <span className="chip">🛡️ × {trophyCount.ironman}</span> : null}
                </>
              ) : null}
            </div>

            {/* FORMA */}
            {form.length > 0 && (
              <div className="form-row">
                <span className="form-label">Forma:</span>
                <div className="form-dots">
                  {form.map((f, i) => (
                    <span key={i} className={`form-dot ${f}`}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {player.nickname && <div className="player-subtitle">{player.nickname}</div>}
            {player.description && <p className="player-description">{player.description}</p>}
          </div>
        </div>
      </section>

      {/* RIVALRIES */}
      {/*}
      ... (tvoj blok ostaje isti)
      */}

      {/* MEČEVI */}
      <section style={{ marginTop: 26 }}>
        <h2 style={{ marginBottom: 10 }}>Mečevi</h2>

        <div className="matches-list">
          {matches.map((m) => {
            const s = perMatch[m.id];
            const team = teamByMatchId.get(m.id);

            let gf = m.home_score;
            let ga = m.away_score;
            if (team === "B") {
              gf = m.away_score;
              ga = m.home_score;
            }

            const outcome = gf > ga ? "W" : gf < ga ? "L" : "D";

            return (
              <Link key={m.id} href={`/utakmice/${m.id}`} className={`match-row ${outcome}`}>
                <div className="match-left">
                  <span className={`badge ${outcome}`}>{outcome}</span>
                  <span className="match-date">{formatDateSr(m.date)}</span>
                </div>

                <div className="match-score">
                  {gf}:{ga}
                </div>

                <div className="match-right">
                  {s?.goals ? <span className="pill">⚽ {s.goals}</span> : null}
                  {s?.assists ? <span className="pill">🅰️ {s.assists}</span> : null}
                  {s?.mvp ? <span className="pill pill-mvp">🏆 MVP</span> : null}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* STIL */}
      <style>{`
        .player-page { animation: fade 360ms ease-out both; }
        @keyframes fade { from{opacity:0;transform:translateY(6px);} to{opacity:1;} }

        .player-hero{
          border-radius:26px;
          border:1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(900px 320px at 10% 0%, rgba(240,180,41,0.25), transparent 60%),
            linear-gradient(180deg, #fff, #fdfdfd);
          box-shadow:0 22px 60px rgba(0,0,0,0.08);
        }

        .hero-top{ padding:14px; }
        .back-pill{
          font-weight:950;
          font-size:13px;
          padding:8px 10px;
          border-radius:999px;
          border:1px solid rgba(0,0,0,0.12);
          background:white;
          text-decoration:none;
          color:inherit;
        }

        .hero-body{
          display:flex;
          gap:26px;
          padding:18px;
          flex-wrap:wrap;
          align-items:center;
        }

        .avatar-wrap{
          width:230px;
          height:230px;
          position:relative;
          display:grid;
          place-items:center;
        }

        .player-hero-avatar{
          width:220px;
          height:220px;
          border-radius:50%;
          object-fit:cover;
          border:4px solid white;
          box-shadow:0 16px 40px rgba(0,0,0,0.16);
        }

        .avatar-ring{
          position:absolute;
          inset:0;
          border-radius:999px;
          background:conic-gradient(from 90deg,
            rgba(240,180,41,0),
            rgba(240,180,41,.9),
            rgba(90,160,255,.6),
            rgba(240,180,41,0)
          );
          filter:blur(10px);
          opacity:.55;
        }

        .player-title{ margin:0; font-weight:1000; }
        .chips{ display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; }
        .chip{
          padding:8px 12px;
          border-radius:999px;
          border:1px solid rgba(0,0,0,0.12);
          background:white;
          font-weight:900;
          font-size:12.5px;
        }
        .chip-amber{ border-color:rgba(240,180,41,.4); }
        .chip-sky{ border-color:rgba(90,160,255,.35); }
        .chip-gold{ border-color:rgba(210,170,70,.35); }

        .form-row{
          display:flex;
          align-items:center;
          gap:10px;
          margin-top:12px;
        }
        .form-label{
          font-size:13px;
          font-weight:900;
          opacity:.7;
        }
        .form-dots{
          display:flex;
          gap:6px;
        }
        .form-dot{
          width:28px;
          height:28px;
          border-radius:50%;
          display:grid;
          place-items:center;
          font-weight:1000;
          font-size:13px;
          border:1px solid rgba(0,0,0,0.12);
        }
        .form-dot.W{ background:#e6f6ec; color:#137a3a; }
        .form-dot.D{ background:#f2f2f2; color:#555; }
        .form-dot.L{ background:#fdeaea; color:#a32020; }

        .player-subtitle{ margin-top:12px; font-weight:900; opacity:.7; }
        .player-description{ margin-top:14px; max-width:700px; line-height:1.65; opacity:.88; }

        .matches-list{ display:flex; flex-direction:column; gap:10px; }

        .match-row{
          display:grid;
          grid-template-columns:160px 90px 1fr;
          gap:12px;
          padding:12px 14px;
          border-radius:18px;
          border:1px solid rgba(0,0,0,0.08);
          background:white;
          text-decoration:none;
          color:inherit;
          box-shadow:0 12px 30px rgba(0,0,0,0.06);
        }

        .badge{
          padding:6px 10px;
          border-radius:999px;
          font-weight:1000;
          font-size:12px;
          border:1px solid rgba(0,0,0,0.12);
          background:white;
        }
        .badge.W{ background:#e6f6ec; color:#137a3a; }
        .badge.D{ background:#f2f2f2; color:#555; }
        .badge.L{ background:#fdeaea; color:#a32020; }

        .match-left{ display:flex; gap:10px; align-items:center; }
        .match-date{ font-size:13px; opacity:.75; font-weight:850; }
        .match-score{ font-weight:1000; font-size:17px; }
        .match-right{ display:flex; gap:10px; flex-wrap:wrap; }
        .pill{
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(0,0,0,0.12);
          font-size:13px;
          font-weight:900;
        }
        .pill-mvp{ border-color:rgba(210,170,70,.4); }

        @media(max-width:900px){
          .match-row{ grid-template-columns:1fr; }
        }
      `}</style>
    </main>
  );
}
