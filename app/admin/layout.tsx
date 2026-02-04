import AdminBar from "@/components/admin/AdminBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminBar />
      <main>{children}</main>
    </div>
  );
}
