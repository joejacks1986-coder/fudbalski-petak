import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
  id: number;
  date: string;
  home_score: number;
  away_score: number;
};

type MatchTeamRow = {
  match_id: number;
  team: "A" | "B";
};

type MatchEvent = {
  match_id: number;
  type: "goal" | "assist" | "mvp";
  value: number | null;
};

function formatDateSr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  // MEČEVI + TIM
  // =====================
  const { data: teamRows } = await supabase
    .from("match_teams")
    .select("match_id, team")
    .eq("player_id", player.id)
    .returns<MatchTeamRow[]>();

  const teamByMatchId = new Map<number, "A" | "B">();
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
  // EVENTI
  // =====================
  const { data: events } = await supabase
    .from("match_events")
    .select("match_id, type, value")
    .eq("player_id", player.id)
    .returns<MatchEvent[]>();

  // =====================
  // AGREGACIJA
  // =====================
  const totalStats = { goals: 0, assists: 0, mvps: 0 };
  const perMatch: Record<number, { goals: number; assists: number; mvp: boolean }> = {};

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
              <span className="chip chip-sky">🎯 {totalStats.assists}</span>
              <span className="chip chip-gold">🏆 {totalStats.mvps}</span>
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
                  {s?.assists ? <span className="pill">🎯 {s.assists}</span> : null}
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
