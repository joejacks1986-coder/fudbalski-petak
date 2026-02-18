"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  computeAwards,
  listPeriodsForYear,
  listYears,
  matchIdsForPeriod,
  periodLabel,
  type EventRow,
  type MatchRow,
  type PeriodKey,
  type TeamRow,
  type Winner,
} from "@/lib/awards";

// =====================
//  MINI KOMPONENTE
// =====================
function WinnerMini({ w, size = 28 }: { w: Winner; size?: number }) {
  return (
    <div className="wmini">
      <img
        src={w.image_url ?? "/player-images/placeholder.png"}
        alt={w.name}
        style={{ width: size, height: size }}
      />
      {w.slug ? (
        <Link href={`/igraci/${w.slug}`} className="wmini-name">
          {w.name}
        </Link>
      ) : (
        <span className="wmini-name">{w.name}</span>
      )}
    </div>
  );
}

function WinnersRow({ icon, winners, featured = false }: { icon: string; winners: Winner[]; featured?: boolean }) {
  if (!winners.length) return <div className="wrow-empty">{icon} —</div>;

  return (
    <div className={`wrow ${featured ? "featured" : ""}`}>
      <div className="wrow-ico">{icon}</div>
      <div className="wrow-list">
        {winners.slice(0, featured ? 3 : 2).map((w) => (
          <WinnerMini key={w.id} w={w} size={featured ? 34 : 28} />
        ))}
        {winners.length > (featured ? 3 : 2) ? (
          <div className="wrow-more">+{winners.length - (featured ? 3 : 2)} još</div>
        ) : null}
      </div>
    </div>
  );
}

function monthLabelSR(period: PeriodKey) {
  if (period.mode !== "month") return periodLabel(period);
  const m = period.month;
  const months: Record<string, string> = {
    "01": "Januar",
    "02": "Februar",
    "03": "Mart",
    "04": "April",
    "05": "Maj",
    "06": "Jun",
    "07": "Jul",
    "08": "Avgust",
    "09": "Septembar",
    "10": "Oktobar",
    "11": "Novembar",
    "12": "Decembar",
  };
  return `${period.year} • ${months[m] ?? m}`;
}

