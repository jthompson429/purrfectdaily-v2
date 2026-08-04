import { Link, useLocation } from "react-router-dom";
import { Home, Pill, Phone, Settings, Cat } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Today" },
  { path: "/medications", icon: Pill, label: "Meds" },
  { path: "/emergency", icon: Phone, label: "Emergency" },
  { path: "/neonatal", icon: Cat, label: "Neonatal" },
  { path: "/manage", icon: Settings, label: "Profiles" },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <div className="shrink-0 px-4 pb-safe bg-background/95 backdrop-blur-xl border-t border-border">
      <div className="max-w-lg mx-auto flex items-center justify-around py-3">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <Link key={path} to={path} className="flex flex-col items-center gap-1 min-w-[60px] py-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? "bg-primary/15" : ""}`}>
                <Icon className={`h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground/60"}`} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground/60"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}