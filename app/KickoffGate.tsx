"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function KickoffGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Ako smo već na /kickoff, ne diramo ništa
    if (window.location.pathname === "/kickoff") {
      setAllowed(true);
      return;
    }

    const seen = sessionStorage.getItem("seenKickoff");
    if (!seen) {
      // replace da Back ne vraća na "/" pa opet kickoff
      router.replace("/kickoff");
      return;
    }

    setAllowed(true);
  }, [router]);

  // Dok odlučuje, ne renderujemo home da ne "trepne"
  if (!allowed) return null;

  return <>{children}</>;
}