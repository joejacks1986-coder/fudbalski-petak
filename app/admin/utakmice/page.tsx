"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  name: string;
};

type MatchTeam = {
  team: "A" | "B";
  players: Player | null;
};

type MatchEvent = {
  type: "mvp";
  players: Player | null;
};

type Match = {
  id: string;
  date: string;
  home_score: number;
  away_score: number;
  match_teams: MatchTeam[];
  match_events: MatchEvent[];
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

export default function AdminUtakmice() {
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMatches = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        id,
        date,
        home_score,
        away_score,
        match_teams (
          team,
          players ( id, name )
        ),
        match_events (
          type,
          players ( id, name )
        )
      `
      )
      .order("date", { ascending: false })
      .returns<Match[]>();

    if (!error && data) {
      setMatches(data);
    } else {
      console.error(error);
      alert("Greška pri učitavanju utakmica");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const handleDelete = async (matchId: string) => {
    const ok = confirm(
      "Da li si siguran da želiš da obrišeš ovaj meč?\n\nBiće obrisani i sastavi, događaji (golovi/asistencije/MVP) i Miljanov ugao."
    );
    if (!ok) return;

    setDeletingId(matchId);

    try {
      const { error: colErr } = await supabase
        .from("match_columns")
        .delete()
        .eq("match_id", matchId);
      if (colErr) throw colErr;

      const { error: evErr } = await supabase
        .from("match_events")
        .delete()
        .eq("match_id", matchId);
      if (evErr) throw evErr;

      const { error: teamErr } = await supabase
        .from("match_teams")
        .delete()
        .eq("match_id", matchId);
      if (teamErr) throw teamErr;

      const { error: matchErr } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);
      if (matchErr) throw matchErr;

      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      await loadMatches();
    } catch (err) {
      console.error(err);
      alert("Greška pri brisanju meča. Proveri konzolu.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Učitavanje utakmica...</p>;
  }

  return (
    <div className="admin-matches" style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      {/* HEADER PANEL */}
      <section className="head">
        <div className="head-left">
          <div className="head-title">Admin • Utakmice</div>
          <div className="head-sub">
            Brz pregled, izmena i brisanje mečeva (sa svim povezanim podacima).
          </div>
        </div>

        <div className="head-right">
          <span className="chip">
            Ukupno: <strong>{matches.length}</strong>
          </span>

          <button type="button" className="btn primary" onClick={() => router.push("/admin/utakmice/new")}>
            ＋ Kreiraj meč
          </button>

          <button type="button" className="btn" onClick={() => router.push("/admin/galerija/new")}>
            ＋ Dodaj u galeriju
          </button>
        </div>
      </section>

      {matches.length === 0 ? (
        <div className="empty">Nema unetih utakmica.</div>
      ) : (
        <div className="list">
          {matches.map((match) => {
            const teamA = match.match_teams
              .filter((t) => t.team === "A")
              .map((t) => t.players?.name)
              .filter(Boolean);

            const teamB = match.match_teams
              .filter((t) => t.team === "B")
              .map((t) => t.players?.name)
              .filter(Boolean);

            const mvp = match.match_events.find((e) => e.type === "mvp")?.players?.name || "—";

            const dateLabel = formatDateSr(match.date);
            const isDeleting = deletingId === match.id;

            return (
              <div key={match.id} className={`card ${isDeleting ? "busy" : ""}`}>
                <div className="card-top">
                  <div className="date">{dateLabel}</div>

                  <div className="scorebox" title="Rezultat">
                    <span className="score">{match.home_score}</span>
                    <span className="colon">:</span>
                    <span className="score">{match.away_score}</span>
                  </div>

                  <div className="mvp" title="MVP">
                    🏆 <strong>{mvp}</strong>
                  </div>
                </div>

                <div className="teams">
                  <div className="team">
                    <div className="team-title">
                      <span className="dot a" />
                      {TEAM_A}
                    </div>
                    <div className="team-body">{teamA.length ? teamA.join(", ") : "—"}</div>
                  </div>

                  <div className="team">
                    <div className="team-title">
                      <span className="dot b" />
                      {TEAM_B}
                    </div>
                    <div className="team-body">{teamB.length ? teamB.join(", ") : "—"}</div>
                  </div>
                </div>

                <div className="actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => router.push(`/admin/utakmice/${match.id}`)}
                    disabled={isDeleting}
                    title="Izmeni meč"
                  >
                    ✎ Izmeni
                  </button>

                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => handleDelete(match.id)}
                    disabled={isDeleting}
                    title="Obriši meč"
                  >
                    {isDeleting ? "Brisanje..." : "Obriši"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FOOT ACTIONS */}
      <div className="foot">
        <button type="button" className="btn ghost" onClick={loadMatches}>
          Osveži listu ↻
        </button>
      </div>

      <style>{`
        .admin-matches{
          animation: pageFade 360ms ease-out both;
        }
        @keyframes pageFade{
          from{ opacity:0; transform: translateY(6px); }
          to{ opacity:1; transform: translateY(0); }
        }

        .head{
          border-radius: 22px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(900px 260px at 10% 0%, rgba(240,180,41,0.18), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 18px 48px rgba(0,0,0,0.08);
          padding: 16px;
          display:flex;
          justify-content: space-between;
          gap: 14px;
          align-items:flex-end;
          flex-wrap: wrap;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .head::before{
          content:"";
          position:absolute;
          top:0; left:0;
          height:4px; width:100%;
          background: linear-gradient(90deg, rgba(240,180,41,0.95), rgba(240,180,41,0.10));
          opacity: 0.9;
        }
        .head-left{ max-width: 680px; position: relative; z-index: 1; }
        .head-title{
          font-weight: 1100;
          letter-spacing: 0.2px;
          font-size: 18px;
        }
        .head-sub{
          margin-top: 6px;
          opacity: 0.75;
          line-height: 1.5;
          font-size: 13px;
          font-weight: 750;
        }

        .head-right{
          display:flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items:center;
          position: relative;
          z-index: 1;
        }

        .chip{
          font-size: 12px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.90);
          font-weight: 900;
          opacity: 0.95;
          box-shadow: 0 12px 26px rgba(0,0,0,0.06);
        }

        .btn{
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.14);
          background: rgba(255,255,255,0.92);
          font-weight: 1000;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(0,0,0,0.06);
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, opacity 140ms ease, filter 140ms ease;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }
        .btn:hover{
          transform: translateY(-1px);
          border-color: rgba(240,180,41,0.55);
          box-shadow: 0 18px 36px rgba(0,0,0,0.10);
          filter: saturate(1.02);
        }
        .btn:disabled{
          opacity: 0.55;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn.primary{
          border-color: rgba(240,180,41,0.55);
          background: rgba(240,180,41,0.14);
        }

        .btn.ghost{
          opacity: 0.9;
        }

        .btn.danger{
          border-color: rgba(198,40,40,0.35);
          color: #a32020;
          background: rgba(253,234,234,0.85);
        }
        .btn.danger:hover{
          border-color: rgba(198,40,40,0.55);
          box-shadow: 0 18px 36px rgba(163,32,32,0.12);
        }

        .empty{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 14px;
          background: white;
          box-shadow: 0 10px 26px rgba(0,0,0,0.05);
          opacity: 0.85;
        }

        .list{
          display:grid;
          gap: 14px;
        }

        .card{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          background: white;
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
          overflow:hidden;
          position: relative;
          padding: 14px;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
        }
        .card::before{
          content:"";
          position:absolute;
          top:0; left:0;
          height:4px; width:100%;
          background: linear-gradient(90deg, rgba(240,180,41,0.95), rgba(240,180,41,0.10));
          opacity: 0.9;
        }
        .card:hover{
          transform: translateY(-1px);
          box-shadow: 0 18px 40px rgba(0,0,0,0.09);
          border-color: rgba(240,180,41,0.35);
        }
        .card.busy{
          opacity: 0.75;
        }

        .card-top{
          display:flex;
          gap: 12px;
          align-items:center;
          justify-content: space-between;
          flex-wrap: wrap;
          padding-top: 4px;
        }

        .date{
          font-weight: 1100;
          letter-spacing: 0.2px;
        }

        .scorebox{
          display:flex;
          align-items: baseline;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(255,255,255,0.92);
          box-shadow: 0 14px 28px rgba(0,0,0,0.06);
        }
        .score{
          font-size: 20px;
          font-weight: 1150;
        }
        .colon{
          font-weight: 1100;
          opacity: 0.7;
        }

        .mvp{
          font-size: 13px;
          font-weight: 900;
          opacity: 0.85;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(255,255,255,0.86);
          box-shadow: 0 12px 26px rgba(0,0,0,0.05);
        }

        .teams{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }

        .team{
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.08);
          padding: 12px;
          background:
            radial-gradient(700px 220px at 10% 0%, rgba(240,180,41,0.10), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }

        .team-title{
          display:flex;
          gap: 8px;
          align-items:center;
          font-weight: 1100;
          margin-bottom: 8px;
        }

        .dot{
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display:inline-block;
        }
        .dot.a{ background: rgba(240,180,41,0.95); }
        .dot.b{ background: rgba(90,160,255,0.92); }

        .team-body{
          opacity: 0.86;
          line-height: 1.55;
          font-size: 13px;
          font-weight: 800;
        }

        .actions{
          display:flex;
          gap: 10px;
          justify-content: flex-end;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .foot{
          margin-top: 16px;
          display:flex;
          justify-content: flex-end;
        }

        @media (max-width: 900px){
          .teams{ grid-template-columns: 1fr; }
          .actions{ justify-content: flex-start; }
        }
      `}</style>
    </div>
  );
}
