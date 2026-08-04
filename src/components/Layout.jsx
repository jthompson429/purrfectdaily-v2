import { Outlet } from "react-router-dom";
import BottomNav from "@/components/care/BottomNav";

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}