// lib/awards.ts
export type MatchRow = {
  id: string;
  date: string;
  home_score: number;
  away_score: number;
};

export type PlayerLite = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  is_public?: boolean | null;
};

export type EventRow = {
  match_id: string;
  player_id: string;
  type: "goal" | "assist" | "mvp";
  value: number | null;
  players: PlayerLite | null;
};

export type TeamRow = {
  match_id: string;
  team: "A" | "B";
  player_id: string | null;
  players: PlayerLite | null;
};

export type Winner = Omit<PlayerLite, "is_public"> & {
  value: number;
  extra?: string;
};

export type PlayerStats = Omit<PlayerLite, "is_public"> & {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  mvps: number;
};

// ✅ samo month + year
export type PeriodMode = "month" | "year";

export type PeriodKey =
  | { mode: "month"; year: string; month: string } // month: "01".."12"
  | { mode: "year"; year: string };

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

// ✅ label bez quarter-a
export function periodLabel(p: PeriodKey) {
  if (p.mode === "year") return `${p.year} • Godina`;
  return `${p.year} • ${p.month}`;
}

export function getWinnersByMax<T extends Winner>(arr: T[], getValue: (x: T) => number) {
  if (!arr.length) return { max: 0, winners: [] as T[] };

  const max = Math.max(...arr.map(getValue));
  const winners = arr
    .filter((x) => getValue(x) === max)
    .sort((a, b) => a.name.localeCompare(b.name, "sr"));

  return { max, winners };
}

function isPublic(p: PlayerLite | null | undefined) {
  if (!p) return false;
  if (p.is_public === false) return false;
  return true;
}

function lite(p: PlayerLite) {
  return { id: p.id, name: p.name, slug: p.slug ?? null, image_url: p.image_url ?? null };
}

// ✅ samo month/year filtriranje
export function matchIdsForPeriod(matches: MatchRow[], period: PeriodKey) {
  const ids: string[] = [];

  for (const m of matches) {
    const d = new Date(m.date);
    const y = String(d.getFullYear());
    const mo = pad2(d.getMonth() + 1);

    if (period.mode === "year") {
      if (y === period.year) ids.push(m.id);
    } else {
      if (y === period.year && mo === period.month) ids.push(m.id);
    }
  }

  return ids;
}