export default function NagradeIstorijaPage() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: mData, error: mErr } = await supabase
          .from("matches")
          .select("id, date, home_score, away_score")
          .order("date", { ascending: false })
          .returns<MatchRow[]>();
        if (mErr) throw mErr;

        const { data: eData, error: eErr } = await supabase
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
          .returns<EventRow[]>();
        if (eErr) throw eErr;

        const { data: tData, error: tErr } = await supabase
          .from("match_teams")
          .select(
            `
            match_id,
            team,
            player_id,
            players ( id, name, slug, image_url, is_public )
          `
          )
          .returns<TeamRow[]>();
        if (tErr) throw tErr;

        const mm = mData ?? [];
        setMatches(mm);
        setEvents(eData ?? []);
        setTeams(tData ?? []);

        const years = listYears(mm);
        setYear((y) => y || years[0] || "");
      } catch (err) {
        console.error(err);
        setError("Greška pri učitavanju istorije nagrada.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const yearOptions = useMemo(() => listYears(matches), [matches]);

  // ✅ samo monthPeriods + yearPeriod
  const periods = useMemo(() => {
    if (!year) return { monthPeriods: [] as PeriodKey[], yearPeriod: null as PeriodKey | null };
    const { monthPeriods, yearPeriod } = listPeriodsForYear(matches, year);
    return { monthPeriods, yearPeriod };
  }, [matches, year]);

  const cards = useMemo(() => {
    if (!year) return [];

    const list: { period: PeriodKey; matchCount: number; core: ReturnType<typeof computeAwards> }[] = [];

    const all = [...periods.monthPeriods, ...(periods.yearPeriod ? [periods.yearPeriod] : [])];

    for (const p of all) {
      const ids = matchIdsForPeriod(matches, p);
      if (!ids.length) continue;

      const core = computeAwards({ matches, events, teams, matchIds: ids });
      list.push({ period: p, matchCount: ids.length, core });
    }

    // sort: prvo GODINA, pa meseci 01..12
    return list.sort((a, b) => {
      if (a.period.mode === "year" && b.period.mode !== "year") return -1;
      if (a.period.mode !== "year" && b.period.mode === "year") return 1;

      if (a.period.mode === "month" && b.period.mode === "month") {
        return a.period.month.localeCompare(b.period.month);
      }
      return 0;
    });
  }, [matches, events, teams, year, periods]);

  const yearCard = useMemo(() => cards.find((c) => c.period.mode === "year") ?? null, [cards]);
  type MonthCard = { period: Extract<PeriodKey, { mode: "month" }>; matchCount: number; core: ReturnType<typeof computeAwards> };

const monthCards = useMemo(() => {
  return cards.filter((c): c is MonthCard => c.period.mode === "month");
}, [cards]);


  if (loading) return <p style={{ padding: 20 }}>Učitavanje istorije…</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div className="hist-page">
      {/* HEADER */}
      <div className="hist-head">
        <div className="hist-head-row">
          <div>
            <h1 className="hist-title">Istorija nagrada</h1>
            <div className="hist-sub">Pregled perioda po godini (mesec / sezona).</div>
          </div>

          <div className="hist-controls">
            <Link href="/nagrade" className="back-link">
              ← Nagrade
            </Link>

            <select value={year} onChange={(e) => setYear(e.target.value)} className="year-select">
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FEATURED: SEZONA */}
      {yearCard ? (
        <section className="season">
          <div className="season-top">
            <div className="season-left">
              <div className="season-badges">
                <span className="pill pill-season">SEZONA {year}</span>
                <span className="pill pill-live">LIVE • u toku</span>
              </div>
              <div className="season-headline">Trenutno stanje u trci za prestižne nagrade za sezonu {year}</div>
              <div className="season-meta">Odigrano: <b>{yearCard.matchCount}</b> meča</div>
            </div>

            <div className="season-right">
              <div className="season-note">
                Napomena: ako ima izjednačenja, svi su pobednici (isto kao na glavnoj stranici nagrada).
              </div>
            </div>
          </div>

          <div className="season-grid">
            <WinnersRow icon="🥇⚽" winners={yearCard.core.goals.winners} featured />
            <WinnersRow icon="🅰️" winners={yearCard.core.assists.winners} featured />
            <WinnersRow icon="🏅" winners={yearCard.core.mvps.winners} featured />
            <WinnersRow icon="🛡️" winners={yearCard.core.ironman.winners} featured />
          </div>
        </section>
      ) : null}

      {/* MESECI */}
      <div className="months-head">
        <div className="months-title">Meseci</div>
        <div className="months-sub">Brzi pregled pobednika po mesecima.</div>
      </div>

      <div className="months-grid">
        {monthCards.map((c) => {
          const label = monthLabelSR(c.period);
          const key = `month-${c.period.year}-${c.period.month}`;

          return (
            <div key={key} className="month-card">
              <div className="month-top">
                <div className="month-label">{label}</div>
                <div className="month-count">{c.matchCount} meča</div>
              </div>

              <div className="month-awards">
                <WinnersRow icon="🥇⚽" winners={c.core.goals.winners} />
                <WinnersRow icon="🅰️" winners={c.core.assists.winners} />
                <WinnersRow icon="🏅" winners={c.core.mvps.winners} />
                <WinnersRow icon="🛡️" winners={c.core.ironman.winners} />
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .hist-page{
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          animation: fade 360ms ease-out both;
        }
        @keyframes fade{ from{opacity:0; transform: translateY(6px);} to{opacity:1; transform:none;} }

        /* HEADER */
        .hist-head{
          border-radius: 22px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(900px 220px at 10% 0%, rgba(240,180,41,0.18), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 14px 36px rgba(0,0,0,0.06);
          padding: 16px;
        }
        .hist-head-row{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }
        .hist-title{ margin:0; font-weight:1000; letter-spacing:0.2px; }
        .hist-sub{ margin-top:6px; opacity:0.78; font-weight:850; }

        .hist-controls{ display:flex; gap:10px; align-items:center; }
        .back-link{
          text-decoration:none;
          font-weight: 950;
          opacity: 0.85;
          color: inherit;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(10px);
        }
        .back-link:hover{ text-decoration: underline; }

        .year-select{
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.14);
          font-weight: 900;
          background: white;
          outline: none;
        }
        .year-select:focus{
          border-color: rgba(240,180,41,0.60);
          box-shadow: 0 0 0 4px rgba(240,180,41,0.16);
        }

        /* FEATURED SEASON */
        .season{
          margin-top: 14px;
          border-radius: 22px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(900px 260px at 12% 0%, rgba(240,180,41,0.22), transparent 55%),
            radial-gradient(900px 260px at 88% 0%, rgba(90,160,255,0.14), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 18px 50px rgba(0,0,0,0.08);
          padding: 16px;
        }

        .season-top{
          display:flex;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          align-items: flex-start;
        }

        .season-badges{ display:flex; gap:8px; flex-wrap:wrap; }
        .pill{
          display:inline-flex;
          align-items:center;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          font-weight: 950;
          font-size: 12px;
          background: rgba(255,255,255,0.8);
        }
        .pill-season{ border-color: rgba(240,180,41,0.45); }
        .pill-live{ border-color: rgba(90,160,255,0.35); }

        .season-headline{
          margin-top: 10px;
          font-weight: 1000;
          letter-spacing: 0.2px;
          font-size: 18px;
          line-height: 1.25;
        }
        .season-meta{
          margin-top: 8px;
          opacity: 0.78;
          font-weight: 900;
        }

        .season-note{
          padding: 10px 12px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.7);
          opacity: 0.85;
          font-weight: 850;
          max-width: 360px;
          line-height: 1.45;
          font-size: 12.5px;
        }

        .season-grid{
          margin-top: 14px;
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        /* MONTHS HEAD */
        .months-head{
          margin-top: 16px;
          display:flex;
          justify-content: space-between;
          gap: 10px;
          align-items: baseline;
          flex-wrap: wrap;
        }
        .months-title{ font-weight: 1000; font-size: 16px; }
        .months-sub{ opacity: 0.75; font-weight: 850; }

        /* MONTH GRID */
        .months-grid{
          margin-top: 12px;
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .month-card{
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(700px 180px at 10% 0%, rgba(240,180,41,0.10), transparent 60%),
            radial-gradient(700px 180px at 90% 0%, rgba(90,160,255,0.07), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
          padding: 14px;
        }

        .month-top{
          display:flex;
          justify-content: space-between;
          gap: 10px;
          align-items:center;
        }
        .month-label{ font-weight: 1000; }
        .month-count{ opacity: 0.75; font-weight: 900; }

        .month-awards{
          margin-top: 12px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* WINNERS ROW */
        .wrow{
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.72);
          padding: 10px;
        }
        .wrow.featured{
          background: rgba(255,255,255,0.82);
        }
        .wrow-ico{
          opacity: 0.7;
          font-weight: 1000;
          margin-bottom: 8px;
        }
        .wrow-list{ display:grid; gap: 8px; }
        .wrow-more{ opacity: 0.7; font-weight: 850; font-size: 12px; }

        .wrow-empty{
          opacity: 0.65;
          padding: 10px;
          border-radius: 16px;
          border: 1px dashed rgba(0,0,0,0.18);
          background: rgba(255,255,255,0.55);
          font-weight: 900;
        }

        .wmini{
          display:flex;
          align-items:center;
          gap: 8px;
        }
        .wmini img{
          border-radius: 999px;
          object-fit: cover;
          border: 1px solid rgba(0,0,0,0.10);
          background: white;
          flex: 0 0 auto;
        }
        .wmini-name{
          font-weight: 950;
          text-decoration: none;
          color: inherit;
          line-height: 1.2;
        }
        .wmini-name:hover{ text-decoration: underline; }

        @media (max-width: 980px){
          .months-grid{ grid-template-columns: 1fr; }
          .season-grid{ grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 560px){
          .season-grid{ grid-template-columns: 1fr; }
          .month-awards{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
