"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

type GalleryItem = {
  id: string;
  created_at: string;
  title: string | null;
  description: string | null;
  media_type: "image" | "video";
  public_url: string;
  match_id: string | null;
};

function formatDateSr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function GalerijaPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // portal mount (da ne puca SSR/hydration)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // lightbox state
  const [openId, setOpenId] = useState<string | null>(null);

  const openIndex = useMemo(() => {
    if (!openId) return -1;
    return items.findIndex((i) => i.id === openId);
  }, [items, openId]);

  const openItem = useMemo(() => {
    if (openIndex < 0) return null;
    return items[openIndex] ?? null;
  }, [items, openIndex]);

  const hasPrev = openIndex > 0;
  const hasNext = openIndex >= 0 && openIndex < items.length - 1;

  const goPrev = () => {
    if (!hasPrev) return;
    setOpenId(items[openIndex - 1].id);
  };

  const goNext = () => {
    if (!hasNext) return;
    setOpenId(items[openIndex + 1].id);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("gallery_items")
        .select("id, created_at, title, description, media_type, public_url, match_id")
        .order("created_at", { ascending: false })
        .returns<GalleryItem[]>();

      if (error) {
        console.error(error);
        setError("Greška pri učitavanju galerije.");
        setItems([]);
      } else {
        setItems(data || []);
      }

      setLoading(false);
    };

    load();
  }, []);

  // Tastatura u lightbox-u: ESC zatvara, strelice šetaju
  useEffect(() => {
    if (!openId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, openIndex, items.length]);

  // Zaključaj scroll dok je modal otvoren
  useEffect(() => {
    if (!mounted) return;
    if (!openId) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openId, mounted]);

  if (loading) return <p style={{ padding: 20 }}>Učitavanje galerije...</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div className="gallery-page" style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div className="gallery-head">
        <div>
          <h1 style={{ margin: 0, fontWeight: 950, letterSpacing: 0.2 }}>Galerija</h1>
          <div style={{ marginTop: 6, opacity: 0.75, maxWidth: 820, lineHeight: 1.5 }}>
            Dokazi sa terena: slike, kratki snimci, i sve ono što “ne može da se prepriča kako treba”.
          </div>
        </div>

        <div className="gallery-meta">
          <span className="chip">
            Ukupno: <strong>{items.length}</strong>
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-box">Nema sadržaja u galeriji.</div>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenId(item.id)}
              className="card"
              title="Otvori"
            >
              <div className="thumb">
                {item.media_type === "image" ? (
                  <img
                    src={item.public_url}
                    alt={item.title || "Slika"}
                    className="thumb-media"
                    loading="lazy"
                  />
                ) : (
                  <>
                    <video
                      src={item.public_url}
                      className="thumb-media"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <span className="play-badge">▶ VIDEO</span>
                  </>
                )}
              </div>

              <div className="card-body">
                <div className="card-top">
                  <div className="card-title">
                    {item.title || (item.media_type === "image" ? "Slika" : "Video")}
                  </div>
                  <div className="card-date">{formatDateSr(item.created_at)}</div>
                </div>

                {item.description ? (
                  <div className="card-desc">{item.description}</div>
                ) : (
                  <div className="card-desc muted">Klikni za prikaz u punoj veličini.</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* LIGHTBOX (PORTAL u body) */}
      {mounted && openItem
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setOpenId(null)}
              className="lb-overlay"
            >
              <div onClick={(e) => e.stopPropagation()} className="lb">
                <div className="lb-head">
                  <div className="lb-title">
                    {openItem.title || (openItem.media_type === "image" ? "Slika" : "Video")}
                    <span className="lb-sub">
                      • {formatDateSr(openItem.created_at)}
                      {openItem.match_id ? ` • meč #${openItem.match_id}` : ""}
                      {openIndex >= 0 ? ` • ${openIndex + 1}/${items.length}` : ""}
                    </span>
                  </div>

                  <div className="lb-actions">
                    <button
                      type="button"
                      className={`nav-btn ${hasPrev ? "" : "disabled"}`}
                      onClick={goPrev}
                      disabled={!hasPrev}
                      title="Prethodno (←)"
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      className={`nav-btn ${hasNext ? "" : "disabled"}`}
                      onClick={goNext}
                      disabled={!hasNext}
                      title="Sledeće (→)"
                    >
                      →
                    </button>

                    <button type="button" onClick={() => setOpenId(null)} className="lb-close">
                      Zatvori ✕
                    </button>
                  </div>
                </div>

                <div className="lb-stage">
                  <button
                    type="button"
                    className={`stage-nav left ${hasPrev ? "" : "disabled"}`}
                    onClick={goPrev}
                    disabled={!hasPrev}
                    aria-label="Prethodno"
                    title="Prethodno (←)"
                  >
                    ←
                  </button>

                  {openItem.media_type === "image" ? (
                    <img
                      src={openItem.public_url}
                      alt={openItem.title || "Slika"}
                      className="lb-media"
                    />
                  ) : (
                    <video src={openItem.public_url} controls autoPlay className="lb-media" />
                  )}

                  <button
                    type="button"
                    className={`stage-nav right ${hasNext ? "" : "disabled"}`}
                    onClick={goNext}
                    disabled={!hasNext}
                    aria-label="Sledeće"
                    title="Sledeće (→)"
                  >
                    →
                  </button>
                </div>

                {openItem.description && (
                  <div className="lb-foot">
                    <div className="lb-desc">{openItem.description}</div>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      <style>{`
        .gallery-page{ animation: pageFade 360ms ease-out both; }
        @keyframes pageFade{
          from{ opacity:0; transform: translateY(6px); }
          to{ opacity:1; transform: translateY(0); }
        }

        .gallery-head{
          display:flex; justify-content: space-between; gap: 14px;
          align-items:flex-end; flex-wrap: wrap; margin-bottom: 16px;
        }
        .gallery-meta{ display:flex; gap: 10px; flex-wrap: wrap; }

        .chip{
          font-size: 12px; padding: 7px 10px; border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12); background: white; font-weight: 900;
          opacity: 0.9; box-shadow: 0 10px 26px rgba(0,0,0,0.05);
        }

        .empty-box{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 14px;
          background: white;
          box-shadow: 0 10px 26px rgba(0,0,0,0.05);
          opacity: 0.85;
        }

        .grid{
          display:grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        }

        .card{
          text-align:left;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 10px;
          background:
            radial-gradient(700px 220px at 10% 0%, rgba(240,180,41,0.14), transparent 55%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 10px 26px rgba(0,0,0,0.05);
          cursor:pointer;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, filter 140ms ease;
          overflow:hidden;
          position: relative;
        }

        .card::before{
          content:"";
          position:absolute;
          top:0; left:0;
          height:4px; width:100%;
          background: linear-gradient(90deg, rgba(240,180,41,0.95), rgba(240,180,41,0.10));
          opacity: 0.9;
        }

        .card:hover{
          transform: translateY(-2px);
          box-shadow: 0 14px 34px rgba(0,0,0,0.08);
          border-color: rgba(240,180,41,0.45);
          filter: saturate(1.02);
        }

        .thumb{
          border-radius: 14px;
          overflow:hidden;
          background:#f4f4f4;
          aspect-ratio: 4 / 3;
          display:flex;
          align-items:center;
          justify-content:center;
          position: relative;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
        }

        .thumb-media{
          width:100%;
          height:100%;
          object-fit: cover;
          display:block;
        }

        .play-badge{
          position:absolute;
          right: 10px;
          bottom: 10px;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.2px;
          padding: 6px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.20);
          background: rgba(0,0,0,0.55);
          color: white;
          backdrop-filter: blur(10px);
        }

        .card-body{ padding: 10px 2px 2px; }
        .card-top{
          display:flex; justify-content: space-between; gap: 10px; align-items: baseline;
        }
        .card-title{
          font-weight: 950; letter-spacing: 0.2px; line-height: 1.2;
        }
        .card-date{
          font-size: 12px; opacity: 0.7; font-weight: 900; white-space: nowrap;
        }

        .card-desc{
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.84;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-desc.muted{ opacity: 0.65; }

        /* LIGHTBOX (portal u body: uvek preko headera) */
        .lb-overlay{
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.72);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 16px;
          z-index: 2147483647; /* nuklearno iznad svega */
        }

        .lb{
          width: min(980px, 100%);
          max-height: 92vh;
          border-radius: 20px;
          overflow:hidden;
          border: 1px solid rgba(255,255,255,0.14);
          background: white;
          box-shadow: 0 40px 120px rgba(0,0,0,0.45);
        }

        .lb-head{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          align-items:center;
          padding: 12px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          background:
            radial-gradient(900px 260px at 10% 0%, rgba(240,180,41,0.16), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }

        .lb-title{
          font-weight: 1000;
          letter-spacing: 0.2px;
          display:flex;
          flex-direction: column;
          gap: 4px;
        }

        .lb-sub{
          font-size: 12px;
          font-weight: 900;
          opacity: 0.68;
        }

        .lb-actions{
          display:flex;
          gap: 8px;
          align-items:center;
          flex-wrap: wrap;
        }

        .nav-btn{
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 999px;
          padding: 9px 11px;
          background: rgba(255,255,255,0.90);
          cursor: pointer;
          font-weight: 1100;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, opacity 140ms ease;
          box-shadow: 0 14px 28px rgba(0,0,0,0.06);
          min-width: 44px;
          text-align:center;
        }

        .nav-btn:hover{
          transform: translateY(-1px);
          border-color: rgba(240,180,41,0.55);
          box-shadow: 0 18px 34px rgba(0,0,0,0.10);
        }

        .nav-btn.disabled{
          opacity: 0.45;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: 0 14px 28px rgba(0,0,0,0.06) !important;
          border-color: rgba(0,0,0,0.12) !important;
        }

        .lb-close{
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 999px;
          padding: 9px 11px;
          background: rgba(255,255,255,0.90);
          cursor: pointer;
          font-weight: 1000;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
          box-shadow: 0 14px 28px rgba(0,0,0,0.06);
        }

        .lb-close:hover{
          transform: translateY(-1px);
          border-color: rgba(240,180,41,0.55);
          box-shadow: 0 18px 34px rgba(0,0,0,0.10);
        }

        .lb-stage{
          padding: 12px;
          background: #111;
          display:flex;
          align-items:center;
          justify-content:center;
          position: relative;
          gap: 10px;
        }

        .lb-media{
          width: 100%;
          max-height: 72vh;
          object-fit: contain;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
        }

        .stage-nav{
          position:absolute;
          top: 50%;
          transform: translateY(-50%);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 999px;
          width: 46px;
          height: 46px;
          display:flex;
          align-items:center;
          justify-content:center;
          background: rgba(0,0,0,0.55);
          color: white;
          font-weight: 1100;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: transform 140ms ease, opacity 140ms ease, border-color 140ms ease;
        }
        .stage-nav:hover{
          transform: translateY(-50%) scale(1.03);
          border-color: rgba(240,180,41,0.55);
        }
        .stage-nav.left{ left: 12px; }
        .stage-nav.right{ right: 12px; }
        .stage-nav.disabled{
          opacity: 0.35;
          cursor: not-allowed;
        }

        .lb-foot{
          padding: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
          background: white;
        }

        .lb-desc{
          opacity: 0.86;
          line-height: 1.6;
        }

        @media (max-width: 700px){
          .card-top{ flex-direction: column; align-items:flex-start; }
          .card-date{ white-space: normal; }
          .stage-nav{ display:none; }
        }
      `}</style>
    </div>
  );
}
