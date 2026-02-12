"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type RivalryRow = {
  player_a_id: string;
  player_name: string | null;
  player_slug: string | null;

  player_b_id: string;
  opponent_name: string | null;
  opponent_slug: string | null;

  duels: number;
  a_wins: number;
  a_losses: number;
  draws: number;
  a_goal_diff: number;
  a_net: number;
};

function fmtGD(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

export default function RivalriesPage() {
  const [rows, setRows] = useState<RivalryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // UX kontrole
  const [minDuels, setMinDuels] = useState(3);
  const [mode, setMode] = useState<"nemesis" | "domination">("nemesis");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("player_rivalries_named")
        .select(
          "player_a_id,player_name,player_slug,player_b_id,opponent_name,opponent_slug,duels,a_wins,a_losses,draws,a_goal_diff,a_net"
        );

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setRows([]);
      } else {
        setRows((data as RivalryRow[]) || []);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const base = rows.filter((r) => (r.duels ?? 0) >= minDuels);

    base.sort((x, y) => {
      // Nemesis: najgori net pa najgori GD (uz dovoljno duela)
      if (mode === "nemesis") {
        if (x.a_net !== y.a_net) return x.a_net - y.a_net;
        return x.a_goal_diff - y.a_goal_diff;
      }
      // Dominacija: najbolji net pa najbolji GD
      if (x.a_net !== y.a_net) return y.a_net - x.a_net;
      return y.a_goal_diff - x.a_goal_diff;
    });

    return base.slice(0, 30);
  }, [rows, minDuels, mode]);

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Rivalries</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        Prikaz “ko kome ne leži” (Nemesis) i “koga ko gazi” (Dominacija), računato iz timova i rezultata.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          margin: "14px 0 18px",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Režim:</span>
          <button
            onClick={() => setMode("nemesis")}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              background: mode === "nemesis" ? "rgba(255,255,255,0.12)" : "transparent",
              cursor: "pointer",
            }}
          >
            Nemesis
          </button>
          <button
            onClick={() => setMode("domination")}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              background: mode === "domination" ? "rgba(255,255,255,0.12)" : "transparent",
              cursor: "pointer",
            }}
          >
            Dominacija
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Min duela:</span>
          <input
            type="number"
            min={1}
            max={50}
            value={minDuels}
            onChange={(e) => setMinDuels(Math.max(1, Number(e.target.value) || 1))}
            style={{ width: 80, padding: "6px 8px" }}
          />
        </div>
      </div>

      {loading && <p>Učitavam...</p>}
      {err && (
        <p style={{ color: "salmon" }}>
          Greška: {err}
          <br />
          (Ako u SQL editoru vidiš podatke, a ovde ne — gotovo sigurno je RLS/policy za SELECT.)
        </p>
      )}

      {!loading && !err && filtered.length === 0 && (
        <p>Nema dovoljno podataka za izabrani filter (probaj manji “Min duela”).</p>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((r, i) => {
          const playerLabel = r.player_name || r.player_a_id.slice(0, 8);
          const oppLabel = r.opponent_name || r.player_b_id.slice(0, 8);

          const playerHref = r.player_slug ? `/igraci/${r.player_slug}` : null;
          const oppHref = r.opponent_slug ? `/igraci/${r.opponent_slug}` : null;

          return (
            <div
              key={`${r.player_a_id}-${r.player_b_id}`}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 14, opacity: 0.7 }}>#{i + 1}</div>

                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {playerHref ? <Link href={playerHref}>{playerLabel}</Link> : playerLabel}
                  {" "}
                  <span style={{ opacity: 0.7 }}>vs</span>
                  {" "}
                  {oppHref ? <Link href={oppHref}>{oppLabel}</Link> : oppLabel}
                </div>

                <div style={{ fontSize: 14, opacity: 0.85 }}>
                  Duela: <b>{r.duels}</b> • W-L-D:{" "}
                  <b>
                    {r.a_wins}-{r.a_losses}-{r.draws}
                  </b>{" "}
                  • GD: <b>{fmtGD(r.a_goal_diff)}</b> • NET: <b>{fmtGD(r.a_net)}</b>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
