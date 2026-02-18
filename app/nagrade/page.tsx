"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MatchRow = {
  id: string;
  date: string;
  home_score: number;
  away_score: number;
};

type EventRow = {
  match_id: string;
  player_id: string;
  type: "goal" | "assist" | "mvp";
  value: number | null;
  players: {
    id: string;
    name: string;
    slug: string | null;
    image_url: string | null;
    is_public: boolean | null;
  } | null;
};

type TeamRow = {
  match_id: string;
  team: "A" | "B";
  player_id: string | null;
  players: {
    id: string;
    name: string;
    slug: string | null;
    image_url: string | null;
    is_public: boolean | null;
  } | null;
};

// ✅ samo MESEC i GODINA
type PeriodMode = "month" | "year";

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

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

// ✅ bez quarter parametra
function formatPeriodLabel(mode: PeriodMode, year: string, month: string) {
  const y = year === "all" ? "Sve godine" : year;

  if (mode === "year") return `${y} • Godina`;

  const m =
    month === "all"
      ? "Svi meseci"
      : MONTHS.find((x) => x.value === month)?.label || month;

  return `${y} • ${m}`;
}

type PlayerLite = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
};

type Winner = PlayerLite & {
  value: number;
  extra?: string;
};

type PlayerStats = PlayerLite & {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  mvps: number;
};

function getWinnersByMax<T extends Winner>(arr: T[], getValue: (x: T) => number) {
  if (!arr.length) return { max: 0, winners: [] as T[] };

  const max = Math.max(...arr.map(getValue));
  const winners = arr
    .filter((x) => getValue(x) === max)
    .sort((a, b) => a.name.localeCompare(b.name, "sr"));

  return { max, winners };
}

