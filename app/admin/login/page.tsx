"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErr("Neuspešan login. Proveri email ili lozinku.");
        return;
      }

      window.location.assign(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="login-card">
        <div className="login-head">
          <div className="badge">ADMIN</div>
          <h1>Prijava</h1>
          <p>Ova zona je rezervisana za one koji znaju šta rade.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <label>
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
              placeholder="admin@email.com"
            />
          </label>

          <label>
            <span>Lozinka</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>

          {err && <div className="login-error">{err}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Prijavljujem..." : "PRIJAVI SE"}
          </button>
        </form>
      </div>

      <style>{`
        .admin-login-page{
          min-height: calc(100vh - 120px);
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 20px;
          animation: pageFade 360ms ease-out both;
        }

        @keyframes pageFade{
          from{ opacity:0; transform: translateY(6px); }
          to{ opacity:1; transform: translateY(0); }
        }

        .login-card{
          width: 100%;
          max-width: 420px;
          border-radius: 22px;
          padding: 22px 22px 24px;
          border: 1px solid rgba(0,0,0,0.08);
          background:
            radial-gradient(700px 220px at 10% 0%, rgba(240,180,41,0.18), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,1), rgba(255,255,255,0.98));
          box-shadow: 0 22px 60px rgba(0,0,0,0.08);
        }

        .login-head{
          text-align:center;
          margin-bottom: 18px;
        }

        .badge{
          display:inline-block;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(240,180,41,0.45);
          background: rgba(240,180,41,0.12);
          margin-bottom: 10px;
        }

        .login-head h1{
          margin: 0;
          font-weight: 1100;
          letter-spacing: 0.3px;
        }

        .login-head p{
          margin: 6px 0 0;
          font-size: 13px;
          opacity: 0.75;
        }

        .login-form{
          display:grid;
          gap: 14px;
        }

        label{
          display:grid;
          gap: 6px;
        }

        label span{
          font-size: 13px;
          font-weight: 900;
          opacity: 0.8;
        }

        input{
          padding: 11px 12px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.14);
          font-size: 14px;
          outline: none;
          background: white;
          transition: border-color 140ms ease, box-shadow 140ms ease;
        }

        input:focus{
          border-color: rgba(240,180,41,0.65);
          box-shadow: 0 0 0 3px rgba(240,180,41,0.18);
        }

        .login-error{
          font-size: 13px;
          font-weight: 900;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(198,40,40,0.35);
          background: rgba(253,234,234,0.9);
          color: #a32020;
        }

        button{
          margin-top: 6px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.16);
          background:
            linear-gradient(180deg, rgba(255,255,255,1), rgba(245,245,245,0.98));
          font-weight: 1100;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, opacity 140ms ease;
          box-shadow: 0 14px 34px rgba(0,0,0,0.08);
        }

        button:hover:not(:disabled){
          transform: translateY(-1px);
          border-color: rgba(240,180,41,0.55);
          box-shadow: 0 18px 42px rgba(0,0,0,0.12);
        }

        button:disabled{
          opacity: 0.65;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
