"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MatchEditorProps = {
  mode: "create" | "edit";
  matchId?: string;
};

type Player = {
  id: string;
  name: string;
};

type MatchEvent = {
  player_id: string;
  type: "goal" | "assist" | "mvp";
  value: number;
};

type MatchEditorState = {
  date: string; // "YYYY-MM-DD"
  result: { home: number; away: number };
  teams: { A: string[]; B: string[] };
  goals: { playerId: string; value: number }[];
  assists: { playerId: string; value: number }[];
  mvp: string | null;
  column: { title: string; content: string; author: string };
};

const TEAM_A = "EKIPA MARKERI";
const TEAM_B = "EKIPA ŠARENI";
const TEAM_LIMIT = 5;

const EMPTY_STATE: MatchEditorState = {
  date: "",
  result: { home: 0, away: 0 },
  teams: { A: [], B: [] },
  goals: [],
  assists: [],
  mvp: null,
  column: { title: "", content: "", author: "Miljan" },
};

function formatDateSr(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function MatchEditor({ mode, matchId }: MatchEditorProps) {
  const router = useRouter();

  const [state, setState] = useState<MatchEditorState>(EMPTY_STATE);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============
  // LOAD PLAYERS
  // ============
  useEffect(() => {
    supabase
      .from("players")
      .select("id, name")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setError("Greška pri učitavanju igrača");
        } else {
          setPlayers(data || []);
        }
      });
  }, []);

  // ============
  // LOAD MATCH (EDIT MODE)
  // ============
  useEffect(() => {
    if (mode !== "edit" || !matchId) return;

    const load = async () => {
      try {
        const [
          { data: match, error: matchError },
          { data: teams, error: teamsError },
          { data: events, error: eventsError },
          { data: column, error: columnError },
        ] = await Promise.all([
          supabase.from("matches").select("*").eq("id", matchId).single(),
          supabase.from("match_teams").select("*").eq("match_id", matchId),
          supabase.from("match_events").select("*").eq("match_id", matchId),
          supabase.from("match_columns").select("*").eq("match_id", matchId).maybeSingle(),
        ]);

        if (matchError) throw matchError;
        if (teamsError) throw teamsError;
        if (eventsError) throw eventsError;
        if (columnError) throw columnError;

        if (!match) {
          setError("Utakmica nije pronađena");
          setLoading(false);
          return;
        }

        const ev = (events || []) as MatchEvent[];

        setState({
          date: String(match.date).slice(0, 10),
          result: { home: match.home_score, away: match.away_score },
          teams: {
            A: teams?.filter((t) => t.team === "A").map((t) => t.player_id) || [],
            B: teams?.filter((t) => t.team === "B").map((t) => t.player_id) || [],
          },
          goals: ev.filter((e) => e.type === "goal").map((e) => ({ playerId: e.player_id, value: e.value })),
          assists: ev.filter((e) => e.type === "assist").map((e) => ({ playerId: e.player_id, value: e.value })),
          mvp: ev.find((e) => e.type === "mvp")?.player_id || null,
          column: column
            ? { title: column.title, content: column.content, author: column.author }
            : EMPTY_STATE.column,
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Greška pri učitavanju utakmice");
        setLoading(false);
      }
    };

    load();
  }, [mode, matchId]);

  // ============
  // BASIC HELPERS
  // ============
  const setDate = (value: string) => setState((prev) => ({ ...prev, date: value }));

  const setScore = (side: "home" | "away", value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    setState((prev) => ({ ...prev, result: { ...prev.result, [side]: safe } }));
  };

  // ============
  // TEAMS HELPERS
  // ============
  const isInTeam = (team: "A" | "B", playerId: string) => state.teams[team].includes(playerId);

  const removeFromGoalsAssistsIfNeeded = (playerId: string, nextTeams: { A: string[]; B: string[] }) => {
    const stillInMatch = nextTeams.A.includes(playerId) || nextTeams.B.includes(playerId);

    if (!stillInMatch) {
      setState((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.playerId !== playerId),
        assists: prev.assists.filter((a) => a.playerId !== playerId),
        mvp: prev.mvp === playerId ? null : prev.mvp,
        teams: nextTeams,
      }));
    } else {
      setState((prev) => ({ ...prev, teams: nextTeams }));
    }
  };

  const toggleTeam = (team: "A" | "B", playerId: string) => {
    const other: "A" | "B" = team === "A" ? "B" : "A";

    const inThis = state.teams[team].includes(playerId);
    const inOther = state.teams[other].includes(playerId);

    if (!inThis && state.teams[team].length >= TEAM_LIMIT) {
      alert(`U ${team === "A" ? TEAM_A : TEAM_B} može najviše ${TEAM_LIMIT} igrača.`);
      return;
    }

    const nextTeamArr = inThis ? state.teams[team].filter((id) => id !== playerId) : [...state.teams[team], playerId];
    const nextOtherArr = inOther ? state.teams[other].filter((id) => id !== playerId) : state.teams[other];

    const nextTeams = team === "A" ? { A: nextTeamArr, B: nextOtherArr } : { A: nextOtherArr, B: nextTeamArr };

    removeFromGoalsAssistsIfNeeded(playerId, nextTeams);
  };

  // ============
  // ELIGIBLE PLAYERS
  // ============
  const eligiblePlayerIds = useMemo(() => Array.from(new Set([...state.teams.A, ...state.teams.B])), [state.teams.A, state.teams.B]);

  const eligiblePlayers = useMemo(() => {
    return eligiblePlayerIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  }, [eligiblePlayerIds, players]);

  const teamNameOf = (playerId: string) => {
    if (state.teams.A.includes(playerId)) return "A";
    if (state.teams.B.includes(playerId)) return "B";
    return null;
  };

  // ============
  // MVP
  // ============
  const setMvp = (playerId: string) => setState((prev) => ({ ...prev, mvp: playerId || null }));

  // ============
  // GOALS / ASSISTS
  // ============
  const clampPositiveInt = (n: number) => (!Number.isFinite(n) ? 1 : Math.max(1, Math.floor(n)));

  const updateGoal = (index: number, patch: Partial<{ playerId: string; value: number }>) => {
    setState((prev) => {
      const next = [...prev.goals];
      next[index] = { ...next[index], ...patch };
      return { ...prev, goals: next };
    });
  };

  const addGoal = () => {
    const first = eligiblePlayers[0]?.id ?? "";
    if (!first) return alert("Prvo izaberi ekipe.");
    setState((prev) => ({ ...prev, goals: [...prev.goals, { playerId: first, value: 1 }] }));
  };

  const removeGoal = (index: number) => setState((prev) => ({ ...prev, goals: prev.goals.filter((_, i) => i !== index) }));

  const updateAssist = (index: number, patch: Partial<{ playerId: string; value: number }>) => {
    setState((prev) => {
      const next = [...prev.assists];
      next[index] = { ...next[index], ...patch };
      return { ...prev, assists: next };
    });
  };

  const addAssist = () => {
    const first = eligiblePlayers[0]?.id ?? "";
    if (!first) return alert("Prvo izaberi ekipe.");
    setState((prev) => ({ ...prev, assists: [...prev.assists, { playerId: first, value: 1 }] }));
  };

  const removeAssist = (index: number) => setState((prev) => ({ ...prev, assists: prev.assists.filter((_, i) => i !== index) }));

  // ============
  // MILJANOV UGAO
  // ============
  const setColumn = (patch: Partial<MatchEditorState["column"]>) =>
    setState((prev) => ({ ...prev, column: { ...prev.column, ...patch } }));

  // ============
  // SAVE HELPERS
  // ============
  const normalizeDateForDb = (dateStr: string) => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return `${dateStr}T12:00:00`;
    return dateStr;
  };

  const hasReport = () => {
    const title = state.column.title.trim();
    const content = state.column.content.trim();
    return title.length > 0 || content.length > 0;
  };

  const validateBeforeSave = () => {
    if (!state.date) return "Datum je obavezan.";

    if (state.teams.A.length !== TEAM_LIMIT || state.teams.B.length !== TEAM_LIMIT) {
      return `Svaka ekipa mora imati tačno ${TEAM_LIMIT} igrača.`;
    }

    const eligibleIds = new Set([...state.teams.A, ...state.teams.B]);

    if (state.mvp && !eligibleIds.has(state.mvp)) return "MVP mora biti igrač iz jedne od ekipa.";

    for (const g of state.goals) {
      if (!eligibleIds.has(g.playerId)) return "Svi strelci moraju biti iz jedne od ekipa.";
      if (!Number.isFinite(g.value) || g.value < 1) return "Golovi moraju biti najmanje 1.";
    }

    for (const a of state.assists) {
      if (!eligibleIds.has(a.playerId)) return "Svi asistenti moraju biti iz jedne od ekipa.";
      if (!Number.isFinite(a.value) || a.value < 1) return "Asistencije moraju biti najmanje 1.";
    }

    return null;
  };

  const buildTeamRows = (mId: string) => [
    ...state.teams.A.map((player_id) => ({ match_id: mId, team: "A", player_id })),
    ...state.teams.B.map((player_id) => ({ match_id: mId, team: "B", player_id })),
  ];

  const buildEventRows = (mId: string) => {
    const rows: { match_id: string; player_id: string; type: "goal" | "assist" | "mvp"; value?: number }[] = [];

    for (const g of state.goals) rows.push({ match_id: mId, player_id: g.playerId, type: "goal", value: g.value });
    for (const a of state.assists) rows.push({ match_id: mId, player_id: a.playerId, type: "assist", value: a.value });
    if (state.mvp) rows.push({ match_id: mId, player_id: state.mvp, type: "mvp", value: 1 });

    return rows;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateBeforeSave();
    if (validationError) return alert(validationError);

    setSaving(true);
    setError(null);

    try {
      const dateForDb = normalizeDateForDb(state.date);
      let id = matchId;

      // 1) matches
      if (mode === "create") {
        const { data: match, error: matchError } = await supabase
          .from("matches")
          .insert({ date: dateForDb, home_score: state.result.home, away_score: state.result.away })
          .select("*")
          .single();

        if (matchError || !match) throw matchError || new Error("Nije moguće kreirati meč.");
        id = match.id;
      } else {
        if (!id) throw new Error("Nedostaje matchId za edit.");

        const { error: updError } = await supabase
          .from("matches")
          .update({ date: dateForDb, home_score: state.result.home, away_score: state.result.away })
          .eq("id", id);

        if (updError) throw updError;
      }

      if (!id) throw new Error("Nedostaje matchId posle snimanja.");

      // 2) teams
      if (mode === "edit") {
        const { error: delTeamsErr } = await supabase.from("match_teams").delete().eq("match_id", id);
        if (delTeamsErr) throw delTeamsErr;
      }
      const teamRows = buildTeamRows(id);
      const { error: insTeamsErr } = await supabase.from("match_teams").insert(teamRows);
      if (insTeamsErr) throw insTeamsErr;

      // 3) events
      if (mode === "edit") {
        const { error: delEventsErr } = await supabase.from("match_events").delete().eq("match_id", id);
        if (delEventsErr) throw delEventsErr;
      }
      const eventRows = buildEventRows(id);
      if (eventRows.length > 0) {
        const { error: insEventsErr } = await supabase.from("match_events").insert(eventRows);
        if (insEventsErr) throw insEventsErr;
      }

      // 4) column
      if (hasReport()) {
        const payload = {
          match_id: id,
          title: state.column.title.trim() || "Miljanov ugao",
          content: state.column.content.trim(),
          author: state.column.author.trim() || "Miljan",
        };

        const { error: upsertErr } = await supabase.from("match_columns").upsert(payload, { onConflict: "match_id" });
        if (upsertErr) throw upsertErr;
      } else {
        const { error: delColErr } = await supabase.from("match_columns").delete().eq("match_id", id);
        if (delColErr) throw delColErr;
      }

      alert(mode === "create" ? "Utakmica uspešno sačuvana ✅" : "Utakmica uspešno izmenjena ✅");
      router.push("/admin/utakmice");
    } catch (err) {
      console.error(err);
      setError("Greška pri snimanju. Proveri konzolu za detalje.");
    } finally {
      setSaving(false);
    }
  };

  // ============
  // UI HELPERS
  // ============
  const title = mode === "create" ? "Nova utakmica" : "Izmena utakmice";
  const sub = mode === "create" ? "Kreiraj meč, unesi ekipe i događaje." : `Meč #${matchId ?? "—"} • ${formatDateSr(state.date)}`;

  const teamASelected = useMemo(() => state.teams.A.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean) as string[], [state.teams.A, players]);
  const teamBSelected = useMemo(() => state.teams.B.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean) as string[], [state.teams.B, players]);

  if (loading) return <p style={{ padding: 20 }}>Učitavanje...</p>;

  return (
    <div className="admin-wrap" style={{ padding: 20 }}>
      <form onSubmit={handleSave} className="editor">
        {/* TOP */}
        <div className="top">
          <div>
            <h1 className="h1">{title}</h1>
            <div className="sub">{sub}</div>
          </div>

          <div className="top-actions">
            <button type="button" className="btn ghost" disabled={saving} onClick={() => router.push("/admin/utakmice")}>
              Otkaži
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Čuvam..." : "Sačuvaj"}
            </button>
          </div>
        </div>

        {/* HERO: rezultat */}
        <section className="hero">
          <div className="hero-left">
            <div className="hero-label">Osnovno</div>

            <div className="hero-grid">
              <label className="field">
                <span className="flabel">Datum</span>
                <input type="date" value={state.date} onChange={(e) => setDate(e.target.value)} />
              </label>

              <div className="score">
                <div className="score-team a">
                  <span className="dot a" />
                  {TEAM_A}
                </div>

                <div className="scorebox">
                  <input
                    type="number"
                    min={0}
                    value={state.result.home}
                    onChange={(e) => setScore("home", Number(e.target.value))}
                    className="scorein"
                  />
                  <span className="colon">:</span>
                  <input
                    type="number"
                    min={0}
                    value={state.result.away}
                    onChange={(e) => setScore("away", Number(e.target.value))}
                    className="scorein"
                  />
                </div>

                <div className="score-team b">
                  <span className="dot b" />
                  {TEAM_B}
                </div>
              </div>
            </div>

            <div className="micro">
              Pravila: igrač ne može biti u obe ekipe. Tačno {TEAM_LIMIT} po ekipi.
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-label">Brzi pregled</div>

            <div className="summary">
              <div className="sum-row">
                <div className="sum-k">{TEAM_A}</div>
                <div className="sum-v">{state.teams.A.length}/{TEAM_LIMIT}</div>
              </div>
              <div className="sum-row">
                <div className="sum-k">{TEAM_B}</div>
                <div className="sum-v">{state.teams.B.length}/{TEAM_LIMIT}</div>
              </div>
              <div className="sum-row">
                <div className="sum-k">MVP</div>
                <div className="sum-v">
                  {state.mvp ? (players.find((p) => p.id === state.mvp)?.name ?? "—") : "—"}
                </div>
              </div>
              <div className="sum-row">
                <div className="sum-k">Izveštaj</div>
                <div className="sum-v">{hasReport() ? "DA" : "NE"}</div>
              </div>

              <div className="pill-row">
                <span className={`pill ${state.teams.A.length === TEAM_LIMIT ? "ok" : ""}`}>A: {teamASelected.join(", ") || "—"}</span>
                <span className={`pill ${state.teams.B.length === TEAM_LIMIT ? "ok" : ""}`}>B: {teamBSelected.join(", ") || "—"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN GRID */}
        <div className="grid">
          {/* TEAMS */}
          <section className="panel">
            <div className="phead">
              <h2 className="ptitle">Sastavi ekipa</h2>
              <div className="psub">Klikni čekboks. Maks {TEAM_LIMIT} po ekipi.</div>
            </div>

            <div className="teams">
              <div className="tcard">
                <div className="thead">
                  <div className="tname">
                    <span className="dot a" />
                    {TEAM_A}
                  </div>
                  <div className={`count ${state.teams.A.length === TEAM_LIMIT ? "ok" : ""}`}>
                    {state.teams.A.length}/{TEAM_LIMIT}
                  </div>
                </div>

                <div className="plist">
                  {players.map((p) => (
                    <label key={p.id} className={`pick ${isInTeam("A", p.id) ? "on" : ""}`}>
                      <input type="checkbox" checked={isInTeam("A", p.id)} onChange={() => toggleTeam("A", p.id)} />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="tcard">
                <div className="thead">
                  <div className="tname">
                    <span className="dot b" />
                    {TEAM_B}
                  </div>
                  <div className={`count ${state.teams.B.length === TEAM_LIMIT ? "ok" : ""}`}>
                    {state.teams.B.length}/{TEAM_LIMIT}
                  </div>
                </div>

                <div className="plist">
                  {players.map((p) => (
                    <label key={p.id} className={`pick ${isInTeam("B", p.id) ? "on" : ""}`}>
                      <input type="checkbox" checked={isInTeam("B", p.id)} onChange={() => toggleTeam("B", p.id)} />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: MVP + EVENTS */}
          <div className="right">
            {/* MVP */}
            <section className="panel">
              <div className="phead">
                <h2 className="ptitle">MVP</h2>
                <div className="psub">Mora biti iz ekipa.</div>
              </div>

              {eligiblePlayers.length === 0 ? (
                <div className="empty">Prvo izaberi igrače u ekipe.</div>
              ) : (
                <label className="field">
                  <span className="flabel">Izaberi MVP</span>
                  <select value={state.mvp ?? ""} onChange={(e) => setMvp(e.target.value)}>
                    <option value="">-- bez MVP-a --</option>
                    {eligiblePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {teamNameOf(p.id) ? `(${teamNameOf(p.id)})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            {/* GOALS */}
            <section className="panel">
              <div className="phead row">
                <div>
                  <h2 className="ptitle">Strelci</h2>
                  <div className="psub">Golovi po igraču (value).</div>
                </div>

                <button type="button" className="btn small" onClick={addGoal} disabled={eligiblePlayers.length === 0}>
                  + Dodaj
                </button>
              </div>

              {eligiblePlayers.length === 0 ? (
                <div className="empty">Prvo izaberi ekipe.</div>
              ) : state.goals.length === 0 ? (
                <div className="empty">Nema unetih strelaca (dozvoljeno).</div>
              ) : (
                <div className="rows">
                  {state.goals.map((r, idx) => (
                    <div key={`${r.playerId}-${idx}`} className="erow">
                      <select value={r.playerId} onChange={(e) => updateGoal(idx, { playerId: e.target.value })}>
                        {eligiblePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {teamNameOf(p.id) ? `(${teamNameOf(p.id)})` : ""}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min={1}
                        value={r.value}
                        onChange={(e) => updateGoal(idx, { value: clampPositiveInt(Number(e.target.value)) })}
                      />

                      <button type="button" className="btn danger small" onClick={() => removeGoal(idx)}>
                        Obriši
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ASSISTS */}
            <section className="panel">
              <div className="phead row">
                <div>
                  <h2 className="ptitle">Asistenti</h2>
                  <div className="psub">Asistencije po igraču (value).</div>
                </div>

                <button type="button" className="btn small" onClick={addAssist} disabled={eligiblePlayers.length === 0}>
                  + Dodaj
                </button>
              </div>

              {eligiblePlayers.length === 0 ? (
                <div className="empty">Prvo izaberi ekipe.</div>
              ) : state.assists.length === 0 ? (
                <div className="empty">Nema unetih asistenata (dozvoljeno).</div>
              ) : (
                <div className="rows">
                  {state.assists.map((r, idx) => (
                    <div key={`${r.playerId}-${idx}`} className="erow">
                      <select value={r.playerId} onChange={(e) => updateAssist(idx, { playerId: e.target.value })}>
                        {eligiblePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {teamNameOf(p.id) ? `(${teamNameOf(p.id)})` : ""}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min={1}
                        value={r.value}
                        onChange={(e) => updateAssist(idx, { value: clampPositiveInt(Number(e.target.value)) })}
                      />

                      <button type="button" className="btn danger small" onClick={() => removeAssist(idx)}>
                        Obriši
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* COLUMN */}
          <section className="panel wide">
            <div className="phead">
              <h2 className="ptitle">Miljanov ugao</h2>
              <div className="psub">Ako ostaviš prazno — meč može bez izveštaja.</div>
            </div>

            <div className="colgrid">
              <label className="field">
                <span className="flabel">Naslov</span>
                <input
                  type="text"
                  value={state.column.title}
                  onChange={(e) => setColumn({ title: e.target.value })}
                  placeholder="npr. Tvrda utakmica, fer borba..."
                />
              </label>

              <label className="field">
                <span className="flabel">Autor</span>
                <input
                  type="text"
                  value={state.column.author}
                  onChange={(e) => setColumn({ author: e.target.value })}
                  placeholder="Miljan"
                />
              </label>

              <label className="field span2">
                <span className="flabel">Tekst</span>
                <textarea
                  value={state.column.content}
                  onChange={(e) => setColumn({ content: e.target.value })}
                  rows={10}
                  placeholder="Jedan meč, jedan izveštaj..."
                />
              </label>
            </div>

            {error && <div className="err">{error}</div>}
          </section>
        </div>

        <div className="bottom-actions">
          <button type="button" className="btn ghost" disabled={saving} onClick={() => router.push("/admin/utakmice")}>
            Otkaži
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Čuvam..." : "Sačuvaj"}
          </button>
        </div>
      </form>

      <style>{`
        .admin-wrap{
          max-width: 1200px;
          margin: 0 auto;
        }

        .editor{
          animation: pageFade 320ms ease-out both;
        }
        @keyframes pageFade{
          from{ opacity:0; transform: translateY(6px); }
          to{ opacity:1; transform: translateY(0); }
        }

        /* TOP */
        .top{
          display:flex;
          justify-content: space-between;
          align-items:flex-end;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .h1{
          margin: 0;
          font-weight: 1100;
          letter-spacing: 0.2px;
        }
        .sub{
          margin-top: 6px;
          opacity: 0.75;
          font-weight: 800;
          font-size: 13px;
          line-height: 1.45;
        }
        .top-actions{
          display:flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Buttons */
        .btn{
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 12px;
          padding: 10px 12px;
          background: white;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(0,0,0,0.06);
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, opacity 140ms ease;
        }
        .btn:hover{
          transform: translateY(-1px);
          border-color: rgba(240,180,41,0.55);
          box-shadow: 0 16px 34px rgba(0,0,0,0.10);
        }
        .btn:disabled{
          opacity: 0.55;
          cursor: not-allowed;
          transform: none !important;
        }
        .btn.primary{
          background: linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          border-color: rgba(240,180,41,0.55);
          position: relative;
          overflow:hidden;
        }
        .btn.primary::before{
          content:"";
          position:absolute;
          top:0; left:0;
          height: 4px; width: 100%;
          background: linear-gradient(90deg, rgba(240,180,41,0.95), rgba(240,180,41,0.10));
          opacity: 0.95;
        }
        .btn.ghost{
          background: rgba(255,255,255,0.85);
        }
        .btn.small{
          padding: 9px 10px;
          border-radius: 999px;
        }
        .btn.danger{
          border-color: rgba(220,40,40,0.35);
          color: #a32020;
          background: rgba(255,255,255,0.92);
        }
        .btn.danger:hover{
          border-color: rgba(220,40,40,0.55);
        }

        /* Inputs */
        input, select, textarea{
          border: 1px solid rgba(0,0,0,0.14);
          border-radius: 12px;
          padding: 10px 12px;
          font: inherit;
          outline: none;
          background: rgba(255,255,255,0.95);
          transition: border-color 140ms ease, box-shadow 140ms ease;
        }
        textarea{ resize: vertical; }
        input:focus, select:focus, textarea:focus{
          border-color: rgba(240,180,41,0.65);
          box-shadow: 0 0 0 4px rgba(240,180,41,0.18);
        }

        .field{
          display:grid;
          gap: 6px;
        }
        .flabel{
          font-size: 12px;
          opacity: 0.78;
          font-weight: 900;
        }

        /* HERO */
        .hero{
          border-radius: 26px;
          border: 1px solid rgba(0,0,0,0.08);
          padding: 16px;
          background:
            radial-gradient(900px 260px at 10% 0%, rgba(240,180,41,0.22), transparent 60%),
            radial-gradient(700px 240px at 90% 0%, rgba(90,160,255,0.12), transparent 58%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.97));
          box-shadow: 0 22px 60px rgba(0,0,0,0.08);
          display:grid;
          grid-template-columns: 1fr 360px;
          gap: 14px;
          overflow:hidden;
          position: relative;
          margin-bottom: 14px;
        }
        .hero::before{
          content:"";
          position:absolute;
          inset:-80px;
          background:
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.42), transparent 40%),
            radial-gradient(circle at 85% 15%, rgba(255,255,255,0.30), transparent 45%),
            radial-gradient(circle at 60% 70%, rgba(240,180,41,0.10), transparent 55%);
          filter: blur(6px);
          opacity: 0.78;
          pointer-events:none;
        }
        .hero-left, .hero-right{ position: relative; z-index: 1; }

        .hero-label{
          font-weight: 1000;
          opacity: 0.82;
          letter-spacing: 0.2px;
          margin-bottom: 10px;
        }

        .hero-grid{
          display:grid;
          grid-template-columns: 220px 1fr;
          gap: 12px;
          align-items:end;
        }

        .score{
          display:flex;
          align-items:center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .score-team{
          font-weight: 1000;
          display:flex;
          gap: 8px;
          align-items:center;
          opacity: 0.95;
        }
        .dot{
          width: 10px; height: 10px;
          border-radius: 999px;
          display:inline-block;
        }
        .dot.a{ background: rgba(240,180,41,0.95); }
        .dot.b{ background: rgba(90,160,255,0.92); }

        .scorebox{
          display:flex;
          gap: 10px;
          align-items:center;
          padding: 10px 12px;
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(10px);
          box-shadow: 0 14px 34px rgba(0,0,0,0.07);
        }
        .scorein{
          width: 84px;
          text-align:center;
          font-weight: 1100;
          font-size: 18px;
          padding: 10px 10px;
        }
        .colon{
          font-weight: 1100;
          opacity: 0.65;
        }

        .micro{
          margin-top: 10px;
          font-size: 12px;
          opacity: 0.72;
          line-height: 1.5;
        }

        .summary{
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 20px;
          background: rgba(255,255,255,0.84);
          padding: 12px;
          box-shadow: 0 14px 34px rgba(0,0,0,0.06);
          display:grid;
          gap: 10px;
        }
        .sum-row{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
        }
        .sum-k{ opacity: 0.75; font-weight: 900; }
        .sum-v{ font-weight: 1100; letter-spacing: 0.2px; }
        .pill-row{
          display:grid;
          gap: 8px;
          margin-top: 2px;
        }
        .pill{
          font-size: 12px;
          border-radius: 14px;
          padding: 8px 10px;
          border: 1px solid rgba(0,0,0,0.10);
          opacity: 0.9;
          line-height: 1.4;
          word-break: break-word;
        }
        .pill.ok{
          border-color: rgba(31,157,85,0.22);
          background: rgba(230,246,236,0.92);
        }

        /* GRID */
        .grid{
          display:grid;
          grid-template-columns: 1fr 420px;
          gap: 14px;
          align-items:start;
        }
        .right{
          display:grid;
          gap: 14px;
          align-content:start;
        }

        /* PANELS */
        .panel{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 14px;
          background: white;
          box-shadow: 0 12px 30px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .panel.wide{
          grid-column: 1 / -1;
          background:
            radial-gradient(900px 260px at 10% 0%, rgba(240,180,41,0.12), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }

        .phead{
          display:flex;
          justify-content: space-between;
          gap: 10px;
          align-items: baseline;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .phead.row{ align-items: center; }
        .ptitle{
          margin: 0;
          font-weight: 1100;
          letter-spacing: 0.2px;
          font-size: 18px;
        }
        .psub{
          font-size: 12px;
          opacity: 0.7;
          font-weight: 850;
        }
        .empty{
          opacity: 0.72;
          line-height: 1.5;
          padding: 6px 2px;
        }

        /* Teams */
        .teams{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .tcard{
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.08);
          padding: 12px;
          background:
            radial-gradient(700px 220px at 10% 0%, rgba(240,180,41,0.10), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }
        .thead{
          display:flex;
          justify-content: space-between;
          gap: 10px;
          align-items:center;
          margin-bottom: 10px;
        }
        .tname{
          display:flex;
          gap: 8px;
          align-items:center;
          font-weight: 1100;
        }
        .count{
          font-weight: 1100;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.85);
          opacity: 0.9;
        }
        .count.ok{
          border-color: rgba(31,157,85,0.22);
          background: rgba(230,246,236,0.92);
        }
        .plist{
          display:grid;
          gap: 6px;
          max-height: 380px;
          overflow:auto;
          padding-right: 4px;
        }
        .pick{
          display:flex;
          gap: 8px;
          align-items:center;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.90);
          cursor: pointer;
          transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease;
        }
        .pick:hover{
          transform: translateY(-1px);
          border-color: rgba(240,180,41,0.45);
          box-shadow: 0 10px 22px rgba(0,0,0,0.06);
        }
        .pick.on{
          border-color: rgba(240,180,41,0.55);
          background: rgba(255,248,235,0.92);
        }
        .pick input{ margin: 0; }

        /* Event rows */
        .rows{ display:grid; gap: 10px; }
        .erow{
          display:grid;
          grid-template-columns: 1fr 120px 110px;
          gap: 10px;
          align-items:center;
        }
        .erow input{
          text-align:center;
          font-weight: 1100;
        }

        /* Column */
        .colgrid{
          display:grid;
          grid-template-columns: 1fr 260px;
          gap: 12px;
        }
        .span2{ grid-column: 1 / -1; }

        .err{
          margin-top: 12px;
          border-radius: 14px;
          border: 1px solid rgba(220,40,40,0.22);
          background: rgba(253,234,234,0.92);
          color: #8c1d1d;
          padding: 10px 12px;
          font-weight: 900;
          font-size: 13px;
        }

        .bottom-actions{
          display:flex;
          justify-content:flex-end;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        @media (max-width: 980px){
          .hero{ grid-template-columns: 1fr; }
          .hero-grid{ grid-template-columns: 1fr; }
          .grid{ grid-template-columns: 1fr; }
          .teams{ grid-template-columns: 1fr; }
          .colgrid{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
