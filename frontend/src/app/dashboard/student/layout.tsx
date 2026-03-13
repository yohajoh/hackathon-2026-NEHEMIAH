import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { StudentRouteGuard } from "@/components/guards/StudentRouteGuard";

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-shell min-h-screen bg-[#FFFFFF] text-foreground flex selection:bg-primary/10">
      <StudentRouteGuard />
      <DashboardSidebar />
      <div className="flex-1 lg:ml-64 pt-16">
        <Navbar />
        <main className="h-[calc(100vh-64px)] overflow-y-auto bg-[#FFFFFF]">{children}</main>
      </div>
    </div>
  );
}
