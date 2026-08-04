import { useState, useRef, useEffect } from "react";
import { ChevronDown, Building2, Check, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/workspaceContext";

export default function WorkspaceSwitcher() {
  const { activeWorkspaceId, activeWorkspaceName, activeWorkspaceRole, workspaces, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const roleColors = { owner: "text-primary", admin: "text-primary", caregiver: "text-muted-foreground", viewer: "text-muted-foreground" };

  return (
    <div className="border-b border-border bg-card/60 backdrop-blur px-4 py-2 flex items-center justify-between">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground font-heading truncate max-w-[200px]">
            {activeWorkspaceName || "No workspace"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-xl border border-border bg-popover shadow-lg p-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">Workspaces</p>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { switchWorkspace(ws.id); setOpen(false); }}
                className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-muted text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{ws.name}</p>
                  <p className={`text-xs capitalize ${roleColors[ws.role]}`}>{ws.role}</p>
                </div>
                {ws.id === activeWorkspaceId && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
              </button>
            ))}
            <div className="border-t border-border mt-2 pt-2">
              <Link to="/workspace-settings" onClick={() => setOpen(false)}>
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Workspace Settings</span>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
      <span className={`text-xs capitalize font-medium ${roleColors[activeWorkspaceRole]}`}>{activeWorkspaceRole}</span>
    </div>
  );
}