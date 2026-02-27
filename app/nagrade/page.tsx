"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  computeAwards,
  listPeriodsForYear,
  listYears,
  matchIdsForPeriod,
  type EventRow,
  type MatchRow,
  type PeriodKey,
  type TeamRow,
  type Winner,
} from "@/lib/awards";

type MonthPeriod = Extract<PeriodKey, { mode: "month" }>;
type YearPeriod = Extract<PeriodKey, { mode: "year" }>;

function monthLabelSR(period: MonthPeriod) {
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
  return `${months[m] ?? m} ${period.year}`;
}

function fmt2(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function WinnerMini({ w, size = 38 }: { w: Winner; size?: number }) {
  return (
    <div className="wmini">
      <img
        src={w.image_url ?? "/player-images/placeholder.png"}
        alt={w.name}
        style={{ width: size, height: size }}
      />
      {w.slug ? (
        <Link href={`/igraci/${w.slug}`} className="wname">
          {w.name}
        </Link>
      ) : (
        <span className="wname">{w.name}</span>
      )}
      {w.extra ? <span className="wextra">{w.extra}</span> : null}
    </div>
  );
}

function BigAwardCard({
  title,
  icon,
  value,
  label,
  winners,
  isYear,
  ribbon,
}: {
  title: string;
  icon: string;
  value: string | number | null;
  label: string;
  winners: Winner[];
  isYear: boolean;
  ribbon?: string;
}) {
  const shown = winners.slice(0, 4);
  const more = Math.max(0, winners.length - shown.length);

  return (
    <div className={`big ${isYear ? "year" : ""}`}>
      {ribbon ? <div className="ribbon">{ribbon}</div> : null}

      <div className="bigTop">
        <div className="bigLeft">
          <div className="bigIcon" aria-hidden>
            {icon}
          </div>
          <div>
            <div className="bigTitle">{title}</div>
            <div className="bigSub">Trenutni nosioci krune</div>
          </div>
        </div>

        <div className="bigMetric">
          <div className="bigVal">{value ?? "—"}</div>
          <div className="bigLab">{label}</div>
        </div>
      </div>

      <div className="bigWinners">
        {shown.length ? (
          <>
            {shown.map((w) => (
              <WinnerMini key={w.id} w={w} size={46} />
            ))}
            {more ? <div className="wmore">+{more} još</div> : null}
          </>
        ) : (
          <div className="wempty">Nema podataka.</div>
        )}
      </div>

      <div className="bigFoot">Izjednačenje = svi pobednici dele priznanje.</div>
    </div>
  );
}

function SmallAwardCard({
  title,
  value,
  label,
  winners,
  isYear,
}: {
  title: string;
  value: string | number | null;
  label: string;
  winners: Winner[];
  isYear: boolean;
}) {
  const shown = winners.slice(0, 2);
  const more = Math.max(0, winners.length - shown.length);

  return (
    <div className={`small ${isYear ? "year" : ""}`}>
      <div className="smallTop">
        <div className="smallTitle">{title}</div>
        <div className="smallMetric">
          <div className="smallVal">{value ?? "—"}</div>
          <div className="smallLab">{label}</div>
        </div>
      </div>

      <div className="smallWinners">
        {shown.length ? (
          <>
            {shown.map((w) => (
              <WinnerMini key={w.id} w={w} size={34} />
            ))}
            {more ? <div className="wmore">+{more} još</div> : null}
          </>
        ) : (
          <div className="wempty">Nema podataka.</div>
        )}
      </div>
    </div>
  );
}

export default function NagradePage() {
  const [mode, setMode] = useState<"month" | "year">("year");
  const [year, setYear] = useState<string>("");
  const [month, setMonth] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        const y0 = years[0] ?? "";
        setYear(y0);

        if (y0) {
          const res = listPeriodsForYear(mm, y0);
          const mp = (res.monthPeriods ?? []).filter((p): p is MonthPeriod => p.mode === "month");
          setMonth(mp[mp.length - 1]?.month ?? "");
        }
      } catch (err) {
        console.error(err);
        setError("Greška pri učitavanju nagrada.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const yearOptions = useMemo(() => listYears(matches), [matches]);

  const { monthPeriods, yearPeriod } = useMemo(() => {
    if (!year) return { monthPeriods: [] as MonthPeriod[], yearPeriod: null as YearPeriod | null };
    const res = listPeriodsForYear(matches, year);
    const mp = (res.monthPeriods ?? []).filter((p): p is MonthPeriod => p.mode === "month");
    const yp = res.yearPeriod && res.yearPeriod.mode === "year" ? (res.yearPeriod as YearPeriod) : null;
    return { monthPeriods: mp, yearPeriod: yp };
  }, [matches, year]);

  useEffect(() => {
    if (!year) return;
    const latest = monthPeriods[monthPeriods.length - 1]?.month ?? "";
    setMonth((prev) => prev || latest || "");
  }, [year, monthPeriods]);

  const selectedPeriod: PeriodKey | null = useMemo(() => {
    if (!year) return null;
    if (mode === "year") return yearPeriod;
    if (!month) return null;
    return { mode: "month", year, month } as MonthPeriod;
  }, [mode, year, month, yearPeriod]);

  const matchCount = useMemo(() => {
    if (!selectedPeriod) return 0;
    return matchIdsForPeriod(matches, selectedPeriod).length;
  }, [matches, selectedPeriod]);

  const awards = useMemo(() => {
    if (!selectedPeriod) return null;
    const ids = matchIdsForPeriod(matches, selectedPeriod);
    if (!ids.length) return null;
    return computeAwards({ matches, events, teams, matchIds: ids });
  }, [matches, events, teams, selectedPeriod]);

  const periodTitle = useMemo(() => {
    if (!selectedPeriod) return "";
    return selectedPeriod.mode === "year" ? `Sezona ${selectedPeriod.year}` : monthLabelSR(selectedPeriod);
  }, [selectedPeriod]);

  if (loading) return <p style={{ padding: 20 }}>Učitavanje...</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  const isYear = mode === "year";

  return (
    <div className="page">
      <div className="top">
        <div className="head">
          <div>
            <h1 className="h1">Nagrade</h1>
            <div className="sub">Trofejna vitrina: “ko drži krunu” za izabrani period.</div>
          </div>

          <div className="headRight">
            <Link className="pillLink" href="/nagrade/istorija">
              Hall of Fame →
            </Link>
          </div>
        </div>

        <div className="filters">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${isYear ? "active year" : ""}`}
              onClick={() => setMode("year")}
            >
              GODINA
            </button>
            <button
              type="button"
              className={`tab ${!isYear ? "active" : ""}`}
              onClick={() => setMode("month")}
            >
              MESEC
            </button>
          </div>

          <div className="selects">
            <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {!isYear ? (
              <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
                {monthPeriods.map((p) => (
                  <option key={`${p.year}-${p.month}`} value={p.month}>
                    {monthLabelSR(p)}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`hero ${isYear ? "year" : ""}`}>
        <div className="heroBadges">
          {isYear ? <span className="badge gold">🏆 GLAVNI PRESTIŽ</span> : <span className="badge">📅 MESEČNA FORMA</span>}
          <span className="badge soft">{periodTitle || "Period"}</span>
          <span className="badge soft">{matchCount} meča</span>
        </div>
        <div className="heroTitle">Trofejna vitrina</div>
        <div className="heroSub">Top 3 priznanja su istaknuta kao kruna. Ostala su prateći prestiž.</div>
      </div>

      {awards ? (
        <>
          <div className="top3">
            <BigAwardCard
              title="Zlatna kopačka"
              icon="🥇⚽"
              value={awards.goals.winners.length ? awards.goals.max : null}
              label="golova"
              winners={awards.goals.winners}
              isYear={isYear}
              /*ribbon="KRUNA"*/
            />
            <BigAwardCard
              title="Asist kralj"
              icon="🅰️"
              value={awards.assists.winners.length ? awards.assists.max : null}
              label="asist."
              winners={awards.assists.winners}
              isYear={isYear}
              /*ribbon="KRUNA"*/
            />
            <BigAwardCard
              title="MVP"
              icon="🏅"
              value={awards.mvps.winners.length ? awards.mvps.max : null}
              label="MVP"
              winners={awards.mvps.winners}
              isYear={isYear}
              /*ribbon="KRUNA"*/
            />
          </div>

          <div className="restHead">
            <div className="restTitle">Prateći prestiž</div>
            <div className="restSub">Dodatni uvidi za isti period.</div>
          </div>

          <div className="restGrid">
            <SmallAwardCard
              title="⚡ Učešće u golovima"
              value={awards.ga.winners.length ? awards.ga.max : null}
              label="G/A"
              winners={awards.ga.winners}
              isYear={isYear}
            />
            <SmallAwardCard
              title="🛡️ Pouzdanost"
              value={awards.ironman.winners.length ? awards.ironman.max : null}
              label="meča"
              winners={awards.ironman.winners}
              isYear={isYear}
            />
            <SmallAwardCard
              title="🔥 Forma"
              value={awards.form.winners.length ? `${Math.round(awards.form.maxRate * 100)}%` : null}
              label="pobeda"
              winners={awards.form.winners}
              isYear={isYear}
            />
            <SmallAwardCard
              title="🧱 Stub odbrane"
              value={awards.stub.winners.length ? awards.stub.minRate : null}
              label="PG/meč"
              winners={awards.stub.winners}
              isYear={isYear}
            />
          </div>

          {/* ✅ VRAĆENA TELEMETRIJA */}
          <div className="techHead">
            <div className="techTitle">Tehničke nagrade</div>
            <div className="techSub">“Nerd-mode”: učinak po meču i stabilnost kroz rezultate.</div>
          </div>

          <div className="techGrid">
            <SmallAwardCard
              title="🎯 Golovi po meču"
              value={awards.goalRate.winners.length ? fmt2(awards.goalRate.max) : null}
              label="G/meč"
              winners={awards.goalRate.winners}
              isYear={isYear}
            />
            <SmallAwardCard
              title="🧠 Asistencije po meču"
              value={awards.assistRate.winners.length ? fmt2(awards.assistRate.max) : null}
              label="A/meč"
              winners={awards.assistRate.winners}
              isYear={isYear}
            />
            <SmallAwardCard
              title="✨ MVP po meču"
              value={awards.mvpRate.winners.length ? fmt2(awards.mvpRate.max) : null}
              label="MVP/meč"
              winners={awards.mvpRate.winners}
              isYear={isYear}
            />
            <SmallAwardCard
              title="🧊 Najmanje poraza"
              value={awards.leastLosses.winners.length ? awards.leastLosses.min : null}
              label="poraza"
              winners={awards.leastLosses.winners}
              isYear={isYear}
            />
          </div>
        </>
      ) : (
        <div className="empty">Nema dovoljno podataka za izabrani period.</div>
      )}

      <style>{`
        .page{ padding:20px; max-width:1150px; margin:0 auto; animation: fade 320ms ease-out both; }
        @keyframes fade{ from{opacity:0; transform: translateY(6px);} to{opacity:1; transform:none;} }

        .top{
          border-radius: 22px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(900px 220px at 10% 0%, rgba(240,180,41,0.16), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 14px 36px rgba(0,0,0,0.06);
          padding: 16px;
        }

        .head{ display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center; }
        .h1{ margin:0; font-weight:1000; letter-spacing:0.2px; }
        .sub{ margin-top:6px; opacity:0.78; font-weight:850; }

        .pillLink{
          text-decoration:none; font-weight:950; color:inherit;
          padding: 8px 12px; border-radius:999px;
          border:1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(10px);
        }
        .pillLink:hover{ text-decoration: underline; }

        .filters{ margin-top:12px; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center; }
        .tabs{ display:flex; gap:8px; }
        .tab{
          padding: 9px 12px; border-radius:999px;
          border:1px solid rgba(0,0,0,0.14);
          background: rgba(255,255,255,0.85);
          font-weight:1000; cursor:pointer;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .tab:hover{ transform: translateY(-1px); box-shadow: 0 12px 26px rgba(0,0,0,0.06); }
        .tab.active{ background: rgba(0,0,0,0.92); color:white; border-color: rgba(0,0,0,0.18); }
        .tab.active.year{
          background: linear-gradient(90deg, rgba(240,180,41,0.98), rgba(217,119,6,0.98));
          color: #1a1302;
          border-color: rgba(240,180,41,0.40);
        }

        .selects{ display:flex; gap:10px; flex-wrap:wrap; }
        .select{
          padding:10px 12px; border-radius:12px;
          border:1px solid rgba(0,0,0,0.14);
          font-weight:900; background:white; outline:none;
        }
        .select:focus{ border-color: rgba(240,180,41,0.60); box-shadow: 0 0 0 4px rgba(240,180,41,0.16); }

        .hero{
          margin-top:14px;
          border-radius:22px;
          border:1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(900px 260px at 12% 0%, rgba(240,180,41,0.16), transparent 55%),
            radial-gradient(900px 260px at 88% 0%, rgba(90,160,255,0.10), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 18px 50px rgba(0,0,0,0.08);
          padding:16px;
        }
        .hero.year{ border-color: rgba(240,180,41,0.35); }

        .heroBadges{ display:flex; gap:8px; flex-wrap:wrap; }
        .badge{
          display:inline-flex; align-items:center;
          padding:7px 10px; border-radius:999px;
          border:1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.78);
          font-weight:950; font-size:12px;
        }
        .badge.gold{ border-color: rgba(240,180,41,0.55); background: rgba(255,250,230,0.90); }
        .badge.soft{ opacity:0.85; }

        .heroTitle{ margin-top:10px; font-weight:1000; letter-spacing:0.2px; font-size:18px; }
        .heroSub{ margin-top:8px; opacity:0.78; font-weight:850; line-height:1.45; }

        .top3{
          margin-top:14px;
          display:grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .big{
          position: relative;
          border-radius: 20px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(800px 220px at 10% 0%, rgba(240,180,41,0.14), transparent 60%),
            radial-gradient(800px 220px at 90% 0%, rgba(90,160,255,0.10), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 16px 44px rgba(0,0,0,0.08);
          padding: 14px;
          overflow:hidden;
        }
        .big.year{ border-color: rgba(240,180,41,0.40); box-shadow: 0 18px 52px rgba(240,180,41,0.14); }

        .ribbon{
          position:absolute;
          top: 12px;
          right: -34px;
          transform: rotate(38deg);
          padding: 6px 44px;
          border-radius: 999px;
          border: 1px solid rgba(240,180,41,0.55);
          background: rgba(255,250,230,0.95);
          font-weight: 1000;
          letter-spacing: 0.6px;
          font-size: 11px;
          box-shadow: 0 12px 26px rgba(0,0,0,0.06);
          user-select:none;
          pointer-events:none;
        }

        .bigTop{ display:flex; justify-content:space-between; gap:12px; align-items:center; }
        .bigLeft{ display:flex; gap:12px; align-items:center; }
        .bigIcon{
          width: 44px; height:44px; border-radius:16px;
          display:grid; place-items:center;
          border:1px solid rgba(240,180,41,0.22);
          background: rgba(255,255,255,0.85);
          font-weight:1000;
        }
        .bigTitle{ font-weight:1000; letter-spacing:0.2px; }
        .bigSub{ font-size:12.5px; opacity:0.78; font-weight:850; }

        .bigMetric{ text-align:right; min-width: 92px; }
        .bigVal{ font-weight:1000; font-size:22px; letter-spacing:0.2px; }
        .bigLab{ font-size:12px; opacity:0.72; font-weight:900; }

        .bigWinners{
          margin-top: 12px; padding-top:12px;
          border-top: 1px solid rgba(0,0,0,0.06);
          display:grid; gap: 10px;
        }
        .bigFoot{ margin-top:12px; font-size:12px; opacity:0.70; font-weight:850; }

        .restHead{ margin-top: 16px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:baseline; }
        .restTitle{ font-weight:1000; font-size:16px; }
        .restSub{ opacity:0.75; font-weight:850; }

        .restGrid{
          margin-top: 12px;
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .techHead{ margin-top: 14px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:baseline; }
        .techTitle{ font-weight:1000; font-size:16px; }
        .techSub{ opacity:0.75; font-weight:850; }

        .techGrid{
          margin-top: 12px;
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .small{
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.82);
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
          padding: 14px;
        }
        .small.year{ border-color: rgba(240,180,41,0.30); }

        .smallTop{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
        .smallTitle{ font-weight:1000; letter-spacing:0.2px; }
        .smallMetric{ text-align:right; min-width: 86px; }
        .smallVal{ font-weight:1000; font-size:18px; }
        .smallLab{ font-size:12px; opacity:0.72; font-weight:900; margin-top:2px; }

        .smallWinners{
          margin-top: 10px; padding-top:10px;
          border-top: 1px solid rgba(0,0,0,0.06);
          display:grid; gap: 10px;
        }

        .wmini{ display:flex; align-items:center; gap:10px; }
        .wmini img{
          border-radius:999px; object-fit:cover;
          border:1px solid rgba(0,0,0,0.10);
          background:white;
          flex: 0 0 auto;
        }
        .wname{ font-weight:950; text-decoration:none; color:inherit; line-height:1.1; }
        .wname:hover{ text-decoration: underline; }
        .wextra{ margin-left:auto; opacity:0.75; font-weight:900; font-size:12px; }
        .wmore{ opacity:0.7; font-weight:900; font-size:12px; }
        .wempty{ opacity:0.7; font-weight:900; font-size:12px; }

        .empty{
          margin-top: 14px;
          border-radius: 18px;
          border: 1px dashed rgba(0,0,0,0.18);
          background: rgba(255,255,255,0.6);
          padding: 16px;
          font-weight: 900;
          opacity: 0.75;
        }

        @media (max-width: 980px){
          .top3{ grid-template-columns: 1fr; }
          .restGrid{ grid-template-columns: 1fr; }
          .techGrid{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
