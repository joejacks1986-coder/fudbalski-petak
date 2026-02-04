import { Suspense } from "react";
import AdminLoginClient from "./AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Učitavanje...</div>}>
      <AdminLoginClient />
    </Suspense>
  );
}
