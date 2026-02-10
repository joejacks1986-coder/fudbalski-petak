"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminBadge() {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);

    try {
      // Brza lokalna provera sesije (bez mreže)
      const { data } = await supabase.auth.getSession();
      const isLoggedIn = !!data.session?.user;

      const target = "/admin/utakmice";
      if (isLoggedIn) {
        router.push(target);
      } else {
        // zapamti gde treba da ode posle login-a
        const next = encodeURIComponent(target);
        
        router.push(`/admin/login?next=${next}`);
      }
    } finally {
      setBusy(false);
    }
  };

  // opcionalno: sakrij lopticu na /admin/* (ako ti smeta dupliranje)
  if (pathname?.startsWith("/admin")) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Admin"
      title="Admin"
      disabled={busy}
      style={{
        position: "fixed",
        top: 10,
        right: 12,
        zIndex: 200,
        width: 34,
        height: 34,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.5 : 0.72,
        transition: "transform 120ms ease, opacity 120ms ease",
      }}
      onMouseEnter={(e) => {
        if (busy) return;
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.transform = "scale(1.06)";
      }}
      onMouseLeave={(e) => {
        if (busy) return;
        e.currentTarget.style.opacity = "0.72";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <Image src="/admin-badge.png" alt="Admin" width={34} height={34} priority={false} />
    </button>
  );
}
