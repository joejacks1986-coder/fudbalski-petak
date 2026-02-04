"use client";

import { useFormStatus } from "react-dom";

export default function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "10px 16px",
          fontWeight: "bold",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
          width: "fit-content",
        }}
      >
        {pending ? "⏳ Čuvanje..." : "💾 Sačuvaj"}
      </button>

      {pending && <span>Podaci se čuvaju…</span>}
      {!pending && <span style={{ color: "green" }}>✔ Spremno za unos</span>}
    </div>
  );
}
