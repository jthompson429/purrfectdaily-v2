import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Cat, Pill, Settings, X, PawPrint, Building2, ClipboardList } from "lucide-react";
import { useClipboardUnseenCount } from "@/hooks/useClipboardUnseenCount";
import { useWorkspace } from "@/lib/workspaceContext";

const GROUPS = [
  {
    label: "Care",
    items: [
      { icon: Home, label: "Today", path: "/" },
      { icon: ClipboardList, label: "Clipboard", path: "/clipboard" },
      {
        icon: Cat,
        label: "Pets",
        sub: [
          { label: "Pet Profiles", path: "/manage" },
          { label: "Neonatal Dashboard", path: "/neonatal" },
        ],
      },
      {
        icon: Pill,
        label: "Health",
        sub: [
          { label: "Medications", path: "/medications" },
          { label: "Emergency Info", path: "/emergency" },
        ],
      },
    ],
  },
  {
    label: "Admin",
    items: [{ icon: Settings, label: "Manage", path: "/manage" }, { icon: Building2, label: "Workspace", path: "/workspace-settings" }],
  },
];

export default function SidebarNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openLabel, setOpenLabel] = useState(null);
  const clipboardUnseenCount = useClipboardUnseenCount();
  const { activeWorkspace } = useWorkspace();

  // Close submenu on route change
  useEffect(() => {
    setOpenLabel(null);
  }, [location.pathname]);

  // Escape to close
  useEffect(() => {
    if (!openLabel) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpenLabel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openLabel]);

  const isPathActive = (path) => {
    if (!path) return false;
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isItemActive = (item) => {
    if (item.path) return isPathActive(item.path);
    if (item.sub) return item.sub.some((s) => isPathActive(s.path));
    return false;
  };

  const handleBtnClick = (item) => {
    if (item.sub) {
      setOpenLabel((prev) => (prev === item.label ? null : item.label));
    } else {
      setOpenLabel(null);
      navigate(item.path);
    }
  };

  const handleSubClick = (path) => {
    setOpenLabel(null);
    navigate(path);
  };

  const openItem = useMemo(() => {
    for (const g of GROUPS) {
      const found = g.items.find((i) => i.label === openLabel);
      if (found) return found;
    }
    return null;
  }, [openLabel]);

  return (
    <div className="sn3n-stage">
      <nav className="sn3n-rail" aria-label="Primary" data-open={openLabel ? "" : undefined}>
        <div className="sn3n-bar">
          {/* Brand */}
          <div className="sn3n-item">
            <span className="sn3n-brand-seat">
              <button
                className="sn3n-brand-btn"
                type="button"
                aria-label={activeWorkspace?.name ? `${activeWorkspace.name} home` : "PurrfectDaily home"}
                tabIndex={-1}
              >
                {activeWorkspace?.logo_url ? (
                  <img src={activeWorkspace.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <PawPrint className="sn3n-brand-icon w-5 h-5" />
                )}
              </button>
            </span>
          </div>

          {GROUPS.map((group) => (
            <div key={group.label} className="contents">
              <div className="sn3n-divider" role="separator" />
              <ul className="sn3n-group" aria-label={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);
                  const isOpen = openLabel === item.label;
                  return (
                    <li className="sn3n-item" key={item.label}>
                      <button
                        className="sn3n-btn relative"
                        type="button"
                        aria-current={active ? "page" : undefined}
                        aria-haspopup={item.sub ? "true" : undefined}
                        aria-expanded={item.sub ? (isOpen ? "true" : "false") : undefined}
                        aria-label={item.label}
                        title={openLabel ? undefined : item.label}
                        onClick={() => handleBtnClick(item)}
                      >
                        <Icon className="w-5 h-5" />
                        {item.path === "/clipboard" && clipboardUnseenCount > 0 && (
                          <span
                            className="absolute right-1 top-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black leading-none text-destructive-foreground"
                            aria-label={`${clipboardUnseenCount} unseen clipboard ${clipboardUnseenCount === 1 ? "entry" : "entries"}`}
                          >
                            {clipboardUnseenCount > 99 ? "99+" : clipboardUnseenCount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Morph panel (submenu) */}
        <div className="sn3n-panel" aria-hidden={openLabel ? "false" : "true"}>
          <div className="sn3n-panel-inner">
            <div className="sn3n-panel-head">
              <span className="sn3n-panel-title">{openItem?.label || ""}</span>
              <button
                className="sn3n-close"
                type="button"
                aria-label="Close submenu"
                onClick={() => setOpenLabel(null)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <ul className="sn3n-sub">
              {openItem?.sub?.map((s) => (
                <li key={s.label}>
                  <button
                    className="sn3n-sub-btn"
                    type="button"
                    aria-current={isPathActive(s.path) ? "true" : undefined}
                    onClick={() => handleSubClick(s.path)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}