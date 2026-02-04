import Link from "next/link";

export default function AdminPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Admin panel</h1>
      <p>Pregled svih termina</p>
      <Link href="/admin/utakmice">
        <button>→ Upravljaj utakmicama</button>
      </Link>
    </div>
  );
}
