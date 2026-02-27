import Link from "next/link";
import { supabase } from "@/lib/supabase";

// =====================
// TIP
// =====================
type Player = {
  id: string;
  name: string;
  slug: string;
  nickname: string | null;
  description: string | null;
  image_url: string | null;
};

// =====================
// STRANICA: LISTA IGRAČA
// =====================
export default async function IgraciPage() {
  // =====================
  // DOHVAT IGRAČA IZ BAZE
  // =====================
  const { data: players, error } = await supabase
    .from("players")
    .select(
      `
      id,
      name,
      slug,
      nickname,
      description,
      image_url
    `
    )
    .eq("is_public", true)
    .order("name");

  if (error) {
    return <pre>{JSON.stringify(error, null, 2)}</pre>;
  }

  return (
    <div className="players-page" style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontWeight: 950, letterSpacing: 0.2 }}>Igrači</h1>
        <div style={{ marginTop: 6, opacity: 0.75, maxWidth: 820, lineHeight: 1.5 }}>
          Spisak ekipe sa profilićima, nadimcima i kratkim opisima. Klikni na igrača za detaljnu
          statistiku.
        </div>
      </div>

      {/* Grid */}
      <div
        className="players-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          columnGap: 22,
rowGap: 28,
        }}
      >
        {players?.map((player) => (
          <Link
            key={player.id}
            href={`/igraci/${player.slug}`}
            className="player-link"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="player-card">
              <img
                src={player.image_url ?? "/player-images/placeholder.png"}
                alt={player.name}
                width={140}
                height={140}
                className="player-avatar"
              />

              <div style={{ marginTop: 12 }}>
                <div className="player-name">{player.name}</div>

                {player.nickname && <div className="player-nick">{player.nickname}</div>}

                {player.description && <p className="player-desc">{player.description}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .players-page {
          animation: pageFade 360ms ease-out both;
        }
        @keyframes pageFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .player-card {
    
          position: relative;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 14px 12px;
          text-align: center;
          height: 100%;
          cursor: pointer;
          background: radial-gradient(700px 220px at 10% 0%, rgba(240,180,41,0.14), transparent 55%),
                      linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 10px 26px rgba(0,0,0,0.05);
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, filter 140ms ease;
          overflow: hidden;
        }

        /* amber akcent linija */
        .player-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          height: 4px;
          width: 100%;
          background: linear-gradient(90deg, rgba(240,180,41,0.95), rgba(240,180,41,0.10));
          opacity: 0.9;
        }

        .player-link:hover .player-card {
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(0,0,0,0.08);
          border-color: rgba(240,180,41,0.45);
          filter: saturate(1.02);
        }

        .player-link {
  display: block;
  padding-bottom: 6px; /* buffer za senku i hover */
}


        .player-avatar {
  width: 140px;
  height: 140px;
  display: block;
  margin: 0 auto;

  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255,255,255,0.9);
  box-shadow: 0 10px 24px rgba(0,0,0,0.10);
  background: #f4f4f4;
}

        .player-name {
          font-weight: 950;
          letter-spacing: 0.2px;
          font-size: 17px;
          line-height: 1.15;
        }

        .player-nick {
          margin-top: 6px;
          font-size: 15px;
          font-weight: 900;
          opacity: 0.72;
        }

        .player-desc {
          margin: 8px 0 0;
          font-size: 13.5px;
          line-height: 1.5;
          opacity: 0.82;

          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
