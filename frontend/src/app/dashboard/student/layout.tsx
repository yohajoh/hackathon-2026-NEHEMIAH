import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex selection:bg-primary/10">
      <DashboardSidebar />
      <div className="flex-1 lg:ml-72">
        <Navbar />
        <main className="h-[calc(100vh-80px)] overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
