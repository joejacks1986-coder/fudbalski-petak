"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MatchRow = {
  id: string;
  date: string;
  home_score: number;
  away_score: number;
  match_columns: { id: string } | { id: string }[] | null;
};

type EventRow = {
  match_id: string;
  player_id: string;
  type: "goal" | "assist" | "mvp";
  value: number | null;
  players: { id: string; name: string } | null;
};

type RankingMode = "goals" | "assists" | "mvp";

const TEAM_A = "EKIPA MARKERI";
const TEAM_B = "EKIPA ŠARENI";

const MONTHS = [
  { value: "01", label: "Januar" },
  { value: "02", label: "Februar" },
  { value: "03", label: "Mart" },
  { value: "04", label: "April" },
  { value: "05", label: "Maj" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Avgust" },
  { value: "09", label: "Septembar" },
  { value: "10", label: "Oktobar" },
  { value: "11", label: "Novembar" },
  { value: "12", label: "Decembar" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function UtakmicePage() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // filteri
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");

  // tab: rang lista
  const [rankMode, setRankMode] = useState<RankingMode>("goals");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) matches + indikator izveštaja
        const { data: mData, error: mErr } = await supabase
          .from("matches")
          .select(
            `
            id,
            date,
            home_score,
            away_score,
            match_columns ( id )
          `
          )
          .order("date", { ascending: false })
          .returns<MatchRow[]>();

        if (mErr) throw mErr;

        // 2) events za rang liste
        const { data: eData, error: eErr } = await supabase
          .from("match_events")
          .select(
            `
            match_id,
            player_id,
            type,
            value,
            players ( id, name )
          `
          )
          .returns<EventRow[]>();

        if (eErr) throw eErr;

        setMatches(mData || []);
        setEvents(eData || []);
      } catch (err) {
        console.error(err);
        setError("Greška pri učitavanju utakmica.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Opcije filtera na osnovu postojećih mečeva
  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      const y = String(new Date(m.date).getFullYear());
      set.add(y);
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [matches]);

  const monthOptions = useMemo(() => MONTHS, []);

  // Filtrirani mečevi (po godini + mesecu)
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const d = new Date(m.date);
      const y = String(d.getFullYear());
      const mo = pad2(d.getMonth() + 1);

      if (year !== "all" && y !== year) return false;
      if (month !== "all" && mo !== month) return false;

      return true;
    });
  }, [matches, year, month]);

  // Skor za filter
  const headToHead = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    let draws = 0;

    let goalsA = 0;
    let goalsB = 0;

    for (const m of filteredMatches) {
      const a = m.home_score;
      const b = m.away_score;

      goalsA += a;
      goalsB += b;

      if (a > b) winsA++;
      else if (b > a) winsB++;
      else draws++;
    }

    return {
      played: filteredMatches.length,
      winsA,
      winsB,
      draws,
      goalsA,
      goalsB,
    };
  }, [filteredMatches]);

  // Rang liste računamo samo na osnovu filtriranih mečeva
  const filteredMatchIds = useMemo(
    () => new Set(filteredMatches.map((m) => m.id)),
    [filteredMatches]
  );

  const rankings = useMemo(() => {
    const goalsMap = new Map<string, { playerId: string; name: string; value: number }>();
    const assistsMap = new Map<string, { playerId: string; name: string; value: number }>();
    const mvpMap = new Map<string, { playerId: string; name: string; value: number }>();

    for (const e of events) {
      if (!filteredMatchIds.has(e.match_id)) continue;
      if (!e.players) continue;

      const name = e.players.name;
      const value = Number(e.value ?? 1);

      if (e.type === "goal") {
        const cur = goalsMap.get(e.player_id) || { playerId: e.player_id, name, value: 0 };
        cur.value += value;
        goalsMap.set(e.player_id, cur);
      }

      if (e.type === "assist") {
        const cur = assistsMap.get(e.player_id) || { playerId: e.player_id, name, value: 0 };
        cur.value += value;
        assistsMap.set(e.player_id, cur);
      }

      if (e.type === "mvp") {
        const cur = mvpMap.get(e.player_id) || { playerId: e.player_id, name, value: 0 };
        cur.value += 1;
        mvpMap.set(e.player_id, cur);
      }
    }

    const sortDesc = (a: any, b: any) => b.value - a.value || a.name.localeCompare(b.name, "sr");

    const goals = Array.from(goalsMap.values()).sort(sortDesc);
    const assists = Array.from(assistsMap.values()).sort(sortDesc);
    const mvp = Array.from(mvpMap.values()).sort(sortDesc);

    return { goals, assists, mvp };
  }, [events, filteredMatchIds]);

  const currentTable = useMemo(() => {
    if (rankMode === "goals") return { title: "Strelci", rows: rankings.goals };
    if (rankMode === "assists") return { title: "Asistenti", rows: rankings.assists };
    return { title: "MVP", rows: rankings.mvp };
  }, [rankMode, rankings]);

  const filterLabel = useMemo(() => {
    const y = year === "all" ? "Sve godine" : year;
    const m = month === "all" ? "Svi meseci" : MONTHS.find((x) => x.value === month)?.label || month;
    return `${y} • ${m}`;
  }, [year, month]);

  if (loading) return <p style={{ padding: 20 }}>Učitavanje mečeva...</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div className="matches-page" style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div className="page-head">
        <h1 className="page-title">Mečevi</h1>
        <div className="page-sub">
          Pregled svih utakmica, filter po mesecu/godini, međusobni skor i rang liste — sve na jednom mestu.
        </div>
      </div>

      <div className="layout">
        {/* LEVO: LISTA MEČEVA */}
        <div className="left">
          {filteredMatches.length === 0 ? (
            <div className="panel panel-soft">
              Nema mečeva za izabrani filter.
            </div>
          ) : (
            <div className="match-grid">
              {filteredMatches.map((m) => {
                const d = new Date(m.date).toLocaleDateString("sr-RS", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });

                const hasReport = Array.isArray(m.match_columns)
                  ? m.match_columns.length > 0
                  : Boolean(m.match_columns);

                return (
                  <Link key={m.id} href={`/utakmice/${m.id}`} className="match-card">
                    <div className="match-top">
                      <div className="match-date">{d}</div>

                      <div className="match-right">
                        <div className="match-score">
                          {m.home_score} : {m.away_score}
                        </div>

                        <span className={`pill ${hasReport ? "pill-report" : "pill-empty"}`}>
                          {hasReport ? "MILJANOV UGAO" : "BEZ IZVEŠTAJA"}
                        </span>
                      </div>
                    </div>

                    <div className="match-bottom">
                      <span className="teams">{TEAM_A}</span>
                      <span className="vs">vs</span>
                      <span className="teams">{TEAM_B}</span>
                    </div>

                    <span className="chev" aria-hidden="true">→</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* DESNO: FILTER + SKOR + RANG LISTE */}
        <div className="right">
          {/* FILTER */}
          <div className="panel">
            <div className="panel-title">Filter</div>

            <div className="form">
              <label className="field">
                <span className="label">Godina</span>
                <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="all">Sve godine</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="label">Mesec</span>
                <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
                  <option value="all">Svi meseci</option>
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="active-filter">
                Aktivno: <strong>{filterLabel}</strong>
              </div>
            </div>
          </div>

          {/* SKOR */}
          <div className="panel">
            <div className="panel-title">Međusobni skor</div>

            <div className="h2h">
              <div className="h2h-row">
                Odigrano: <strong>{headToHead.played}</strong>
              </div>

              <div className="h2h-box">
                <div className="h2h-item">
                  <span className="team-tag a" />
                  {TEAM_A}: <strong>{headToHead.winsA}</strong>
                </div>
                <div className="h2h-item">
                  <span className="team-tag b" />
                  {TEAM_B}: <strong>{headToHead.winsB}</strong>
                </div>
                <div className="h2h-item">
                  <span className="team-tag d" />
                  Nerešeno: <strong>{headToHead.draws}</strong>
                </div>
              </div>

              <div className="h2h-foot">
                Gol razlika (ukupno):
                <div className="h2h-score">
                  {TEAM_A} {headToHead.goalsA} : {headToHead.goalsB} {TEAM_B}
                </div>
              </div>
            </div>
          </div>

          {/* RANG LISTE */}
          <div className="panel">
            <div className="panel-title">Rang liste</div>

            <div className="tabs">
              <button
                type="button"
                onClick={() => setRankMode("goals")}
                className={`tab ${rankMode === "goals" ? "active" : ""}`}
              >
                STRELCI
              </button>

              <button
                type="button"
                onClick={() => setRankMode("assists")}
                className={`tab ${rankMode === "assists" ? "active" : ""}`}
              >
                ASISTENTI
              </button>

              <button
                type="button"
                onClick={() => setRankMode("mvp")}
                className={`tab ${rankMode === "mvp" ? "active" : ""}`}
              >
                MVP
              </button>
            </div>

            {currentTable.rows.length === 0 ? (
              <div className="empty-note">Nema podataka za izabrani filter.</div>
            ) : (
              <div className="table">
                <div className="thead">
                  <div>#</div>
                  <div>Igrač</div>
                  <div style={{ textAlign: "right" }}>
                    {rankMode === "mvp" ? "MVP" : rankMode === "assists" ? "AST" : "GOL"}
                  </div>
                </div>

                {currentTable.rows.slice(0, 20).map((r, idx) => (
                  <div className="trow" key={r.playerId}>
                    <div className="idx">{idx + 1}</div>
                    <div className="pname">{r.name}</div>
                    <div className="val">{r.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="table-foot">
              Prikaz: top 20 • Filter utiče i na mečeve i na rang liste.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .matches-page{
          animation: pageFade 360ms ease-out both;
        }
        @keyframes pageFade{
          from{ opacity:0; transform: translateY(6px); }
          to{ opacity:1; transform: translateY(0); }
        }

        .page-head{
          margin-bottom: 14px;
          padding: 16px 16px;
          border-radius: 22px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(900px 220px at 10% 0%, rgba(240,180,41,0.18), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 14px 36px rgba(0,0,0,0.06);
        }

        .page-title{
          margin: 0;
          font-weight: 1000;
          letter-spacing: 0.2px;
        }

        .page-sub{
          margin-top: 8px;
          opacity: 0.78;
          line-height: 1.55;
          max-width: 920px;
          font-size: 13.5px;
        }

        .layout{
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 16px;
          align-items: start;
        }

        /* LEFT list */
        .match-grid{
          display: grid;
          gap: 12px;
        }

        .match-card{
          position: relative;
          display: block;
          text-decoration: none;
          color: inherit;
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(700px 180px at 10% 0%, rgba(240,180,41,0.14), transparent 55%),
            radial-gradient(700px 180px at 90% 0%, rgba(90,160,255,0.10), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
          padding: 14px;
          overflow: hidden;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, filter 140ms ease;
        }

        .match-card::before{
          content:"";
          position:absolute;
          top:0;
          left:0;
          height:4px;
          width:100%;
          background: linear-gradient(90deg, rgba(240,180,41,0.95), rgba(240,180,41,0.10));
          opacity: 0.95;
        }

        .match-card:hover{
          transform: translateY(-2px);
          box-shadow: 0 18px 44px rgba(0,0,0,0.09);
          border-color: rgba(240,180,41,0.45);
          filter: saturate(1.02);
        }

        .match-top{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .match-date{
          font-weight: 950;
          letter-spacing: 0.2px;
        }

        .match-right{
          display:flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .match-score{
          font-weight: 1000;
          font-size: 16px;
          letter-spacing: 0.2px;
        }

        .pill{
          font-size: 12px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(10px);
          font-weight: 950;
          letter-spacing: 0.2px;
        }

        .pill-report{
          border-color: rgba(20,120,60,0.18);
          background: rgba(230,246,236,0.92);
        }

        .pill-empty{
          border-color: rgba(0,0,0,0.10);
          background: rgba(250,250,250,0.92);
          opacity: 0.9;
        }

        .match-bottom{
          margin-top: 10px;
          display:flex;
          gap: 10px;
          align-items: center;
          font-size: 13px;
          opacity: 0.86;
          flex-wrap: wrap;
        }
        .teams{ font-weight: 900; }
        .vs{ opacity: 0.55; font-weight: 900; }

        .chev{
          position:absolute;
          right: 14px;
          bottom: 12px;
          opacity: 0.45;
          font-weight: 1000;
        }

        /* RIGHT panels */
        .right{
          display: grid;
          gap: 12px;
        }

        .panel{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 14px;
          background: white;
          box-shadow: 0 12px 30px rgba(0,0,0,0.05);
        }

        .panel-soft{
          background: rgba(255,255,255,0.8);
        }

        .panel-title{
          font-weight: 1000;
          margin-bottom: 10px;
          letter-spacing: 0.2px;
        }

        .form{
          display:grid;
          gap: 10px;
        }

        .field{
          display:grid;
          gap: 6px;
        }

        .label{
          font-size: 13px;
          opacity: 0.8;
          font-weight: 850;
        }

        .select{
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.14);
          background: white;
          font-weight: 850;
          outline: none;
          transition: border-color 140ms ease, box-shadow 140ms ease;
        }

        .select:focus{
          border-color: rgba(240,180,41,0.60);
          box-shadow: 0 0 0 4px rgba(240,180,41,0.16);
        }

        .active-filter{
          font-size: 12px;
          opacity: 0.75;
        }

        .h2h{
          display:grid;
          gap: 10px;
          font-size: 14px;
        }

        .h2h-row{
          opacity: 0.9;
        }

        .h2h-box{
          display:grid;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(700px 200px at 10% 0%, rgba(240,180,41,0.12), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }

        .h2h-item{
          display:flex;
          gap: 8px;
          align-items: center;
          font-weight: 850;
        }

        .team-tag{
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display:inline-block;
        }
        .team-tag.a{ background: rgba(240,180,41,0.95); }
        .team-tag.b{ background: rgba(90,160,255,0.90); }
        .team-tag.d{ background: rgba(120,120,120,0.70); }

        .h2h-foot{
          padding-top: 10px;
          border-top: 1px solid rgba(0,0,0,0.06);
          opacity: 0.95;
        }

        .h2h-score{
          margin-top: 4px;
          font-weight: 1000;
          letter-spacing: 0.2px;
        }

        /* Tabs */
        .tabs{
          display:flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .tab{
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.12);
          background: white;
          font-weight: 950;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background 120ms ease;
        }

        .tab:hover{
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(0,0,0,0.06);
          border-color: rgba(240,180,41,0.35);
        }

        .tab.active{
          background: rgba(242,242,242,1);
          border-color: rgba(240,180,41,0.45);
        }

        /* Table */
        .table{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 14px;
          overflow: hidden;
          background: white;
        }

        .thead{
          display:grid;
          grid-template-columns: 52px 1fr 90px;
          padding: 10px 12px;
          background: #fafafa;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          font-weight: 1000;
          font-size: 13px;
        }

        .trow{
          display:grid;
          grid-template-columns: 52px 1fr 90px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          font-size: 14px;
        }
        .trow:last-child{ border-bottom: none; }

        .idx{ font-weight: 950; opacity: 0.9; }
        .pname{ font-weight: 800; }
        .val{ text-align:right; font-weight: 1000; }

        .empty-note{
          opacity: 0.75;
          line-height: 1.5;
        }

        .table-foot{
          margin-top: 10px;
          font-size: 12px;
          opacity: 0.7;
        }

        /* Responsive */
        @media (max-width: 980px){
          .layout{
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
