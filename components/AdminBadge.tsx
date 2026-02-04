"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AdminBadge() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/admin/login")}
      aria-label="Admin login"
      title="Admin"
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
        cursor: "pointer",
        opacity: 0.72,
        transition: "transform 120ms ease, opacity 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.transform = "scale(1.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.72";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <Image
        src="/admin-badge.png"
        alt="Admin"
        width={34}
        height={34}
        priority={false}
      />
    </button>
  );
}
