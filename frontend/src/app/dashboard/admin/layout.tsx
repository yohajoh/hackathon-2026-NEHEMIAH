import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { AdminRouteGuard } from "@/components/guards/AdminRouteGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell min-h-screen bg-[#FFFFFF] text-[#111111] flex selection:bg-[#142B6F]/10">
      <AdminRouteGuard />
      <DashboardSidebar variant="admin" />
      <div className="flex-1 lg:ml-64 pt-16">
        <Navbar />
        <main className="h-[calc(100vh-64px)] overflow-y-auto bg-[#FFFFFF]">{children}</main>
      </div>
    </div>
  );
}
