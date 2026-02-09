import Link from "next/link";
import { supabase } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export const revalidate = 0;



const TEAM_NAME = "Fudbal Petak";

function formatDateSr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function HomePage() {
  // Blagi “dinamični” deo: ako radi, super; ako ne radi, ništa strašno.
  let matchesCount: number | null = null;
  let playersCount: number | null = null;
  let lastMatch: { date: string; home_score: number; away_score: number } | null = null;

  try {
    const [{ count: mCount }, { count: pCount }, { data: last }] = await Promise.all([
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
    // namerno ignorisano — početna i bez ovoga mora da radi.
  }

  return (
    <div className="home-page" style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>

      {/* HERO */}
<section
  style={{
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 22,
    overflow: "hidden",
    background:
      "radial-gradient(900px 320px at 18% 0%, rgba(240,180,41,0.22), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,1))",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  }}
>
  {/* Slika + overlay */}
  <div
    style={{
      position: "relative",
      width: "100%",
      aspectRatio: "16 / 7",
      background: "#111",
    }}
  >
    <img
      src="/ekipa.jpg"
      alt="Ekipna fotografija"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        filter: "contrast(1.05) saturate(1.05)",
        transform: "scale(1.01)",
      }}
    />

    {/* Tamni gradient odozgo/nadole da tekst “legne” */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.62) 100%)",
      }}
    />

    {/* Badge u ćošku */}
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.22)",
        background: "rgba(0,0,0,0.35)",
        color: "rgba(255,255,255,0.92)",
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        backdropFilter: "blur(10px)",
      }}
    >
      FUDBAL • PIVO • PETAK
    </div>

    {/* Tekst preko slike (ne menjaš sadržaj, samo styling) */}
    <div
      style={{
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 16,
        color: "white",
        maxWidth: 980,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 34,
          fontWeight: 950,
          letterSpacing: 0.2,
          textShadow: "0 8px 22px rgba(0,0,0,0.35)",
        }}
      >
        {TEAM_NAME}
      </h1>

      <div
        style={{
          marginTop: 6,
          fontSize: 15,
          fontWeight: 850,
          opacity: 0.9,
          textShadow: "0 6px 18px rgba(0,0,0,0.35)",
        }}
      >
    
      </div>
    </div>
  </div>

  {/* Tekst + dugmad ispod */}
  <div style={{ padding: 18 }}>
    <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.6, letterSpacing: 0.2, fontSize: 18, textAlign: "center" }}>
      Ovo je naš mali fudbalski univerzum: petkom igramo već godinama, a od skoro, zahvaljujući ideji našeg Miljana,
      vodimo evidenciju, beležimo MVP trenutke što kroz statistiku, što kroz "Miljanov ugao" koji se sa nestrpljenjem očekuje jutro nakon fudbala (taman kad se svi istreznimo). Projekat postoji iz jednog razloga — da se utakmice pamte
      tačno, pošteno (nema laži, nema prevare), ali i da svi zajedno imamo još jedan razlog više da se smejemo i podsećamo proteklih termina.
    </p>

    <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
      <Link
  href="/utakmice"
  className="btn btnPrimary"
  style={{
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.10)",
    background:
      "linear-gradient(180deg, rgba(240,180,41,0.95), rgba(240,180,41,0.78))",
    fontWeight: 900,
    color: "#111",
    boxShadow: "0 8px 18px rgba(240,180,41,0.18)",
  }}
>
       POGLEDAJ MEČEVE
      </Link>

      <Link
  href="/galerija"
  className="btn btnGhost"
  style={{
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "white",
    fontWeight: 900,
    color: "inherit",
  }}
>
        GALERIJA
      </Link>
    </div>
  </div>
</section>


      {/* MINI KARTICE */}
      <section style={{ marginTop: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
          className="home-grid-3"
        >
          <div style={{ border: "1px solid #ddd", borderRadius: 16, padding: 14, background: "white" }}>
            <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 18}}>Fer igra</div>
            <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
              Rezultat uvek unosimo ručno (jer rezultat znamo), a strelce/asistente unosimo
              kad smo sigurni. Statistika je u službi istine, ne obrnuto.
            </div>
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 16, padding: 14, background: "white" }}>
            <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 18 }}>Statistika</div>
            <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
              Pregled mečeva, međusobni skor, rang liste strelaca/asistenata/MVP — sve na jednom mestu,
              sa filterima po mesecu i godini.
            </div>
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 16, padding: 14, background: "white" }}>
            <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 18 }}>Sećanja</div>
            <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
              Galerija je za “dokaze”: slike, kratki snimci i momenti zbog kojih se
              i vraćamo na teren.
            </div>
          </div>
        </div>
      </section>

      {/* BRZA STATISTIKA (opciono, ali već urađeno) */}
      <section style={{ marginTop: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 16, padding: 14, background: "white" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Brza statistika</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
            className="home-grid-3"
          >
            <div className="stat-card" style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
              <div style={{ opacity: 0.7, fontSize: 13 }}>Odigrano mečeva</div>
              <div style={{ fontWeight: 900, fontSize: 22, marginTop: 4 }}>
                {matchesCount ?? "—"}
              </div>
            </div>

            <div className="stat-card" style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
              <div style={{ opacity: 0.7, fontSize: 13 }}>Igrača u bazi</div>
              <div style={{ fontWeight: 900, fontSize: 22, marginTop: 4 }}>
                {playersCount ?? "—"}
              </div>
            </div>

            <div className="stat-card" style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
              <div style={{ opacity: 0.7, fontSize: 13 }}>Poslednji meč</div>
              <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>
                {lastMatch ? (
                  <>
                    {formatDateSr(lastMatch.date)} • {lastMatch.home_score}:{lastMatch.away_score}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          {/*<div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            (Ovo se samo učita iz baze — nema ručnog održavanja.) 
          </div>*/}
        </div>
      </section>

      {/* Responsive: 3 kolone -> 1 kolona */}
      {/* Responsive + hover “šminka” */}
<style>{`
  .home-grid-3 > div {
    position: relative;
    border: 1px solid rgba(0,0,0,0.08) !important;
    background: linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98)) !important;
    box-shadow: 0 10px 26px rgba(0,0,0,0.05);
    transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
    overflow: hidden;
  }

  /* mala “amber” linija gore */
  .home-grid-3 > div::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 4px;
    width: 100%;
    background: linear-gradient(90deg, rgba(240,180,41,0.95), rgba(240,180,41,0.10));
    opacity: 0.9;
  }

  .home-grid-3 > div:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 34px rgba(0,0,0,0.08);
    border-color: rgba(240,180,41,0.45) !important;
  }

  @media (max-width: 900px) {
    .home-grid-3 {
      grid-template-columns: 1fr !important;
    }
  }

    /* Fade-in na učitavanje */
  .home-page {
    animation: homeFade 380ms ease-out both;
  }
  @keyframes homeFade {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Dugmad: ujednačen hover svuda */
  .btn {
    transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease, border-color 140ms ease;
    will-change: transform;
  }
  .btn:hover {
    transform: translateY(-1px);
  }

  .btnPrimary:hover {
    filter: brightness(1.02);
    box-shadow: 0 12px 26px rgba(240,180,41,0.22);
  }

  .btnGhost:hover {
    border-color: rgba(240,180,41,0.45) !important;
    box-shadow: 0 10px 24px rgba(0,0,0,0.06);
  }

`}</style>

    </div>
  );
}
