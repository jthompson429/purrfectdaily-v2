import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { wsManage } from "@/lib/workspaceApi";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  const writeAuditLog = useCallback(async () => { /* backend functions handle auditing */ }, []);

  const processMemberships = useCallback(async (memberships, currentUser) => {
    const wsDetails = await Promise.all(
      memberships.map(async (m) => {
        try {
          const ws = await base44.entities.Workspace.get(m.workspace_id);
          return { ...ws, role: m.role, membershipId: m.id };
        } catch { return null; }
      })
    );
    const valid = wsDetails.filter(Boolean);
    setWorkspaces(valid);

    let activeId = currentUser.active_workspace_id;
    let activeWs = valid.find((w) => w.id === activeId);
    if (!activeWs && valid.length > 0) {
      activeWs = valid[0];
      activeId = activeWs.id;
    }

    if (activeWs) {
      setActiveWorkspaceId(activeId);
      setActiveWorkspace(activeWs);
      const role = activeWs.role;
      await base44.auth.updateMe({
        active_workspace_id: activeId,
        active_workspace_role: role,
        can_write_workspace: role !== "viewer",
        can_delete_workspace: role === "owner" || role === "admin",
        workspace_ids: valid.map((w) => w.id),
      });
    }
    setLoading(false);
  }, []);

  const createPersonalWorkspace = useCallback(async (currentUser) => {
    const result = await wsManage("createPersonalWorkspace");
    await base44.auth.updateMe({
      workspace_ids: [result.id],
      active_workspace_id: result.id,
      active_workspace_role: "owner",
      can_write_workspace: true,
      can_delete_workspace: true,
    });
    const ws = await base44.entities.Workspace.get(result.id);
    setActiveWorkspaceId(result.id);
    setActiveWorkspace({ ...ws, role: "owner" });
    setWorkspaces([{ ...ws, role: "owner" }]);
    setLoading(false);
  }, []);

  const loadWorkspaces = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const memberships = await base44.entities.WorkspaceMember.filter({ user_id: user.id, status: "active" });
      const invitations = await base44.entities.WorkspaceInvitation.filter({ email: user.email, status: "pending" });
      setPendingInvitations(invitations);

      if (memberships.length === 0) {
        if (invitations.length === 0) {
          await createPersonalWorkspace(user);
        } else {
          setLoading(false);
        }
        return;
      }
      await processMemberships(memberships, user);
    } catch (e) {
      console.error("Workspace load failed:", e);
      setLoading(false);
    }
  }, [user, createPersonalWorkspace, processMemberships]);

  useEffect(() => {
    if (isAuthenticated && user) loadWorkspaces();
    else if (!isAuthenticated) setLoading(false);
  }, [isAuthenticated, user?.id, loadWorkspaces]);

  const switchWorkspace = useCallback(async (workspaceId) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;
    const role = ws.role;
    await base44.auth.updateMe({
      active_workspace_id: workspaceId,
      active_workspace_role: role,
      can_write_workspace: role !== "viewer",
      can_delete_workspace: role === "owner" || role === "admin",
    });
    setActiveWorkspaceId(workspaceId);
    setActiveWorkspace(ws);
    await writeAuditLog(workspaceId, "workspace_switched", "Workspace", workspaceId, `Switched to ${ws.name}`);
    window.location.reload();
  }, [workspaces, writeAuditLog]);

  const acceptInvitation = useCallback(async (invitation) => {
    await wsManage("acceptInvitation", { invitationId: invitation.id });
    await base44.auth.updateMe({
      workspace_ids: [...(user.workspace_ids || []), invitation.workspace_id],
    });
    await loadWorkspaces();
  }, [user, loadWorkspaces]);

  const role = activeWorkspace?.role || "viewer";
  const value = {
    activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceName: activeWorkspace?.name || "",
    activeWorkspaceRole: role,
    workspaces,
    pendingInvitations,
    loading,
    user,
    switchWorkspace,
    acceptInvitation,
    writeAuditLog,
    reload: loadWorkspaces,
    canWrite: role !== "viewer",
    canDelete: role === "owner" || role === "admin",
    canManageMembers: role === "owner" || role === "admin",
    isOwner: role === "owner",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}