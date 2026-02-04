import type { Metadata } from "next";
import Link from "next/link";
import AdminBadge from "@/components/AdminBadge";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Fudbal Petak",
  description: "Mečevi, statistika, Miljanov ugao i galerija.",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
        fontWeight: 800,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #ddd",
        background: "white",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {label}
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr">
      <body style={{ margin: 0, background: "#fafafa" }}>
        {/* DISKRETAN ADMIN ULAZ */}
        <AdminBadge />

        {/* HEADER */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            borderBottom: "1px solid #e6e6e6",
            background: "rgba(250, 250, 250, 0.9)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "12px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link
  href="/"
  style={{
    textDecoration: "none",
    color: "inherit",
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: 0.2,
    padding: "8px 10px",
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
  }}
>
  <Image
    src="/logo.png"
    alt="Fudbal i pivo"
    width={36}
    height={36}
    style={{
      borderRadius: 8,
      boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
      flexShrink: 0,
    }}
  />
  <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.05 }}>
    <span style={{ fontSize: 15, fontWeight: 950 }}>Fudbal, pivo, petak!</span>
    <span style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
      Igra amaterska, loženje profesionalno!
    </span>
  </span>
</Link>


            <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <NavLink href="/" label="POČETNA" />
              <NavLink href="/utakmice" label="MEČEVI" />
              <NavLink href="/igraci" label="IGRAČI" />
              <NavLink href="/galerija" label="GALERIJA" />
            </nav>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main>{children}</main>

        {/* FOOTER */}
        <footer
          style={{
            marginTop: 30,
            padding: "18px 20px",
            borderTop: "1px solid #e6e6e6",
            background: "white",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              opacity: 0.75,
              fontSize: 13,
            }}
          >
            © {new Date().getFullYear()} Created by N3M3515 from Underworld
          </div>
        </footer>
      </body>
    </html>
  );
}
