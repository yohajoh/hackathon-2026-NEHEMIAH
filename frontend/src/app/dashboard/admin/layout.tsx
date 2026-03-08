import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FDF9F0] text-[#2B1A10] flex selection:bg-[#2B1A10]/10">
      <DashboardSidebar variant="admin" />
      <div className="flex-1 lg:ml-72">
        <Navbar />
        <main className="h-[calc(100vh-80px)] overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
