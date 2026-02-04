"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MatchRow = {
  id: string;
  date: string;
  home_score: number;
  away_score: number;
};

type MediaType = "image" | "video";

function formatDateSr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminGalerijaNew() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [matchId, setMatchId] = useState<string>("");
  const [mediaType, setMediaType] = useState<MediaType>("image");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Učitaj mečeve radi opcione veze
  useEffect(() => {
    const loadMatches = async () => {
      setLoadingMatches(true);
      const { data, error } = await supabase
        .from("matches")
        .select("id, date, home_score, away_score")
        .order("date", { ascending: false })
        .limit(100);

      if (error) {
        console.error(error);
        setError("Greška pri učitavanju utakmica.");
      } else {
        setMatches(data || []);
      }
      setLoadingMatches(false);
    };

    loadMatches();
  }, []);

  // Preview
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const acceptAttr = useMemo(() => {
    return mediaType === "image" ? "image/*" : "video/*";
  }, [mediaType]);

  const handleFileChange = (f: File | null) => {
    setError(null);
    setFile(f);

    if (!f) return;

    // auto-sync mediaType
    if (f.type.startsWith("image/")) setMediaType("image");
    if (f.type.startsWith("video/")) setMediaType("video");
  };

  const formatMatchLabel = (m: MatchRow) => {
    const d = formatDateSr(m.date);
    return `${d} — ${m.home_score}:${m.away_score}`;
  };

  const makeSafeFilename = (name: string) =>
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9.\-_]/g, "");

  const fileMeta = useMemo(() => {
    if (!file) return null;
    const mb = file.size / (1024 * 1024);
    return {
      name: file.name,
      size: `${mb.toFixed(mb >= 10 ? 0 : 1)}MB`,
      type: file.type || "unknown",
      isImage: file.type.startsWith("image/"),
      isVideo: file.type.startsWith("video/"),
    };
  }, [file]);

  // Drag & drop
  const [dragOver, setDragOver] = useState(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] || null;
    handleFileChange(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Moraš izabrati fajl (sliku ili snimak).");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setError("Nepodržan tip fajla. Izaberi sliku ili video.");
      return;
    }

    const type: MediaType = isImage ? "image" : "video";

    // limit veličine: 50MB
    const MAX_MB = 50;
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_MB) {
      setError(`Fajl je prevelik (${sizeMb.toFixed(1)}MB). Maksimum je ${MAX_MB}MB.`);
      return;
    }

    setSaving(true);

    try {
      // 1) Upload u Storage bucket "gallery"
      const ext = file.name.split(".").pop() || (type === "image" ? "jpg" : "mp4");
      const safe = makeSafeFilename(file.name);
      const filename = `${crypto.randomUUID()}-${safe || `upload.${ext}`}`;
      const filePath = `${type}/${filename}`;

      const { error: uploadError } = await supabase.storage.from("gallery").upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      });

      if (uploadError) throw uploadError;

      // 2) Public URL (bucket je public)
      const { data: publicData } = supabase.storage.from("gallery").getPublicUrl(filePath);
      const publicUrl = publicData.publicUrl;

      // 3) Upis u tabelu
      const { error: dbError } = await supabase.from("gallery_items").insert({
        title: title.trim() || null,
        description: description.trim() || null,
        media_type: type,
        file_path: filePath,
        public_url: publicUrl,
        match_id: matchId || null,
      });

      if (dbError) throw dbError;

      alert("Stavka je uspešno dodata u galeriju ✅");
      router.push("/admin/utakmice");
    } catch (err) {
      console.error(err);
      setError("Greška pri upload-u. Proveri konzolu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      {/* TOP BAR */}
      <div className="topbar">
        <div className="titleBlock">
          <h1 className="h1">Dodaj u galeriju</h1>
          <div className="sub">
            Upload slike/video snimka, opciono veži za meč, i gotovo. Jedna stavka – jedan dokaz.
          </div>
        </div>

        <div className="topActions">
          <button
            type="button"
            className="pill"
            onClick={() => router.push("/admin/utakmice")}
            disabled={saving}
            title="Nazad na admin mečeve"
          >
            ← Nazad
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid2">
        {/* LEVO */}
        <div className="col">
          {/* FILE PANEL */}
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2 className="h2">Fajl</h2>
                <div className="hint">Možeš kliknuti da izabereš ili prevući fajl u zonu.</div>
              </div>

              <div className="miniRow">
                <label className="miniLabel">
                  <span className="miniCap">Tip</span>
                  <select
                    className="select"
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as MediaType)}
                    disabled={saving}
                  >
                    <option value="image">Slika</option>
                    <option value="video">Video</option>
                  </select>
                </label>
              </div>
            </div>

            <div
              className={`drop ${dragOver ? "over" : ""}`}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              aria-label="Zona za upload fajla"
              title="Klikni ili prevuci fajl"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttr}
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="fileInput"
                disabled={saving}
              />

              {!file ? (
                <div className="dropInner">
                  <div className="dropIcon">⬆</div>
                  <div className="dropTitle">Klikni ili prevuci fajl</div>
                  <div className="dropSub">
                    Podržano: <strong>{mediaType === "image" ? "slike" : "video"}</strong> • max 50MB
                  </div>
                </div>
              ) : (
                <div className="fileRow">
                  <div className="fileMeta">
                    <div className="fileName">{fileMeta?.name}</div>
                    <div className="fileSub">
                      {fileMeta?.type} • {fileMeta?.size}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    disabled={saving}
                    title="Ukloni fajl"
                  >
                    Ukloni
                  </button>
                </div>
              )}
            </div>

            {previewUrl && (
              <div className="preview">
                <div className="previewHead">
                  <div className="previewTitle">Pregled</div>
                  <div className="previewChip">
                    {mediaType === "image" ? "🖼️ Slika" : "🎬 Video"}
                  </div>
                </div>

                <div className="previewStage">
                  {mediaType === "image" ? (
                    <img src={previewUrl} alt="Preview" className="previewMedia" />
                  ) : (
                    <video src={previewUrl} controls className="previewMedia" />
                  )}
                </div>
              </div>
            )}
          </section>

          {/* DETAILS PANEL */}
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2 className="h2">Detalji</h2>
                <div className="hint">Naslov/opis su opcioni, ali daju šmek (i kontekst).</div>
              </div>
            </div>

            <div className="fields">
              <label className="label">
                <span className="cap">Naslov (opciono)</span>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                  placeholder="npr. 'Pogodak u rašlje'"
                />
              </label>

              <label className="label">
                <span className="cap">Opis (opciono)</span>
                <textarea
                  className="textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={saving}
                  placeholder="kratak opis (šta gledamo, ko je kriv, ko je heroj...)"
                />
              </label>

              <label className="label" style={{ maxWidth: 560 }}>
                <span className="cap">Veži za utakmicu (opciono)</span>
                <select
                  className="select"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">— nije vezano —</option>

                  {loadingMatches ? (
                    <option value="" disabled>
                      Učitavam...
                    </option>
                  ) : (
                    matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {formatMatchLabel(m)}
                      </option>
                    ))
                  )}
                </select>

                <span className="note">
                  Ako vežeš za meč, kasnije možemo lako filtrirati galeriju po utakmicama.
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* DESNO */}
        <aside className="side">
          <section className="panel amber">
            <div className="panelHead">
              <div>
                <h2 className="h2">Akcije</h2>
                <div className="hint">Kad klikneš “Dodaj”, ide upload + upis u bazu.</div>
              </div>
            </div>

            {error && <div className="errorBox">⚠ {error}</div>}

            <div className="actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Dodajem..." : "DODAJ U GALERIJU"}
              </button>

              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() => router.push("/admin/utakmice")}
              >
                Otkaži
              </button>
            </div>

            <div className="tips">
              <div className="tipTitle">Brzi saveti</div>
              <ul className="tipList">
                <li>Fajl &gt; 50MB neće proći (da admin ne plače).</li>
                <li>Ako ubaciš video, tip se sam prebacuje na “Video”.</li>
                <li>Naslov i opis su opcioni — ali galerija izgleda življe s njima.</li>
              </ul>
            </div>
          </section>

          <section className="panel">
            <div className="panelHead">
              <div>
                <h2 className="h2">Status</h2>
                <div className="hint">Mala kontrola pre snimanja.</div>
              </div>
            </div>

            <div className="kv">
              <div className="kvRow">
                <div className="kvKey">Fajl</div>
                <div className="kvVal">{file ? "✅ izabran" : "—"}</div>
              </div>

              <div className="kvRow">
                <div className="kvKey">Tip</div>
                <div className="kvVal">{mediaType === "image" ? "Slika" : "Video"}</div>
              </div>

              <div className="kvRow">
                <div className="kvKey">Meč</div>
                <div className="kvVal">{matchId ? "✅ vezano" : "—"}</div>
              </div>

              <div className="kvRow">
                <div className="kvKey">Naslov</div>
                <div className="kvVal">{title.trim() ? "✅" : "—"}</div>
              </div>

              <div className="kvRow">
                <div className="kvKey">Opis</div>
                <div className="kvVal">{description.trim() ? "✅" : "—"}</div>
              </div>
            </div>
          </section>
        </aside>
      </form>

      <style>{`
        .page{ animation: pageFade 360ms ease-out both; }
        @keyframes pageFade{
          from{ opacity:0; transform: translateY(6px); }
          to{ opacity:1; transform: translateY(0); }
        }

        .topbar{
          display:flex;
          justify-content: space-between;
          align-items:flex-end;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .titleBlock{ max-width: 740px; }
        .h1{ margin:0; font-weight: 1100; letter-spacing: 0.2px; }
        .sub{ margin-top: 6px; opacity: 0.75; line-height: 1.5; }

        .topActions{ display:flex; gap: 10px; flex-wrap: wrap; }
        .pill{
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.95);
          border-radius: 999px;
          padding: 10px 12px;
          font-weight: 1000;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(0,0,0,0.06);
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
        }
        .pill:hover{
          transform: translateY(-1px);
          border-color: rgba(240,180,41,0.55);
          box-shadow: 0 18px 34px rgba(0,0,0,0.10);
        }
        .pill:disabled{ opacity: 0.55; cursor: not-allowed; transform:none; }

        .grid2{
          display:grid;
          grid-template-columns: 1fr 360px;
          gap: 16px;
          align-items: start;
        }
        .col{ display:grid; gap: 12px; }
        .side{ display:grid; gap: 12px; }

        .panel{
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 14px;
          background: white;
          box-shadow: 0 12px 30px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .panel.amber{
          background:
            radial-gradient(900px 260px at 10% 0%, rgba(240,180,41,0.16), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }

        .panelHead{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          align-items: baseline;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .h2{ margin:0; font-weight: 1100; letter-spacing: 0.2px; font-size: 18px; }
        .hint{ font-size: 12px; opacity: 0.7; font-weight: 800; margin-top: 4px; }

        .miniRow{ display:flex; gap: 10px; flex-wrap: wrap; }
        .miniLabel{ display:grid; gap: 6px; }
        .miniCap{ font-size: 12px; opacity: 0.75; font-weight: 900; }

        .fields{ display:grid; gap: 12px; }
        .label{ display:grid; gap: 6px; }
        .cap{ font-size: 12px; opacity: 0.8; font-weight: 900; }

        .input, .textarea, .select{
          border: 1px solid rgba(0,0,0,0.14);
          border-radius: 14px;
          padding: 10px 12px;
          font: inherit;
          background: white;
          outline: none;
          transition: border-color 140ms ease, box-shadow 140ms ease;
        }
        .textarea{ resize: vertical; min-height: 92px; }
        .input:focus, .textarea:focus, .select:focus{
          border-color: rgba(240,180,41,0.65);
          box-shadow: 0 0 0 3px rgba(240,180,41,0.20);
        }
        .note{ margin-top: 6px; font-size: 12px; opacity: 0.72; line-height: 1.45; }

        .drop{
          border: 1.5px dashed rgba(0,0,0,0.18);
          border-radius: 18px;
          padding: 14px;
          background:
            radial-gradient(700px 220px at 10% 0%, rgba(240,180,41,0.10), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          cursor: pointer;
          transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
          position: relative;
          overflow: hidden;
        }
        .drop.over{
          border-color: rgba(240,180,41,0.75);
          box-shadow: 0 16px 36px rgba(0,0,0,0.09);
          transform: translateY(-1px);
        }
        .fileInput{ display:none; }

        .dropInner{
          display:grid;
          gap: 6px;
          align-items:center;
          justify-items:center;
          padding: 10px 6px;
          text-align:center;
        }
        .dropIcon{
          width: 44px;
          height: 44px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.10);
          background: rgba(255,255,255,0.85);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 1100;
          box-shadow: 0 12px 26px rgba(0,0,0,0.06);
        }
        .dropTitle{ font-weight: 1100; letter-spacing: 0.2px; }
        .dropSub{ font-size: 12px; opacity: 0.75; font-weight: 800; line-height: 1.45; }

        .fileRow{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          align-items:center;
        }
        .fileMeta{ min-width: 0; }
        .fileName{ font-weight: 1100; letter-spacing: 0.2px; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 560px; }
        .fileSub{ font-size: 12px; opacity: 0.72; font-weight: 900; margin-top: 4px; }

        .ghost{
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.90);
          border-radius: 999px;
          padding: 9px 11px;
          font-weight: 1000;
          cursor: pointer;
          transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
          box-shadow: 0 14px 28px rgba(0,0,0,0.06);
          white-space: nowrap;
        }
        .ghost:hover{
          transform: translateY(-1px);
          border-color: rgba(240,180,41,0.55);
          box-shadow: 0 18px 34px rgba(0,0,0,0.10);
        }
        .ghost:disabled{ opacity: 0.55; cursor: not-allowed; transform:none; }

        .preview{
          margin-top: 12px;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          overflow: hidden;
          background: white;
          box-shadow: 0 10px 26px rgba(0,0,0,0.05);
        }
        .previewHead{
          display:flex;
          justify-content: space-between;
          gap: 10px;
          align-items:center;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          background:
            radial-gradient(900px 260px at 10% 0%, rgba(240,180,41,0.12), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
        }
        .previewTitle{ font-weight: 1100; letter-spacing: 0.2px; }
        .previewChip{
          font-size: 12px;
          font-weight: 1000;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.85);
          opacity: 0.9;
          white-space: nowrap;
        }
        .previewStage{
          background: #111;
          padding: 12px;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .previewMedia{
          width: 100%;
          max-height: 56vh;
          object-fit: contain;
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
        }

        .errorBox{
          border: 1px solid rgba(198,40,40,0.26);
          background: rgba(253,234,234,0.92);
          color: #a32020;
          border-radius: 16px;
          padding: 10px 12px;
          font-weight: 900;
          line-height: 1.4;
          margin-bottom: 10px;
        }

        .actions{ display:grid; gap: 10px; }
        .primary{
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(240,180,41,0.95);
          color: #1a1a1a;
          border-radius: 16px;
          padding: 12px 12px;
          font-weight: 1100;
          cursor: pointer;
          box-shadow: 0 18px 40px rgba(0,0,0,0.12);
          transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
        }
        .primary:hover{
          transform: translateY(-1px);
          box-shadow: 0 22px 52px rgba(0,0,0,0.16);
          filter: saturate(1.02);
        }
        .primary:disabled{ opacity: 0.6; cursor: not-allowed; transform:none; }

        .secondary{
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.92);
          border-radius: 16px;
          padding: 12px 12px;
          font-weight: 1000;
          cursor: pointer;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
          box-shadow: 0 14px 28px rgba(0,0,0,0.06);
        }
        .secondary:hover{
          transform: translateY(-1px);
          border-color: rgba(240,180,41,0.55);
          box-shadow: 0 18px 34px rgba(0,0,0,0.10);
        }
        .secondary:disabled{ opacity: 0.6; cursor: not-allowed; transform:none; }

        .tips{
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.06);
          opacity: 0.92;
        }
        .tipTitle{ font-weight: 1100; letter-spacing: 0.2px; margin-bottom: 8px; }
        .tipList{
          margin: 0;
          padding-left: 18px;
          line-height: 1.6;
          font-size: 13px;
          opacity: 0.86;
          font-weight: 800;
        }

        .kv{ display:grid; gap: 10px; }
        .kvRow{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.95);
          box-shadow: 0 10px 24px rgba(0,0,0,0.04);
        }
        .kvKey{ font-weight: 1000; opacity: 0.75; }
        .kvVal{ font-weight: 1100; }

        @media (max-width: 980px){
          .grid2{ grid-template-columns: 1fr; }
          .fileName{ max-width: 70vw; }
        }
      `}</style>
    </div>
  );
}
