import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  const writeAuditLog = useCallback(async (wsId, action, entityType, entityId, details) => {
    if (!wsId || !user) return;
    try {
      await base44.entities.WorkspaceAuditLog.create({
        workspace_id: wsId,
        actor_user_id: user.id,
        actor_email: user.email,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        event_time: new Date().toISOString(),
      });
    } catch (e) { /* audit failures should not break operations */ }
  }, [user]);

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
    const firstName = currentUser.full_name?.split(" ")[0];
    const name = firstName ? `${firstName}'s Pet Care` : "My Pet Care Workspace";
    const ws = await base44.entities.Workspace.create({
      name,
      workspace_type: "household",
      owner_user_id: currentUser.id,
      owner_email: currentUser.email,
      member_user_ids: [currentUser.id],
      member_emails: [currentUser.email],
      active: true,
    });
    await base44.auth.updateMe({
      workspace_ids: [ws.id],
      active_workspace_id: ws.id,
      active_workspace_role: "owner",
      can_write_workspace: true,
      can_delete_workspace: true,
    });
    await base44.entities.WorkspaceMember.create({
      workspace_id: ws.id,
      user_id: currentUser.id,
      email: currentUser.email,
      display_name: currentUser.full_name || currentUser.email,
      role: "owner",
      status: "active",
    });
    await writeAuditLog(ws.id, "workspace_created", "Workspace", ws.id, `Created workspace ${name}`);
    setActiveWorkspaceId(ws.id);
    setActiveWorkspace({ ...ws, role: "owner" });
    setWorkspaces([{ ...ws, role: "owner" }]);
    setLoading(false);
  }, [writeAuditLog]);

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
    await base44.entities.WorkspaceMember.create({
      workspace_id: invitation.workspace_id,
      user_id: user.id,
      email: user.email,
      display_name: user.full_name || user.email,
      role: invitation.role,
      status: "active",
    });
    await base44.entities.WorkspaceInvitation.update(invitation.id, {
      status: "accepted",
      accepted_by_user_id: user.id,
    });
    const ws = await base44.entities.Workspace.get(invitation.workspace_id);
    await base44.entities.Workspace.update(ws.id, {
      member_user_ids: [...(ws.member_user_ids || []), user.id],
      member_emails: [...(ws.member_emails || []), user.email],
    });
    await base44.auth.updateMe({
      workspace_ids: [...(user.workspace_ids || []), invitation.workspace_id],
    });
    await writeAuditLog(invitation.workspace_id, "invitation_accepted", "WorkspaceInvitation", invitation.id, "Accepted invitation");
    await loadWorkspaces();
  }, [user, writeAuditLog, loadWorkspaces]);

  const role = activeWorkspace?.role || "viewer";
  const value = {
    activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceName: activeWorkspace?.name || "",
    activeWorkspaceRole: role,
    workspaces,
    pendingInvitations,
    loading,
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