function WinnersList({ winners }: { winners: Winner[] }) {
  if (!winners.length) return <div className="empty-note">Nema podataka za izabrani period.</div>;

  return (
    <div className="winners">
      {winners.map((w) => (
        <div key={w.id} className="winner">
          <div className="avatar">
            <img src={w.image_url ?? "/player-images/placeholder.png"} alt={w.name} />
          </div>

          <div className="wtext">
            {w.slug ? (
              <Link href={`/igraci/${w.slug}`} className="wname">
                {w.name}
              </Link>
            ) : (
              <span className="wname">{w.name}</span>
            )}

            {w.extra ? <div className="wmeta">{w.extra}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NagradePage() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // UI period mode
  const [mode, setMode] = useState<PeriodMode>("month");

  // filteri
  const [year, setYear] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");

  // za “forma” nagradu
  const MIN_MATCHES_FOR_FORM = 3;

  // ✅ mali UX: kad prebaciš na GODINU, mesec nema smisla
  useEffect(() => {
    if (mode === "year") setMonth("all");
  }, [mode]);

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

        setMatches(mData || []);
        setEvents(eData || []);
        setTeams(tData || []);
      } catch (err) {
        console.error(err);
        setError("Greška pri učitavanju podataka za nagrade.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) set.add(String(new Date(m.date).getFullYear()));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [matches]);

  // ✅ filtriranje samo za MESEC / GODINA
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const d = new Date(m.date);
      const y = String(d.getFullYear());
      const mo = pad2(d.getMonth() + 1);

      if (year !== "all" && y !== year) return false;

      // GODINA = sve u toj godini
      if (mode === "year") return true;

      // MESEC
      if (month !== "all" && mo !== month) return false;
      return true;
    });
  }, [matches, year, month, mode]);

  const filteredMatchIds = useMemo(() => new Set(filteredMatches.map((m) => m.id)), [filteredMatches]);

  const filterLabel = useMemo(() => formatPeriodLabel(mode, year, month), [mode, year, month]);

  // ----- NAGRADE: GOALS / ASSISTS / MVP (svi pobednici na max)
  const awardsEvents = useMemo(() => {
    const goals = new Map<string, Winner>();
    const assists = new Map<string, Winner>();
    const mvps = new Map<string, Winner>();

    for (const e of events) {
      if (!filteredMatchIds.has(e.match_id)) continue;
      if (!e.players) continue;
      if (e.players.is_public === false) continue;

      const base: PlayerLite = {
        id: e.players.id,
        name: e.players.name,
        slug: e.players.slug,
        image_url: e.players.image_url,
      };

      const v = Number(e.value ?? 1);

      if (e.type === "goal") {
        const cur = goals.get(e.player_id) || { ...base, value: 0 };
        cur.value += v;
        goals.set(e.player_id, cur);
      }

      if (e.type === "assist") {
        const cur = assists.get(e.player_id) || { ...base, value: 0 };
        cur.value += v;
        assists.set(e.player_id, cur);
      }

      if (e.type === "mvp") {
        const cur = mvps.get(e.player_id) || { ...base, value: 0 };
        cur.value += 1;
        mvps.set(e.player_id, cur);
      }
    }

    const toWinners = (map: Map<string, Winner>) => {
      const arr = Array.from(map.values());
      if (!arr.length) return { max: 0, winners: [] as Winner[] };

      const max = Math.max(...arr.map((x) => x.value));
      const winners = arr
        .filter((x) => x.value === max)
        .sort((a, b) => a.name.localeCompare(b.name, "sr"));

      return { max, winners };
    };

    return {
      goals: toWinners(goals),
      assists: toWinners(assists),
      mvps: toWinners(mvps),
    };
  }, [events, filteredMatchIds]);

  // ----- NAGRADA: NAJBOLJA FORMA (win rate; svi pobednici na max)
  const awardForm = useMemo(() => {
    const matchById = new Map<string, MatchRow>();
    for (const m of filteredMatches) matchById.set(m.id, m);

    type Acc = PlayerLite & { played: number; wins: number; draws: number; losses: number };
    const acc = new Map<string, Acc>();

    for (const tr of teams) {
      if (!tr.player_id) continue;
      if (!filteredMatchIds.has(tr.match_id)) continue;
      if (!tr.players) continue;
      if (tr.players.is_public === false) continue;

      const m = matchById.get(tr.match_id);
      if (!m) continue;

      const a = m.home_score;
      const b = m.away_score;

      let win = 0,
        draw = 0,
        loss = 0;

      if (tr.team === "A") {
        if (a > b) win = 1;
        else if (a < b) loss = 1;
        else draw = 1;
      } else {
        if (b > a) win = 1;
        else if (b < a) loss = 1;
        else draw = 1;
      }

      const base: PlayerLite = {
        id: tr.players.id,
        name: tr.players.name,
        slug: tr.players.slug,
        image_url: tr.players.image_url,
      };

      const cur = acc.get(tr.player_id) || ({ ...base, played: 0, wins: 0, draws: 0, losses: 0 } as Acc);

      cur.played += 1;
      cur.wins += win;
      cur.draws += draw;
      cur.losses += loss;

      acc.set(tr.player_id, cur);
    }

    const arr = Array.from(acc.values()).filter((x) => x.played >= MIN_MATCHES_FOR_FORM);
    if (!arr.length) return { maxRate: 0, winners: [] as Winner[] };

    const withRate = arr.map((x) => ({
      ...x,
      rate: x.played ? x.wins / x.played : 0,
    }));

    const maxRate = Math.max(...withRate.map((x) => x.rate));

    const winners: Winner[] = withRate
      .filter((x) => x.rate === maxRate)
      .sort((a, b) => a.name.localeCompare(b.name, "sr"))
      .map((x) => ({
        id: x.id,
        name: x.name,
        slug: x.slug,
        image_url: x.image_url,
        value: x.rate,
        extra: `${pct(x.rate)} • ${x.wins}/${x.played} pobeda`,
      }));

    return { maxRate, winners };
  }, [teams, filteredMatches, filteredMatchIds]);

  // =========================
  //  PLAYER STATS (jedan izvor istine)
  // =========================
  const playerStats = useMemo(() => {
    const matchById = new Map<string, MatchRow>();
    for (const m of filteredMatches) matchById.set(m.id, m);

    const acc = new Map<string, PlayerStats>();

    const ensure = (p: TeamRow["players"] | EventRow["players"]) => {
      if (!p) return null;
      if (p.is_public === false) return null;

      let cur = acc.get(p.id);
      if (!cur) {
        cur = {
          id: p.id,
          name: p.name,
          slug: p.slug,
          image_url: p.image_url,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals: 0,
          assists: 0,
          mvps: 0,
        };
        acc.set(p.id, cur);
      }
      return cur;
    };

    // played + W/D/L iz timova
    for (const tr of teams) {
      if (!tr.player_id) continue;
      if (!filteredMatchIds.has(tr.match_id)) continue;
      if (!tr.players) continue;

      const cur = ensure(tr.players);
      if (!cur) continue;

      const m = matchById.get(tr.match_id);
      if (!m) continue;

      cur.played += 1;

      const a = m.home_score;
      const b = m.away_score;

      if (tr.team === "A") {
        if (a > b) cur.wins += 1;
        else if (a < b) cur.losses += 1;
        else cur.draws += 1;
      } else {
        if (b > a) cur.wins += 1;
        else if (b < a) cur.losses += 1;
        else cur.draws += 1;
      }
    }

    // goals / assists / mvps iz event-a
    for (const e of events) {
      if (!filteredMatchIds.has(e.match_id)) continue;
      if (!e.players) continue;

      const cur = ensure(e.players);
      if (!cur) continue;

      const v = Number(e.value ?? 1);

      if (e.type === "goal") cur.goals += v;
      if (e.type === "assist") cur.assists += v;
      if (e.type === "mvp") cur.mvps += 1;
    }

    return Array.from(acc.values());
  }, [teams, events, filteredMatches, filteredMatchIds]);

  // =========================
  //  NAGRade
  // =========================

  // 1) Ironman = najviše odigranih
  const awardIronman = useMemo(() => {
    const list: Winner[] = playerStats.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image_url: p.image_url,
      value: p.played,
      extra: `${p.played} meča`,
    }));
    return getWinnersByMax(list, (x) => x.value);
  }, [playerStats]);

  // 2) G/A = golovi + asistencije
  const awardGA = useMemo(() => {
    const list: Winner[] = playerStats.map((p) => {
      const ga = p.goals + p.assists;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        value: ga,
        extra: `${p.goals}G • ${p.assists}A`,
      };
    });
    return getWinnersByMax(list, (x) => x.value);
  }, [playerStats]);

  // 3) Efikasnost: golovi po meču (min 3 meča)
  const MIN_MATCHES_FOR_EFF = 3;
  const awardGoalRate = useMemo(() => {
    const list: Winner[] = playerStats
      .filter((p) => p.played >= MIN_MATCHES_FOR_EFF)
      .map((p) => {
        const rate = p.played ? p.goals / p.played : 0;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          image_url: p.image_url,
          value: rate,
          extra: `${p.goals}G / ${p.played} meča`,
        };
      });

    return getWinnersByMax(list, (x) => x.value);
  }, [playerStats]);

  // 4) Asistencije po meču (min 3 meča)
  const awardAssistRate = useMemo(() => {
    const list: Winner[] = playerStats
      .filter((p) => p.played >= MIN_MATCHES_FOR_EFF)
      .map((p) => {
        const rate = p.played ? p.assists / p.played : 0;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          image_url: p.image_url,
          value: rate,
          extra: `${p.assists}A / ${p.played} meča`,
        };
      });

    return getWinnersByMax(list, (x) => x.value);
  }, [playerStats]);

  // 5) MVP/Meč (min 3 meča)
  const awardMvpRate = useMemo(() => {
    const list: Winner[] = playerStats
      .filter((p) => p.played >= MIN_MATCHES_FOR_EFF)
      .map((p) => {
        const rate = p.played ? p.mvps / p.played : 0;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          image_url: p.image_url,
          value: rate,
          extra: `${p.mvps} MVP / ${p.played} meča`,
        };
      });

    return getWinnersByMax(list, (x) => x.value);
  }, [playerStats]);

  // 6) Najmanje poraza (min 3 meča)
  const awardLeastLosses = useMemo(() => {
    const list = playerStats
      .filter((p) => p.played >= MIN_MATCHES_FOR_EFF)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        value: p.losses,
        extra: `${p.losses} poraza • ${p.wins}-${p.draws}-${p.losses}`,
      }));

    if (!list.length) return { min: 0, winners: [] as Winner[] };

    const min = Math.min(...list.map((x) => x.value));
    const winners = list
      .filter((x) => x.value === min)
      .sort((a, b) => a.name.localeCompare(b.name, "sr"));

    return { min, winners };
  }, [playerStats]);

  if (loading) return <p style={{ padding: 20 }}>Učitavanje nagrada...</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div className="awards-page" style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div className="page-head">
        <h1 className="page-title">Nagrade</h1>
        <div className="page-sub">
          Automatske nagrade za izabrani period. Ako postoji izjednačenje — nagradu dele svi pobednici.
        </div>

        <div className="period-bar">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${mode === "month" ? "active" : ""}`}
              onClick={() => setMode("month")}
            >
              MESEC
            </button>

            {/* ✅ uklonjen KVARTAL */}

            <button
              type="button"
              className={`tab ${mode === "year" ? "active" : ""}`}
              onClick={() => setMode("year")}
            >
              GODINA
            </button>
          </div>

          <div className="active-pill">
            Aktivno: <strong>{filterLabel}</strong>
          </div>
          <div className="actions">
  <Link className="action-link" href="/nagrade/istorija">
    Pregled dosadašnjih pobednika →
  </Link>
</div>

        </div>
      </div>

      <div className="layout">
        {/* LEVO: KARTICE NAGRADA */}
        <div className="left">
          {filteredMatches.length === 0 ? (
            <div className="panel panel-soft">Nema mečeva za izabrani period.</div>
          ) : (
            <div className="cards">
              {/* 1) Zlatna kopačka */}
              <div className="card">
                <div className="card-top">
                  <div className="badge badge-img" aria-label="Zlatna kopačka">
                    <img src="/awards/golden_shoe.png" alt="Zlatna kopačka" />
                  </div>
                  <div>
                    <div className="card-title">Zlatna kopačka</div>
                    <div className="card-sub">Najviše golova</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">{awardsEvents.goals.winners.length ? awardsEvents.goals.max : "—"}</div>
                    <div className="metric-lab">golova</div>
                  </div>
                </div>
                <WinnersList winners={awardsEvents.goals.winners} />
                <div className="card-foot">Pobednici su svi igrači sa maksimalnim brojem golova.</div>
              </div>

              {/* 3) G/A */}
              <div className="card">
                <div className="card-top">
                  <div className="badge">⚡</div>
                  <div>
                    <div className="card-title">Učešće u golovima (G/A)</div>
                    <div className="card-sub">Golovi + asistencije</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">{awardGA.winners.length ? awardGA.max : "—"}</div>
                    <div className="metric-lab">G/A</div>
                  </div>
                </div>
                <WinnersList winners={awardGA.winners} />
                <div className="card-foot">G/A = golovi + asistencije u periodu (računa se iz event-a).</div>
              </div>

              {/* 4) Asist kralj */}
              <div className="card">
                <div className="card-top">
                  <div className="badge">🅰️</div>
                  <div>
                    <div className="card-title">Asist kralj</div>
                    <div className="card-sub">Najviše asistencija</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">
                      {awardsEvents.assists.winners.length ? awardsEvents.assists.max : "—"}
                    </div>
                    <div className="metric-lab">asist.</div>
                  </div>
                </div>
                <WinnersList winners={awardsEvents.assists.winners} />
                <div className="card-foot">Pobednici su svi igrači sa maksimalnim brojem asistencija.</div>
              </div>

              {/* 5) Efikasnost (golovi/meč) */}
              <div className="card">
                <div className="card-top">
                  <div className="badge">🎯</div>
                  <div>
                    <div className="card-title">Efikasnost (G/Meč)</div>
                    <div className="card-sub">Najviše golova po meču • min {MIN_MATCHES_FOR_EFF} meča</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">{awardGoalRate.winners.length ? awardGoalRate.max.toFixed(2) : "—"}</div>
                    <div className="metric-lab">G/meč</div>
                  </div>
                </div>
                <WinnersList winners={awardGoalRate.winners} />
                <div className="card-foot">G/Meč = golovi / odigrani mečevi u periodu.</div>
              </div>

              {/* 6) Asist/Meč */}
              <div className="card">
                <div className="card-top">
                  <div className="badge">🧠</div>
                  <div>
                    <div className="card-title">Kreator (A/Meč)</div>
                    <div className="card-sub">Najviše asistencija po meču • min {MIN_MATCHES_FOR_EFF} meča</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">
                      {awardAssistRate.winners.length ? awardAssistRate.max.toFixed(2) : "—"}
                    </div>
                    <div className="metric-lab">A/meč</div>
                  </div>
                </div>
                <WinnersList winners={awardAssistRate.winners} />
                <div className="card-foot">A/Meč = asistencije / odigrani mečevi u periodu.</div>
              </div>

              {/* 7) MVP priznanja */}
              <div className="card">
                <div className="card-top">
                  <div className="badge">🏅</div>
                  <div>
                    <div className="card-title">MVP perioda</div>
                    <div className="card-sub">Najviše MVP priznanja</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">{awardsEvents.mvps.winners.length ? awardsEvents.mvps.max : "—"}</div>
                    <div className="metric-lab">MVP</div>
                  </div>
                </div>
                <WinnersList winners={awardsEvents.mvps.winners} />
                <div className="card-foot">MVP se računa kao broj MVP event-a u periodu.</div>
              </div>

              {/* 8) Uticaj (MVP/Meč) */}
              <div className="card">
                <div className="card-top">
                  <div className="badge">👑</div>
                  <div>
                    <div className="card-title">Uticaj (MVP/Meč)</div>
                    <div className="card-sub">Najviše MVP po meču • min {MIN_MATCHES_FOR_EFF} meča</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">{awardMvpRate.winners.length ? awardMvpRate.max.toFixed(2) : "—"}</div>
                    <div className="metric-lab">MVP/meč</div>
                  </div>
                </div>
                <WinnersList winners={awardMvpRate.winners} />
                <div className="card-foot">MVP/Meč = broj MVP / odigrani mečevi u periodu.</div>
              </div>

              {/* 2) Ironman */}
              <div className="card">
                <div className="card-top">
                  <div className="badge">🛡️</div>
                  <div>
                    <div className="card-title">Pouzdanost (Ironman)</div>
                    <div className="card-sub">Najviše odigranih mečeva</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">{awardIronman.winners.length ? awardIronman.max : "—"}</div>
                    <div className="metric-lab">meča</div>
                  </div>
                </div>
                <WinnersList winners={awardIronman.winners} />
                <div className="card-foot">Pouzdanost = broj pojavljivanja u timu u izabranom periodu.</div>
              </div>

              {/* 9) Najbolja forma */}
              <div className="card">
                <div className="card-top">
                  <div className="badge">🔥</div>
                  <div>
                    <div className="card-title">Najbolja forma</div>
                    <div className="card-sub">Najveći procenat pobeda • min {MIN_MATCHES_FOR_FORM} meča</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">{awardForm.winners.length ? pct(awardForm.maxRate) : "—"}</div>
                    <div className="metric-lab">pobeda</div>
                  </div>
                </div>
                <WinnersList winners={awardForm.winners} />
                <div className="card-foot">Forma = pobede / odigrani mečevi u periodu.</div>
              </div>

              {/* 10) Najmanje poraza */}
              <div className="card">
                <div className="card-top">
                  <div className="badge">🧱</div>
                  <div>
                    <div className="card-title">Ne gubi (Najmanje poraza)</div>
                    <div className="card-sub">Najmanje poraza • min {MIN_MATCHES_FOR_EFF} meča</div>
                  </div>
                  <div className="metric">
                    <div className="metric-val">{awardLeastLosses.winners.length ? awardLeastLosses.min : "—"}</div>
                    <div className="metric-lab">poraza</div>
                  </div>
                </div>
                <WinnersList winners={awardLeastLosses.winners} />
                <div className="card-foot">Rangira se po najmanjem broju poraza u periodu.</div>
              </div>
            </div>
          )}
        </div>

        {/* DESNO: FILTER */}
        <div className="right">
          <div className="panel sticky">
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

              {mode === "month" && (
                <label className="field">
                  <span className="label">Mesec</span>
                  <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
                    <option value="all">Svi meseci</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="hint">Savet: Godina je super kad imaš malo mečeva — izbegneš “prazne” nagrade.</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .awards-page{ animation: pageFade 360ms ease-out both; }
        @keyframes pageFade{ from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }

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
        .page-title{ margin:0; font-weight:1000; letter-spacing:0.2px; }
        .page-sub{
          margin-top: 8px;
          opacity: 0.78;
          line-height: 1.55;
          max-width: 920px;
          font-size: 13.5px;
        }

        .period-bar{
          margin-top: 12px;
          display:flex;
          gap: 10px;
          align-items:center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .tabs{ display:flex; gap: 8px; flex-wrap: wrap; }

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

        .active-pill{
          font-size: 15px;
          font-weight: 900;
          opacity: 0.9;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(10px);
        }

        .layout{
          display:grid;
          grid-template-columns: 1fr 300px;
          gap: 16px;
          align-items:start;
        }

        .panel{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 14px;
          background: white;
          box-shadow: 0 12px 30px rgba(0,0,0,0.05);
        }
        .panel-soft{ background: rgba(255,255,255,0.8); }
        .panel-title{ font-weight:1000; margin-bottom:10px; letter-spacing:0.2px; }

        .sticky{ position: sticky; top: 12px; }

        .form{ display:grid; gap: 10px; }
        .field{ display:grid; gap: 6px; }
        .label{ font-size: 13px; opacity: 0.8; font-weight: 850; }

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

        .hint{
          margin-top: 4px;
          font-size: 12px;
          opacity: 0.70;
          line-height: 1.55;
        }

        .cards{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .card{
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(700px 180px at 10% 0%, rgba(240,180,41,0.10), transparent 60%),
            radial-gradient(700px 180px at 90% 0%, rgba(90,160,255,0.07), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
          padding: 14px;
          overflow:hidden;
        }

        .card-top{
          display:flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }

        .badge{
          width: 40px;
          height: 40px;
          border-radius: 14px;
          display:grid;
          place-items:center;
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(255,255,255,0.85);
          font-size: 18px;
          font-weight: 1000;
          flex: 0 0 auto;
        }

        .badge.badge-img{ padding: 6px; }
        .badge.badge-img img{
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 6px 10px rgba(0,0,0,0.18));
        }

        .card-title{ font-weight:1000; letter-spacing:0.2px; }
        .card-sub{
          margin-top:4px;
          font-size: 12.5px;
          opacity: 0.78;
          font-weight: 850;
          line-height: 1.35;
        }

        .metric{
          text-align:right;
          min-width: 88px;
          padding-left: 6px;
        }
        .metric-val{ font-weight:1000; font-size:18px; letter-spacing:0.2px; }
        .metric-lab{ font-size:12px; opacity:0.72; font-weight:900; }

        .winners{
          display:grid;
          gap: 10px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }

        .winner{ display:flex; gap:10px; align-items:center; }
        .avatar{
          width: 50px;
          height: 50px;
          border-radius: 999px;
          overflow:hidden;
          border: 1px solid rgba(0,0,0,0.10);
          background: white;
          flex: 0 0 auto;
        }
        .avatar img{ width:100%; height:100%; object-fit:cover; display:block; }

        .wtext{ display:grid; gap: 2px; }
        .wname{ font-weight: 950; text-decoration:none; color:inherit; }
        .wname:hover{ text-decoration: underline; }
        .wmeta{ font-size: 12px; opacity: 0.72; font-weight: 850; }

        .card-foot{
          margin-top: 12px;
          font-size: 12px;
          opacity: 0.70;
          line-height: 1.55;
        }

        .empty-note{
          opacity: 0.75;
          line-height: 1.5;
          font-size: 13px;
          padding-top: 10px;
          border-top: 1px solid rgba(0,0,0,0.06);
          margin-top: 12px;
        }

        @media (max-width: 980px){
          .layout{ grid-template-columns: 1fr; }
          .sticky{ position: static; }
          .cards{ grid-template-columns: 1fr; }
        }
          .actions{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

.action-link{
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.12);
  background: rgba(255,255,255,0.85);
  font-weight: 950;
  text-decoration: none;
  color: inherit;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}
.action-link:hover{
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(0,0,0,0.06);
  border-color: rgba(90,160,255,0.35);
}

      `}</style>
    </div>
  );
}
