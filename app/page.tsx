// app/page.tsx
import { supabase } from "@/lib/supabase";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  let matchesCount: number | null = null;
  let playersCount: number | null = null;
  let lastMatch: { date: string; home_score: number; away_score: number } | null =
    null;

  try {
    const [{ count: mCount }, { count: pCount }, { data: last }] =
      await Promise.all([
        supabase.from("matches").select("*", { count: "exact", head: true }),
        supabase.from("players").select("*", { count: "exact", head: true }),
        supabase
          .from("matches")
          .select("date, home_score, away_score")
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    matchesCount = typeof mCount === "number" ? mCount : null;
    playersCount = typeof pCount === "number" ? pCount : null;
    lastMatch = last ?? null;
  } catch {
    // ignorišemo — home mora da radi i bez ovoga
  }

  return (
    <HomeClient
      matchesCount={matchesCount}
      playersCount={playersCount}
      lastMatch={lastMatch}
    />
  );
}