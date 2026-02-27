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
  return `${period.year} • ${months[m] ?? m}`;
}

function fmt2(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function WinnerMini({ w, size = 28 }: { w: Winner; size?: number }) {
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

function Spotlight({
  icon,
  title,
  subtitle,
  value,
  label,
  winners,
}: {
  icon: string;
  title: string;
  subtitle: string;
  value: string;
  label: string;
  winners: Winner[];
}) {
  return (
    <div className="spot">
      <div className="spotTop">
        <div className="spotIco">{icon}</div>
        <div className="spotHead">
          <div className="spotTitle">{title}</div>
          <div className="spotSub">{subtitle}</div>
        </div>
        <div className="spotMetric">
          <div className="spotVal">{value}</div>
          <div className="spotLab">{label}</div>
        </div>
      </div>

      <div className="spotW">
        {winners.length ? (
          winners.map((w) => (
            <div key={w.id} className="spotRow">
              <img src={w.image_url ?? "/player-images/placeholder.png"} alt={w.name} />
              <div className="spotText">
                {w.slug ? (
                  <Link href={`/igraci/${w.slug}`} className="spotName">
                    {w.name}
                  </Link>
                ) : (
                  <span className="spotName">{w.name}</span>
                )}
                {w.extra ? <div className="spotMeta">{w.extra}</div> : null}
              </div>
            </div>
          ))
        ) : (
          <div className="wempty">Nema podataka.</div>
        )}
      </div>

      {/*<div className="spotFoot">Arhiva se ne bavi “sada”, nego “legendom”.</div>*/}
    </div>
  );
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

  const { monthPeriods, yearPeriod } = useMemo(() => {
    if (!year) return { monthPeriods: [] as MonthPeriod[], yearPeriod: null as YearPeriod | null };
    const res = listPeriodsForYear(matches, year);
    const mp = (res.monthPeriods ?? []).filter((p): p is MonthPeriod => p.mode === "month");
    const yp = res.yearPeriod && res.yearPeriod.mode === "year" ? (res.yearPeriod as YearPeriod) : null;
    return { monthPeriods: mp, yearPeriod: yp };
  }, [matches, year]);

  const yearCard = useMemo(() => {
    if (!yearPeriod) return null;
    const ids = matchIdsForPeriod(matches, yearPeriod);
    if (!ids.length) return null;
    const core = computeAwards({ matches, events, teams, matchIds: ids });
    return { matchCount: ids.length, core };
  }, [matches, events, teams, yearPeriod]);

  const monthCards = useMemo(() => {
    const list: { period: MonthPeriod; matchCount: number; core: ReturnType<typeof computeAwards> }[] = [];
    for (const p of monthPeriods) {
      const ids = matchIdsForPeriod(matches, p);
      if (!ids.length) continue;
      const core = computeAwards({ matches, events, teams, matchIds: ids });
      list.push({ period: p, matchCount: ids.length, core });
    }
    return list.sort((a, b) => a.period.month.localeCompare(b.period.month));
  }, [matches, events, teams, monthPeriods]);

  const dominance = useMemo(() => {
    if (!yearCard) return [];
    const cats = [
      { key: "goals", winners: yearCard.core.goals.winners },
      { key: "assists", winners: yearCard.core.assists.winners },
      { key: "mvps", winners: yearCard.core.mvps.winners },
      { key: "ga", winners: yearCard.core.ga.winners },
      { key: "ironman", winners: yearCard.core.ironman.winners },
      { key: "form", winners: yearCard.core.form.winners },
      { key: "stub", winners: yearCard.core.stub.winners },
      { key: "leastLosses", winners: yearCard.core.leastLosses.winners }, // ✅ NEW
    ] as const;

    const map = new Map<string, { w: Winner; catSet: Set<string> }>();

    for (const c of cats) {
      for (const w of c.winners) {
        const cur = map.get(w.id);
        if (!cur) map.set(w.id, { w, catSet: new Set([c.key]) });
        else cur.catSet.add(c.key);
      }
    }

    const arr = Array.from(map.values()).map((x) => ({
      winner: x.w,
      count: x.catSet.size,
    }));

    arr.sort((a, b) => b.count - a.count || a.winner.name.localeCompare(b.winner.name));
    return arr.filter((x) => x.count >= 2).slice(0, 5);
  }, [yearCard]);

  const yearStats = useMemo(() => {
    if (!yearCard) return null;
    const w = [
      ...yearCard.core.goals.winners,
      ...yearCard.core.assists.winners,
      ...yearCard.core.mvps.winners,
      ...yearCard.core.ga.winners,
      ...yearCard.core.ironman.winners,
      ...yearCard.core.form.winners,
      ...yearCard.core.stub.winners,
      ...yearCard.core.leastLosses.winners,
      ...yearCard.core.goalRate.winners,
      ...yearCard.core.assistRate.winners,
      ...yearCard.core.mvpRate.winners,
    ];
    const uniq = new Map<string, Winner>();
    for (const x of w) uniq.set(x.id, x);
    return { uniqueWinners: uniq.size };
  }, [yearCard]);

  if (loading) return <p style={{ padding: 20 }}>Učitavanje istorije…</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div className="page">
      <div className="head">
        <div>
          <h1 className="h1">Hall of Fame</h1>
          <div className="sub">Arhiva nagrada: godina kao priča, meseci kao poglavlja.</div>
        </div>

        <div className="right">
          <Link className="pillLink" href="/nagrade">
            ← Trofejna vitrina
          </Link>

          <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {yearCard ? (
        <section className="hof">
          <div className="hofTop">
            <div>
              <div className="badges">
                <span className="badge gold">🏆 SEZONA {year}</span>
                <span className="badge soft">{yearCard.matchCount} mečeva</span>
                {yearStats ? <span className="badge soft">{yearStats.uniqueWinners} različitih osvajača</span> : null}
              </div>
              <div className="hofTitle">Godišnje nagrade — vitrina istorije</div>
              <div className="hofSub">Ovo je ono što ostaje kad “danas” prođe.</div>
            </div>

            <div className="hofNote">
              Pravilo je isto uvek: nema tie-breaka. Izjednačenje znači da legenda ima više imena.
            </div>
          </div>

          <div className="dom">
            <div className="domTop">
              <div>
                <div className="domTitle">Dominacija sezone</div>
                <div className="domSub">Isti čovek u više kategorija = ozbiljan pečat na sezoni.</div>
              </div>
              <div className="domHint">Računa se broj različitih kategorija u kojima se pojavljuje kao pobednik.</div>
            </div>

            {dominance.length ? (
              <div className="domList">
                {dominance.map((x) => (
                  <div key={x.winner.id} className="domRow">
                    <WinnerMini w={x.winner} size={34} />
                    <span className="domBadge">{x.count} kategorije</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="domEmpty">Nema višekategorijskih osvajača ove sezone (ili nema dovoljno podataka).</div>
            )}
          </div>

          {/* ✅ “PRO STATISTIKA” — vraćena telemetrija */}
          <div className="pro">
            <div className="proTop">
              <div>
                <div className="proTitle">Pro statistika</div>
                <div className="proSub">Učinak po meču (min. prag iz lib/awards).</div>
              </div>
              {/*<div className="proHint">Ovo je “tehnički sloj” — ne menja prestiž, samo ga dopunjuje.</div>*/}
            </div>

            <div className="proGrid">
              <Spotlight
                icon="🎯"
                title="Golovi po meču"
                subtitle="Efikasnost (G/meč)"
                value={yearCard.core.goalRate.winners.length ? fmt2(yearCard.core.goalRate.max) : "—"}
                label="G/meč"
                winners={yearCard.core.goalRate.winners}
              />
              <Spotlight
                icon="🧠"
                title="Asistencije po meču"
                subtitle="Kreacija (A/meč)"
                value={yearCard.core.assistRate.winners.length ? fmt2(yearCard.core.assistRate.max) : "—"}
                label="A/meč"
                winners={yearCard.core.assistRate.winners}
              />
              <Spotlight
                icon="✨"
                title="MVP po meču"
                subtitle="Uticaj (MVP/meč)"
                value={yearCard.core.mvpRate.winners.length ? fmt2(yearCard.core.mvpRate.max) : "—"}
                label="MVP/meč"
                winners={yearCard.core.mvpRate.winners}
              />
              <Spotlight
                icon="🧊"
                title="Najmanje poraza"
                subtitle="Stabilnost kroz rezultate"
                value={yearCard.core.leastLosses.winners.length ? String(yearCard.core.leastLosses.min) : "—"}
                label="poraza"
                winners={yearCard.core.leastLosses.winners}
              />
            </div>
          </div>

          {/* ✅ “glavne” godišnje kartice */}
          <div className="grid">
            <Spotlight
              icon="🥇⚽"
              title="Zlatna kopačka"
              subtitle="Najviše golova"
              value={yearCard.core.goals.winners.length ? String(yearCard.core.goals.max) : "—"}
              label="golova"
              winners={yearCard.core.goals.winners}
            />
            <Spotlight
              icon="🅰️"
              title="Asist kralj"
              subtitle="Najviše asistencija"
              value={yearCard.core.assists.winners.length ? String(yearCard.core.assists.max) : "—"}
              label="asist."
              winners={yearCard.core.assists.winners}
            />
            <Spotlight
              icon="🏅"
              title="MVP sezone"
              subtitle="Najviše MVP priznanja"
              value={yearCard.core.mvps.winners.length ? String(yearCard.core.mvps.max) : "—"}
              label="MVP"
              winners={yearCard.core.mvps.winners}
            />
            <Spotlight
              icon="⚡"
              title="Učešće u golovima"
              subtitle="Golovi + asistencije"
              value={yearCard.core.ga.winners.length ? String(yearCard.core.ga.max) : "—"}
              label="G/A"
              winners={yearCard.core.ga.winners}
            />
            <Spotlight
              icon="🛡️"
              title="Pouzdanost"
              subtitle="Najviše odigranih mečeva"
              value={yearCard.core.ironman.winners.length ? String(yearCard.core.ironman.max) : "—"}
              label="meča"
              winners={yearCard.core.ironman.winners}
            />
            <Spotlight
              icon="🔥"
              title="Najbolja forma"
              subtitle="Najveći procenat pobeda"
              value={yearCard.core.form.winners.length ? `${Math.round(yearCard.core.form.maxRate * 100)}%` : "—"}
              label="pobeda"
              winners={yearCard.core.form.winners}
            />
            <Spotlight
              icon="🧱"
              title="Stub odbrane"
              subtitle="Najmanje primljenih golova po meču"
              value={yearCard.core.stub.winners.length ? String(yearCard.core.stub.minRate) : "—"}
              label="PG/meč"
              winners={yearCard.core.stub.winners}
            />
          </div>
        </section>
      ) : (
        <div className="empty">Nema dovoljno podataka za izabranu godinu.</div>
      )}

      <div className="monthsHead">
        <div className="monthsTitle">Meseci</div>
        <div className="monthsSub">Kako se sezona gradila kroz vreme.</div>
      </div>

      <div className="monthsGrid">
        {monthCards.map((c) => (
          <div key={`${c.period.year}-${c.period.month}`} className="month">
            <div className="monthTop">
              <div className="monthLabel">{monthLabelSR(c.period)}</div>
              <div className="monthCount">{c.matchCount} mečeva</div>
            </div>

            <div className="monthRows">
              <div className="row">
                <div className="rowIco">🥇⚽</div>
                <div className="rowW">
                  {c.core.goals.winners.slice(0, 2).map((w) => (
                    <WinnerMini key={w.id} w={w} />
                  ))}
                  {c.core.goals.winners.length > 2 ? <span className="more">+{c.core.goals.winners.length - 2}</span> : null}
                </div>
              </div>

              <div className="row">
                <div className="rowIco">🅰️</div>
                <div className="rowW">
                  {c.core.assists.winners.slice(0, 2).map((w) => (
                    <WinnerMini key={w.id} w={w} />
                  ))}
                  {c.core.assists.winners.length > 2 ? <span className="more">+{c.core.assists.winners.length - 2}</span> : null}
                </div>
              </div>

              <div className="row">
                <div className="rowIco">🏅</div>
                <div className="rowW">
                  {c.core.mvps.winners.slice(0, 2).map((w) => (
                    <WinnerMini key={w.id} w={w} />
                  ))}
                  {c.core.mvps.winners.length > 2 ? <span className="more">+{c.core.mvps.winners.length - 2}</span> : null}
                </div>
              </div>

              <div className="row">
                <div className="rowIco">🧱</div>
                <div className="rowW">
                  {c.core.stub.winners.slice(0, 2).map((w) => (
                    <WinnerMini key={w.id} w={w} />
                  ))}
                  {c.core.stub.winners.length > 2 ? <span className="more">+{c.core.stub.winners.length - 2}</span> : null}
                </div>
              </div>
            </div>

            <div className="monthFoot">Arhiva: mesec je poglavlje, godina je knjiga.</div>
          </div>
        ))}
      </div>

      <style>{`
        /* Ovo je isti CSS kao ranije + dodato: .pro */
        .page{ padding:20px; max-width:1200px; margin:0 auto; animation: fade 360ms ease-out both; }
        @keyframes fade{ from{opacity:0; transform: translateY(6px);} to{opacity:1; transform:none;} }

        .head{
          border-radius:22px;
          border:1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(900px 220px at 10% 0%, rgba(240,180,41,0.18), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 14px 36px rgba(0,0,0,0.06);
          padding:16px;
          display:flex;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          align-items:center;
        }
        .h1{ margin:0; font-weight:1000; letter-spacing:0.2px; }
        .sub{ margin-top:6px; opacity:0.78; font-weight:850; }

        .right{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .pillLink{
          text-decoration:none;
          font-weight: 950;
          color: inherit;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(10px);
        }
        .pillLink:hover{ text-decoration: underline; }

        .select{
          padding:10px 12px;
          border-radius:12px;
          border:1px solid rgba(0,0,0,0.14);
          font-weight:900;
          background:white;
          outline:none;
        }
        .select:focus{
          border-color: rgba(240,180,41,0.60);
          box-shadow: 0 0 0 4px rgba(240,180,41,0.16);
        }

        .hof{
          margin-top: 14px;
          border-radius:22px;
          border:1px solid rgba(240,180,41,0.28);
          background:
            radial-gradient(900px 260px at 12% 0%, rgba(240,180,41,0.22), transparent 55%),
            radial-gradient(900px 260px at 88% 0%, rgba(90,160,255,0.14), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 18px 50px rgba(0,0,0,0.08);
          padding: 16px;
        }

        .hofTop{ display:flex; justify-content:space-between; gap:14px; flex-wrap:wrap; align-items:flex-start; }
        .badges{ display:flex; gap:8px; flex-wrap:wrap; }
        .badge{
          display:inline-flex; align-items:center;
          padding:7px 10px; border-radius:999px;
          border:1px solid rgba(0,0,0,0.12);
          font-weight:950; font-size:12px;
          background: rgba(255,255,255,0.78);
        }
        .badge.gold{ border-color: rgba(240,180,41,0.55); background: rgba(255,250,230,0.90); }
        .badge.soft{ opacity:0.85; }

        .hofTitle{ margin-top:10px; font-weight:1000; font-size:18px; letter-spacing:0.2px; }
        .hofSub{ margin-top:6px; opacity:0.78; font-weight:850; }

        .hofNote{
          padding:10px 12px;
          border-radius:16px;
          border:1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.70);
          opacity:0.85;
          font-weight:850;
          max-width:360px;
          line-height:1.45;
          font-size:12.5px;
        }

        .dom{
          margin-top: 14px;
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.78);
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
          padding: 14px;
        }
        .domTop{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          align-items: flex-start;
        }
        .domTitle{ font-weight: 1000; letter-spacing: 0.2px; }
        .domSub{ margin-top:6px; opacity:0.78; font-weight: 850; }
        .domHint{
          max-width: 380px;
          opacity: 0.75;
          font-weight: 850;
          font-size: 12.5px;
          line-height: 1.45;
        }
        .domList{
          margin-top: 12px;
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .domRow{
          display:flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.72);
          padding: 10px;
        }
        .domBadge{
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(240,180,41,0.35);
          background: rgba(255,250,230,0.90);
          font-weight: 950;
          font-size: 12px;
          white-space: nowrap;
        }
        .domEmpty{ margin-top: 10px; opacity: 0.75; font-weight: 900; font-size: 13px; }

        /* ✅ Pro blok */
        .pro{
          margin-top: 14px;
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.78);
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
          padding: 14px;
        }
        .proTop{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          align-items: flex-start;
        }
        .proTitle{ font-weight: 1000; letter-spacing: 0.2px; }
        .proSub{ margin-top:6px; opacity:0.78; font-weight: 850; }
        .proHint{
          max-width: 420px;
          opacity: 0.75;
          font-weight: 850;
          font-size: 12.5px;
          line-height: 1.45;
        }
        .proGrid{
          margin-top: 12px;
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .grid{
          margin-top:14px;
          display:grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap:12px;
        }

        .spot{
          border-radius:18px;
          border:1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(700px 180px at 10% 0%, rgba(240,180,41,0.12), transparent 60%),
            radial-gradient(700px 180px at 90% 0%, rgba(90,160,255,0.08), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 14px 34px rgba(0,0,0,0.07);
          padding:14px;
        }

        .spotTop{ display:flex; gap:12px; align-items:center; justify-content:space-between; }
        .spotIco{
          width:42px; height:42px; border-radius:16px;
          display:grid; place-items:center;
          border:1px solid rgba(240,180,41,0.22);
          background: rgba(255,255,255,0.85);
          font-weight:1000;
        }
        .spotHead{ display:grid; gap:2px; }
        .spotTitle{ font-weight:1000; letter-spacing:0.2px; }
        .spotSub{ font-size:12.5px; opacity:0.78; font-weight:850; }
        .spotMetric{ text-align:right; min-width:88px; }
        .spotVal{ font-weight:1000; font-size:18px; }
        .spotLab{ font-size:12px; opacity:0.72; font-weight:900; }

        .spotW{
          margin-top:12px;
          padding-top:12px;
          border-top:1px solid rgba(0,0,0,0.06);
          display:grid;
          gap:10px;
        }

        .spotRow{ display:flex; gap:10px; align-items:center; }
        .spotRow img{
          width:54px; height:54px; border-radius:999px; object-fit:cover;
          border:1px solid rgba(0,0,0,0.10);
          background:white;
        }
        .spotText{ display:grid; gap:2px; }
        .spotName{ font-weight:950; text-decoration:none; color:inherit; }
        .spotName:hover{ text-decoration: underline; }
        .spotMeta{ font-size:12px; opacity:0.72; font-weight:850; }
        .spotFoot{ margin-top:12px; font-size:12px; opacity:0.70; font-weight:850; }

        .monthsHead{
          margin-top: 16px;
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:baseline;
          flex-wrap:wrap;
        }
        .monthsTitle{ font-weight:1000; font-size:16px; }
        .monthsSub{ opacity:0.75; font-weight:850; }

        .monthsGrid{
          margin-top:12px;
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap:12px;
        }

        .month{
          border-radius:18px;
          border:1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(700px 180px at 10% 0%, rgba(240,180,41,0.10), transparent 60%),
            radial-gradient(700px 180px at 90% 0%, rgba(90,160,255,0.07), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
          padding:14px;
        }

        .monthTop{ display:flex; justify-content:space-between; gap:10px; align-items:center; }
        .monthLabel{ font-weight:1000; }
        .monthCount{ opacity:0.75; font-weight:900; }

        .monthRows{ margin-top:12px; display:grid; gap:10px; }
        .row{
          border-radius:16px;
          border:1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.72);
          padding:10px;
          display:flex;
          gap:10px;
          align-items:flex-start;
        }
        .rowIco{ opacity:0.7; font-weight:1000; min-width: 40px; }
        .rowW{ display:grid; gap:8px; width:100%; }
        .more{ opacity:0.7; font-weight:900; font-size:12px; }

        .monthFoot{ margin-top:12px; font-size:12px; opacity:0.70; font-weight:850; }

        .wmini{ display:flex; align-items:center; gap:8px; }
        .wmini img{
          border-radius:999px; object-fit:cover;
          border:1px solid rgba(0,0,0,0.10);
          background:white;
          flex: 0 0 auto;
        }
        .wname{ font-weight:950; text-decoration:none; color:inherit; line-height:1.2; }
        .wname:hover{ text-decoration: underline; }
        .wextra{ margin-left:auto; opacity:0.75; font-weight:900; font-size:12px; }
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
          .grid{ grid-template-columns: 1fr; }
          .monthsGrid{ grid-template-columns: 1fr; }
          .domList{ grid-template-columns: 1fr; }
          .proGrid{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
