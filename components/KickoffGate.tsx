"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type KickoffGateProps = {
  onDone: () => void;
  cooldownHours?: number;
  storageKey?: string;
  title?: string;
  backgroundUrl?: string;
  goalRect?: { x: number; y: number; w: number; h: number }; // 0..1
  ballImageUrl?: string; // ✅ novo
  showLights?: boolean; // ✅ novo (default false)
};

type Vec = { x: number; y: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function dist(a: Vec, b: Vec) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export default function KickoffGate({
  onDone,
  cooldownHours = 12,
  storageKey = "kickoff_last_seen",
  title = "Kickoff",
  backgroundUrl = "/kickoff-bg.jpg",
  goalRect = { x: 0.14, y: 0.16, w: 0.72, h: 0.30 },
  ballImageUrl = "/ball.png",
  showLights = false,
}: KickoffGateProps) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [reduced, setReduced] = useState(false);

  const fieldRef = useRef<HTMLDivElement | null>(null);

  const [ball, setBall] = useState<Vec>({ x: 0, y: 0 });
  const ballRef = useRef<Vec>({ x: 0, y: 0 });

  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const pointerIdRef = useRef<number | null>(null);
  const offsetRef = useRef<Vec>({ x: 0, y: 0 });

  const [phase, setPhase] = useState<"idle" | "drag" | "goal" | "fade">("idle");

  const dimsRef = useRef({
    w: 0,
    h: 0,
    ballR: 26,
    goal: { x: 0, y: 0, w: 0, h: 0 },
    goalCenter: { x: 0, y: 0 },
  });

  const cooldownMs = useMemo(() => cooldownHours * 60 * 60 * 1000, [cooldownHours]);

  useEffect(() => {
    setMounted(true);
    setReduced(prefersReducedMotion());

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setShow(true);
        return;
      }
      const t = Number(raw);
      if (!Number.isFinite(t)) {
        setShow(true);
        return;
      }
      setShow(Date.now() - t > cooldownMs);
    } catch {
      setShow(true);
    }
  }, [storageKey, cooldownMs]);

  useEffect(() => {
    if (!mounted) return;
    const el = fieldRef.current;
    if (!el) return;

    const compute = () => {
      const r = el.getBoundingClientRect();
      const w = r.width;
      const h = r.height;

      // Malo veća lopta deluje realnije na fotki
      const ballR = clamp(Math.round(Math.min(w, h) * 0.05), 24, 38);

      const goalW = Math.round(w * goalRect.w);
      const goalH = Math.round(h * goalRect.h);
      const goalX = Math.round(w * goalRect.x);
      const goalY = Math.round(h * goalRect.y);

      const goalCenter = { x: goalX + goalW / 2, y: goalY + goalH / 2 };

      dimsRef.current = {
        w,
        h,
        ballR,
        goal: { x: goalX, y: goalY, w: goalW, h: goalH },
        goalCenter,
      };

      // “kickoff” tačka, ali bez crtanja kruga
      const kickoff = { x: w / 2, y: h * 0.78 };
      ballRef.current = kickoff;
      setBall(kickoff);
      setPhase("idle");
      setDragging(false);
      draggingRef.current = false;
      pointerIdRef.current = null;
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [mounted, goalRect]);

  const setBallSafe = (v: Vec) => {
    ballRef.current = v;
    setBall(v);
  };

  const withinGoal = (p: Vec) => {
    const { goal } = dimsRef.current;
    return p.x >= goal.x && p.x <= goal.x + goal.w && p.y >= goal.y && p.y <= goal.y + goal.h;
  };

  const setSeenNow = () => {
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {}
  };

  const finish = () => {
    setSeenNow();
    setShow(false);
    onDone();
  };

  const skip = () => finish();

  const animateGoal = () => {
    if (phase === "goal" || phase === "fade") return;

    setPhase("goal");
    setDragging(false);
    draggingRef.current = false;
    pointerIdRef.current = null;

    const start = { ...ballRef.current };
    const { goalCenter, ballR } = dimsRef.current;

    const end = { x: goalCenter.x, y: goalCenter.y + ballR * 0.10 };

    const t0 = performance.now();
    const dur = reduced ? 240 : 520;

    const tick = (t: number) => {
      const u = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - u, 3); // easeOutCubic

      setBallSafe({
        x: start.x + (end.x - start.x) * e,
        y: start.y + (end.y - start.y) * e,
      });

      if (u < 1) requestAnimationFrame(tick);
      else {
        setPhase("fade");
        window.setTimeout(() => finish(), reduced ? 120 : 220);
      }
    };

    requestAnimationFrame(tick);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (reduced) return;
    if (phase === "goal" || phase === "fade") return;

    const el = fieldRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const b = ballRef.current;
    const { ballR } = dimsRef.current;

    if (dist(p, b) > ballR * 1.15) return;

    pointerIdRef.current = e.pointerId;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    setPhase("drag");
    setDragging(true);
    draggingRef.current = true;

    offsetRef.current = { x: b.x - p.x, y: b.y - p.y };
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduced) return;
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== e.pointerId) return;

    const el = fieldRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const raw = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const off = offsetRef.current;
    let next = { x: raw.x + off.x, y: raw.y + off.y };

    const { w, h, ballR, goalCenter } = dimsRef.current;

    next.x = clamp(next.x, ballR, w - ballR);
    next.y = clamp(next.y, ballR, h - ballR);

    // Magnet: smanjen da deluje prirodnije i da ne “vuče kao usisivač”
    const d = dist(next, goalCenter);
    const magnetRadius = Math.min(w, h) * 0.18;
    if (d < magnetRadius) {
      const strength = (1 - d / magnetRadius) * 0.16; // 0..0.16
      next = {
        x: next.x + (goalCenter.x - next.x) * strength,
        y: next.y + (goalCenter.y - next.y) * strength,
      };
    }

    setBallSafe(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (reduced) return;
    if (pointerIdRef.current !== e.pointerId) return;

    setDragging(false);
    draggingRef.current = false;
    pointerIdRef.current = null;

    if (phase === "drag") setPhase("idle");

    if (withinGoal(ballRef.current)) animateGoal();
  };

  useEffect(() => {
    if (!show) return;

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter" || ev.key === "Escape") {
        ev.preventDefault();
        skip();
      }
      if (ev.key === " " || ev.key === "Spacebar") {
        ev.preventDefault();
        animateGoal();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, phase, reduced]);

  if (!mounted || !show) return null;

  const { ballR } = dimsRef.current;

  const ballStyle: React.CSSProperties = {
    width: ballR * 2,
    height: ballR * 2,
    transform: `translate(${ball.x - ballR}px, ${ball.y - ballR}px)`,
  };

  return (
    <div className={`kgWrap ${phase === "fade" ? "kgFade" : ""}`} role="dialog" aria-modal="true">
      <div className="kgTopBar">
        <div className="kgBrand">
          <div className="kgDot" aria-hidden />
          <div className="kgTitle">{title}</div>
          <div className="kgSub">Ubacite loptu u gol</div>
        </div>

        <div className="kgActions">
          <button className="kgBtn" type="button" onClick={skip}>
            Preskoči
          </button>
        </div>
      </div>

      <div
        ref={fieldRef}
        className="kgField"
        style={{ ["--kg-bg" as any]: `url(${backgroundUrl})` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {showLights ? <div className="kgLights" aria-hidden /> : null}

        {/* Lopta */}
        <div
          className={`kgBall ${dragging ? "kgBallDrag" : ""} ${phase === "goal" ? "kgBallGoal" : ""}`}
          style={ballStyle}
          aria-label="Lopta"
        >
          <div className="kgBallInner" style={{ ["--kg-ball" as any]: `url(${ballImageUrl})` }} />
        </div>

        {reduced ? (
          <div className="kgReduced">
            <div className="kgReducedTitle">Animacije su smanjene (Reduced Motion).</div>
            <div className="kgReducedRow">
              <button className="kgBtnPrimary" type="button" onClick={finish}>
                Uđi
              </button>
              <button className="kgBtnGhost" type="button" onClick={skip}>
                Preskoči
              </button>
            </div>
          </div>
        ) : (
          <div className="kgHint">
            Prevuci loptu do gola. <span className="kgHintDim">(Space = auto-gol, Enter = preskoči)</span>
          </div>
        )}
      </div>

      <style>{`
        .kgWrap{
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #060b10;
          color: rgba(255,255,255,0.92);
          display:flex;
          flex-direction: column;
          animation: kgIn 320ms ease-out both;
        }
        @keyframes kgIn{ from{opacity:0; transform: translateY(10px);} to{opacity:1; transform:none;} }
        .kgFade{ animation: kgOut 360ms ease-in both; }
        @keyframes kgOut{ to{opacity:0; transform: scale(0.99);} }

        .kgTopBar{
          display:flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(900px 220px at 10% 0%, rgba(255,255,255,0.06), transparent 60%),
            linear-gradient(180deg, rgba(8,13,18,0.96), rgba(8,13,18,0.88));
          backdrop-filter: blur(10px);
        }
        .kgBrand{ display:flex; align-items: baseline; gap:10px; flex-wrap: wrap; }
        .kgDot{
          width:10px; height:10px; border-radius:999px;
          background: radial-gradient(circle at 30% 30%, #8dff8a, #1ae06a 55%, #0aa14c);
          box-shadow: 0 0 0 6px rgba(26,224,106,0.12);
        }
        .kgTitle{ font-weight: 1000; letter-spacing: 0.3px; }
        .kgSub{ opacity:0.75; font-weight: 850; font-size: 12.5px; }

        .kgBtn{
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.92);
          font-weight: 950;
          cursor: pointer;
        }
        .kgBtn:hover{ background: rgba(255,255,255,0.10); }

        .kgField{
          position: relative;
          flex: 1;
          margin: 14px;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.10);
          background:
            linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.10) 40%, rgba(0,0,0,0.55)),
            var(--kg-bg) center / cover no-repeat;
          box-shadow: 0 24px 90px rgba(0,0,0,0.55);
          touch-action: none;
          user-select: none;
        }

        /* Lens / vignette */
        .kgField::after{
          content:"";
          position:absolute; inset:0;
          background:
            radial-gradient(1200px 600px at 50% 20%, rgba(255,255,255,0.06), transparent 55%),
            radial-gradient(900px 500px at 50% 75%, transparent 55%, rgba(0,0,0,0.35));
          pointer-events:none;
        }

        /* Optional lights */
        .kgLights{
          position:absolute; inset:-40%;
          background:
            radial-gradient(closest-side at 30% 25%, rgba(255,255,255,0.10), transparent 65%),
            radial-gradient(closest-side at 70% 18%, rgba(255,255,255,0.09), transparent 65%),
            radial-gradient(closest-side at 50% 5%, rgba(255,255,255,0.06), transparent 70%);
          filter: blur(2px);
          animation: kgLightSweep 5.2s ease-in-out infinite alternate;
          pointer-events:none;
          opacity: 0.55;
        }
        @keyframes kgLightSweep{
          from{ transform: translateY(-1%) translateX(-1%); opacity:0.45; }
          to{ transform: translateY(1.5%) translateX(1.2%); opacity:0.65; }
        }

        .kgBall{
          position:absolute;
          border-radius: 999px;
          will-change: transform;
          filter: drop-shadow(0 18px 26px rgba(0,0,0,0.55));
        }
        .kgBallDrag{
          filter: drop-shadow(0 22px 36px rgba(0,0,0,0.65));
        }

        .kgBallInner{
          width:100%; height:100%;
          border-radius: 999px;
          background: var(--kg-ball) center / cover no-repeat;
          box-shadow:
            0 2px 0 rgba(255,255,255,0.18) inset,
            0 -10px 18px rgba(0,0,0,0.28) inset;
        }

        .kgBallGoal .kgBallInner{
          animation: kgBallPop 420ms ease-out 1;
        }
        @keyframes kgBallPop{
          0%{ transform: scale(1); }
          60%{ transform: scale(1.10); }
          100%{ transform: scale(1.02); }
        }

        .kgHint{
          position:absolute;
          left: 14px;
          bottom: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.28);
          backdrop-filter: blur(10px);
          font-weight: 900;
          opacity: 0.90;
        }
        .kgHintDim{ opacity:0.75; font-weight: 850; }

        .kgReduced{
          position:absolute;
          inset:auto 14px 12px 14px;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.30);
          backdrop-filter: blur(10px);
        }
        .kgReducedTitle{ font-weight: 950; opacity:0.95; }
        .kgReducedRow{ margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; }
        .kgBtnPrimary{
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(26,224,106,0.55);
          background: rgba(26,224,106,0.18);
          color: rgba(255,255,255,0.95);
          font-weight: 1000;
          cursor:pointer;
        }
        .kgBtnPrimary:hover{ background: rgba(26,224,106,0.24); }
        .kgBtnGhost{
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.92);
          font-weight: 950;
          cursor:pointer;
        }
        .kgBtnGhost:hover{ background: rgba(255,255,255,0.10); }

        @media (max-width: 520px){
          .kgField{ margin: 10px; border-radius: 18px; }
          .kgTopBar{ padding: 12px; }
          .kgSub{ display:none; }
          .kgHint{ right: 14px; }
        }
      `}</style>
    </div>
  );
}