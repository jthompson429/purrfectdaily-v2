import { Outlet } from "react-router-dom";
import BottomNav from "@/components/care/BottomNav";
import SidebarNav from "@/components/SidebarNav";
import { WorkspaceProvider } from "@/lib/workspaceContext";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";

export default function Layout() {
  return (
    <WorkspaceProvider>
      <div className="flex h-screen bg-background">
        <aside className="hidden lg:flex shrink-0 h-full">
          <SidebarNav />
        </aside>
        <div className="flex flex-col flex-1 min-w-0">
          <WorkspaceSwitcher />
          <main className="flex-1 overflow-y-auto">
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