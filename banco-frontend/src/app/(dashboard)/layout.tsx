import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardErrorBoundary } from "@/components/errors/DashboardErrorBoundary";
import { FloatingActions } from "@/components/enterprise/FloatingActions";
import { SkipToContent } from "@/components/shared/SkipToContent";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SkipToContent />
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto overflow-x-hidden"
            tabIndex={-1}
          >
            <div className="p-6 max-w-[1600px] mx-auto">
              <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
            </div>
          </main>
        </div>
      </div>
      <FloatingActions />
    </>
  );
}
