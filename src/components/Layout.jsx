import { Outlet } from "react-router-dom";
import BottomNav from "@/components/care/BottomNav";
import SidebarNav from "@/components/SidebarNav";
import { WorkspaceProvider } from "@/lib/workspaceContext";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";

export default function Layout() {
  return (
    <WorkspaceProvider>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
        <aside className="hidden lg:flex shrink-0 h-full">
          <SidebarNav />
        </aside>
        <div className="flex min-h-0 flex-1 flex-col min-w-0">
          <WorkspaceSwitcher />
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Outlet />
          </main>
          <div className="lg:hidden shrink-0">
            <BottomNav />
          </div>
        </div>
      </div>
    </WorkspaceProvider>
  );
}