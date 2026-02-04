"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminBar() {
  const pathname = usePathname();

  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const sectionLabel = (() => {
    if (!pathname) return "Admin";
    if (pathname.startsWith("/admin/utakmice")) return "Utakmice";
    if (pathname.startsWith("/admin/galerija")) return "Galerija";
    if (pathname.startsWith("/admin/login")) return "Login";
    return "Admin";
  })();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      window.location.assign("/admin/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        borderBottom: "1px solid #e6e6e6",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* LEFT SIDE */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* ADMIN badge */}
          <div
            style={{
              fontWeight: 900,
              letterSpacing: 0.4,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: "#f5f5f5",
            }}
          >
            ADMIN
          </div>

          {/* Section badge */}
          <div
            style={{
              fontWeight: 900,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: "white",
            }}
          >
            {sectionLabel}
          </div>

          {/* Email */}
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            {email ? (
              <>
                Ulogovan: <strong>{email}</strong>
              </>
            ) : (
              ""
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            border: "1px solid #ddd",
            background: "white",
            borderRadius: 12,
            padding: "10px 12px",
            fontWeight: 900,
            cursor: loggingOut ? "not-allowed" : "pointer",
            opacity: loggingOut ? 0.7 : 1,
          }}
        >
          {loggingOut ? "ODJAVLJUJEM..." : "ODJAVI SE"}
        </button>
      </div>
    </div>
  );
}
