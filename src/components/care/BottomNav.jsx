import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Building2, Cat, ClipboardList, Home, MoreHorizontal,
  Phone, Pill, Settings, X,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "Today" },
  { path: "/manage", icon: Settings, label: "Profiles" },
  { path: "/medications", icon: Pill, label: "Meds" },
  { path: "/emergency", icon: Phone, label: "Emergency" },
];

const MORE_ITEMS = [
  {
    path: "/clipboard",
    icon: ClipboardList,
    label: "Digital Clipboard",
    description: "Observations and handoffs",
  },
  {
    path: "/neonatal",
    icon: Cat,
    label: "Neonatal",
    description: "Foster groups and growth",
  },
  {
    path: "/workspace-settings",
    icon: Building2,
    label: "Workspace",
    description: "Members and workspace settings",
  },
];

function isActive(pathname, path) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(path + "/");
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => isActive(pathname, item.path));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close more menu"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="absolute inset-x-3 bottom-[88px] rounded-2xl border bg-background p-3 shadow-2xl"
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-sm font-black">More</p>
              <button
                type="button"
                aria-label="Close more menu"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                onClick={() => setMoreOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {MORE_ITEMS.map(({ path, icon: Icon, label, description }) => {
                const active = isActive(pathname, path);
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-primary/15" : "bg-muted"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-50 shrink-0 px-4 pb-safe bg-background/95 backdrop-blur-xl border-t border-border">
        <div className="max-w-lg mx-auto flex items-center justify-around py-3">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const active = isActive(pathname, path);
            return (
              <Link key={path} to={path} className="flex flex-col items-center gap-1 min-w-[58px] py-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? "bg-primary/15" : ""}`}>
                  <Icon className={`h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground/60"}`} />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground/60"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-label="More navigation"
            onClick={() => setMoreOpen((open) => !open)}
            className="flex flex-col items-center gap-1 min-w-[58px] py-1"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${moreOpen || moreActive ? "bg-primary/15" : ""}`}>
              <MoreHorizontal className={`h-5 w-5 transition-colors ${moreOpen || moreActive ? "text-primary" : "text-muted-foreground/60"}`} />
            </div>
            <span className={`text-[10px] font-medium transition-colors ${moreOpen || moreActive ? "text-primary" : "text-muted-foreground/60"}`}>
              More
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
