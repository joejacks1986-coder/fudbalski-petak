// app/(gate)/kickoff/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./kickoff.module.css";

export default function KickoffPage() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // ✅ Set session cookie so middleware won't redirect again this session
    document.cookie = "seenKickoff=1; path=/";

    // start audio immediately (mp3 has its own fade/peak)
    const a = audioRef.current;
    if (a) {
      a.volume = 0.9;
      a.currentTime = 0;
      a.load();
      a.play().catch(() => {});
    }

    // navigate after 7s
    const tGo = setTimeout(() => {
      router.push("/");
    }, 7000);

    return () => {
      clearTimeout(tGo);
    };
  }, [router]);

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black ${styles.fadeOut}`}
      onPointerDown={() => {
        // fallback: if autoplay was blocked, first click/tap will start audio
        audioRef.current?.play().catch(() => {});
      }}
    >
      {/* Stadium background with camera push-in */}
      <img
        src="/assets/kickoff/stadium.jpg"
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${styles.bgZoom}`}
        draggable={false}
      />

      {/* Light pulse overlay */}
      <div className={`${styles.lights} absolute inset-0 pointer-events-none`} />

      {/* Dark overlay + vignette */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Triptih */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
        <div className={styles.driftY}>
          <img
            src="/assets/kickoff/kick.png"
            alt="kick sequence"
            className={`w-[1100px] max-w-[92vw] ${styles.kickIn} ${styles.softBottom}`}
            draggable={false}
          />
        </div>
      </div>

      {/* Flash */}
      <div className={`absolute inset-0 pointer-events-none ${styles.flash}`} />

      {/* Logo + Glow */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none ${styles.logo}`}
      >
        <div className="text-center relative">
          {/* subtle glow behind text */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 blur-2xl opacity-40"
            style={{
              width: "520px",
              height: "220px",
              background:
                "radial-gradient(circle at center, rgba(255,255,255,0.35), transparent 65%)",
            }}
          />

          <div className="relative">
            <div className="text-white/90 text-sm md:text-base tracking-[0.40em] uppercase mb-3">
              Petak • 21h • Sportsko selo
            </div>
            <h1 className="text-white text-6xl md:text-7xl font-semibold tracking-widest drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
              Spremni za borbu?
            </h1>
          </div>
        </div>
      </div>

      {/* Skip */}
      <button
        onClick={() => router.push("/")}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-2 text-white/80 text-sm backdrop-blur hover:bg-white/15 transition"
      >
        Preskoči
      </button>

      <audio ref={audioRef} src="/assets/kickoff/crowd.mp3" preload="auto" />
    </div>
  );
}