export function computePlayerStats(opts: {
  matches: MatchRow[];
  events: EventRow[];
  teams: TeamRow[];
  matchIds: Set<string>;
}) {
  const { matches, events, teams, matchIds } = opts;

  const matchById = new Map<string, MatchRow>();
  for (const m of matches) {
    if (matchIds.has(m.id)) matchById.set(m.id, m);
  }

  const acc = new Map<string, PlayerStats>();

  const ensure = (p: PlayerLite | null) => {
    if (!isPublic(p)) return null;
    const pp = p!;
    let cur = acc.get(pp.id);
    if (!cur) {
      const base = lite(pp);
      cur = {
        ...base,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals: 0,
        assists: 0,
        mvps: 0,
      };
      acc.set(pp.id, cur);
    }
    return cur;
  };

  // played + W/D/L
  for (const tr of teams) {
    if (!tr.player_id) continue;
    if (!matchIds.has(tr.match_id)) continue;

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

  // goals / assists / mvps
  for (const e of events) {
    if (!matchIds.has(e.match_id)) continue;

    const cur = ensure(e.players);
    if (!cur) continue;

    const v = Number(e.value ?? 1);
    if (e.type === "goal") cur.goals += v;
    if (e.type === "assist") cur.assists += v;
    if (e.type === "mvp") cur.mvps += 1;
  }

  return Array.from(acc.values());
}

export function computeAwards(opts: {
  matches: MatchRow[];
  events: EventRow[];
  teams: TeamRow[];
  matchIds: string[];
  minMatchesEff?: number;
  minMatchesForm?: number;
}) {
  const { matches, events, teams } = opts;
  const MIN_EFF = opts.minMatchesEff ?? 3;
  const MIN_FORM = opts.minMatchesForm ?? 3;

  const matchIdSet = new Set(opts.matchIds);

  // GOALS / ASSISTS / MVP (event-based)
  const goals = new Map<string, Winner>();
  const assists = new Map<string, Winner>();
  const mvps = new Map<string, Winner>();

  for (const e of events) {
    if (!matchIdSet.has(e.match_id)) continue;
    if (!isPublic(e.players)) continue;

    const base = lite(e.players!);
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

  const toWinners = (map: Map<string, Winner>) =>
    getWinnersByMax(Array.from(map.values()), (x) => x.value);

  const playerStats = computePlayerStats({ matches, events, teams, matchIds: matchIdSet });

  // Ironman
  const awardIronman = getWinnersByMax(
    playerStats.map((p) => ({ ...p, value: p.played, extra: `${p.played} meča` })),
    (x) => x.value
  );

  // G/A
  const awardGA = getWinnersByMax(
    playerStats.map((p) => ({
      ...p,
      value: p.goals + p.assists,
      extra: `${p.goals}G • ${p.assists}A`,
    })),
    (x) => x.value
  );

  // G/Match
  const awardGoalRate = getWinnersByMax(
    playerStats
      .filter((p) => p.played >= MIN_EFF)
      .map((p) => ({
        ...p,
        value: p.played ? p.goals / p.played : 0,
        extra: `${p.goals}G / ${p.played} meča`,
      })),
    (x) => x.value
  );

  // A/Match
  const awardAssistRate = getWinnersByMax(
    playerStats
      .filter((p) => p.played >= MIN_EFF)
      .map((p) => ({
        ...p,
        value: p.played ? p.assists / p.played : 0,
        extra: `${p.assists}A / ${p.played} meča`,
      })),
    (x) => x.value
  );

  // MVP/Match
  const awardMvpRate = getWinnersByMax(
    playerStats
      .filter((p) => p.played >= MIN_EFF)
      .map((p) => ({
        ...p,
        value: p.played ? p.mvps / p.played : 0,
        extra: `${p.mvps} MVP / ${p.played} meča`,
      })),
    (x) => x.value
  );

  // Best form (win rate)
  const matchById = new Map<string, MatchRow>();
  for (const m of matches) if (matchIdSet.has(m.id)) matchById.set(m.id, m);

  const accForm = new Map<string, { base: Winner; played: number; wins: number; draws: number; losses: number }>();

  for (const tr of teams) {
    if (!tr.player_id) continue;
    if (!matchIdSet.has(tr.match_id)) continue;
    if (!isPublic(tr.players)) continue;

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

    const base: Winner = { ...lite(tr.players!), value: 0 };

    const cur = accForm.get(tr.player_id) || { base, played: 0, wins: 0, draws: 0, losses: 0 };
    cur.played += 1;
    cur.wins += win;
    cur.draws += draw;
    cur.losses += loss;
    accForm.set(tr.player_id, cur);
  }

  const formCandidates = Array.from(accForm.values()).filter((x) => x.played >= MIN_FORM);
  let awardForm = { maxRate: 0, winners: [] as Winner[] };

  if (formCandidates.length) {
    const withRate = formCandidates.map((x) => ({
      ...x,
      rate: x.played ? x.wins / x.played : 0,
    }));
    const maxRate = Math.max(...withRate.map((x) => x.rate));
    const winners = withRate
      .filter((x) => x.rate === maxRate)
      .sort((a, b) => a.base.name.localeCompare(b.base.name, "sr"))
      .map((x) => ({
        ...x.base,
        value: x.rate,
        extra: `${pct(x.rate)} • ${x.wins}/${x.played} pobeda`,
      }));

    awardForm = { maxRate, winners };
  }

  // Least losses (min eff)
  const leastLossesList = playerStats
    .filter((p) => p.played >= MIN_EFF)
    .map((p) => ({
      ...p,
      value: p.losses,
      extra: `${p.losses} poraza • ${p.wins}-${p.draws}-${p.losses}`,
    }));

  const awardLeastLosses =
    leastLossesList.length === 0
      ? { min: 0, winners: [] as Winner[] }
      : (() => {
          const min = Math.min(...leastLossesList.map((x) => x.value));
          const winners = leastLossesList
            .filter((x) => x.value === min)
            .sort((a, b) => a.name.localeCompare(b.name, "sr"));
          return { min, winners };
        })();

  // ✅ STUB (least conceded goals) — min eff
  const concededAcc = new Map<string, { base: Winner; played: number; conceded: number }>();

  for (const tr of teams) {
    if (!tr.player_id) continue;
    if (!matchIdSet.has(tr.match_id)) continue;
    if (!isPublic(tr.players)) continue;

    const m = matchById.get(tr.match_id);
    if (!m) continue;

    const conceded = tr.team === "A" ? m.away_score : m.home_score;
    const base: Winner = { ...lite(tr.players!), value: 0 };

    const cur = concededAcc.get(tr.player_id) || { base, played: 0, conceded: 0 };
    cur.played += 1;
    cur.conceded += conceded;
    concededAcc.set(tr.player_id, cur);
  }

  const concededCandidates = Array.from(concededAcc.values()).filter((x) => x.played >= MIN_EFF);

  const awardStub =
    concededCandidates.length === 0
      ? { min: 0, winners: [] as Winner[] }
      : (() => {
          const min = Math.min(...concededCandidates.map((x) => x.conceded));
          const winners = concededCandidates
            .filter((x) => x.conceded === min)
            .sort((a, b) => a.base.name.localeCompare(b.base.name, "sr"))
            .map((x) => ({
              ...x.base,
              value: x.conceded,
              extra: `${x.conceded} primljenih • ${x.played} meča`,
            }));
          return { min, winners };
        })();

  return {
    goals: toWinners(goals),
    assists: toWinners(assists),
    mvps: toWinners(mvps),

    ironman: awardIronman,
    ga: awardGA,
    goalRate: awardGoalRate,
    assistRate: awardAssistRate,
    mvpRate: awardMvpRate,
    form: awardForm,
    leastLosses: awardLeastLosses,

    // ✅ new
    stub: awardStub,
  };
}

export function listYears(matches: MatchRow[]) {
  const set = new Set<string>();
  for (const m of matches) set.add(String(new Date(m.date).getFullYear()));
  return Array.from(set).sort((a, b) => Number(b) - Number(a));
}

// ✅ samo monthPeriods + yearPeriod
export function listPeriodsForYear(matches: MatchRow[], year: string) {
  const monthsSet = new Set<string>();

  for (const m of matches) {
    const d = new Date(m.date);
    const y = String(d.getFullYear());
    if (y !== year) continue;
    const mo = pad2(d.getMonth() + 1);
    monthsSet.add(mo);
  }

  const months = Array.from(monthsSet).sort(); // "01".."12"

  const monthPeriods: PeriodKey[] = months.map((m) => ({ mode: "month", year, month: m }));
  const yearPeriod: PeriodKey = { mode: "year", year };

  return { monthPeriods, yearPeriod };
}
