"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginClient() {
  const sp = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const next = sp.get("next") || "/admin/utakmice";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr("Neuspešan login. Proveri email/lozinku.");
        return;
      }
      window.location.assign(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto" }}>
      <h1>Admin login</h1>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Lozinka</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
          />
        </label>

        {err && <p style={{ color: "red", margin: 0 }}>{err}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Prijavljujem..." : "PRIJAVI SE"}
        </button>
      </form>
    </div>
  );
}
