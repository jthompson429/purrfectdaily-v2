import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  canManageMembers, canTransferOwnership, canDeleteWorkspace,
  canChangeRole, canRemoveMember,
} from "../../shared/rolePermissions.ts";

async function auditLog(base44, wsId, user, action, entityType, entityId, details) {
  try {
    await base44.asServiceRole.entities.WorkspaceAuditLog.create({
      workspace_id: wsId,
      actor_user_id: user.id,
      actor_email: user.email,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || action,
      event_time: new Date().toISOString(),
    });
  } catch (e) { /* non-blocking */ }
}

async function getMembership(base44, wsId, userId) {
  const memberships = await base44.asServiceRole.entities.WorkspaceMember.filter({
    workspace_id: wsId, user_id: userId, status: "active",
  });
  return memberships[0] || null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // --- CREATE PERSONAL WORKSPACE ---
    // Any authenticated user can create their first workspace.
    if (action === "createPersonalWorkspace") {
      const existing = await base44.asServiceRole.entities.WorkspaceMember.filter({
        user_id: user.id, status: "active",
      });
      if (existing.length > 0) {
        return Response.json({ error: "You already have a workspace." }, { status: 400 });
      }
      const firstName = user.full_name?.split(" ")[0];
      const name = body.name || (firstName ? `${firstName}'s Pet Care` : "My Pet Care Workspace");
      const ws = await base44.asServiceRole.entities.Workspace.create({
        name,
        workspace_type: "household",
        owner_user_id: user.id,
        owner_email: user.email,
        member_user_ids: [user.id],
        member_emails: [user.email],
        active: true,
      });
      await base44.asServiceRole.entities.WorkspaceMember.create({
        workspace_id: ws.id,
        user_id: user.id,
        email: user.email,
        display_name: user.full_name || user.email,
        role: "owner",
        status: "active",
        clipboard_in_app_alerts: true,
        clipboard_email_alerts: false,
      });
      // Sync user entity
      await base44.asServiceRole.entities.User.update(user.id, {
        workspace_ids: [...(user.workspace_ids || []), ws.id],
        active_workspace_id: ws.id,
        active_workspace_role: "owner",
        can_write_workspace: true,
        can_delete_workspace: true,
      });
      await auditLog(base44, ws.id, user, "workspace_created", "Workspace", ws.id, `Created workspace ${name}`);
      return Response.json({ data: { id: ws.id, name, role: "owner" } });
    }

    // All other actions require a workspace_id
    const wsId = body.workspace_id;
    if (!wsId) return Response.json({ error: "Workspace ID required" }, { status: 400 });

    const membership = await getMembership(base44, wsId, user.id);
    if (!membership) {
      return Response.json({ error: "You do not have access to this workspace." }, { status: 403 });
    }
    const role = membership.role;

    // --- INVITE ---
    if (action === "invite") {
      if (!canManageMembers(role)) {
        return Response.json({ error: "Only workspace Owners and Admins can manage members." }, { status: 403 });
      }
      const { email, role: inviteRole } = body;
      if (!email || !email.trim()) return Response.json({ error: "Email required" }, { status: 400 });
      const normalizedEmail = email.trim().toLowerCase();
      // Check for existing pending invitation
      const existing = await base44.asServiceRole.entities.WorkspaceInvitation.filter({
        workspace_id: wsId, email: normalizedEmail, status: "pending",
      });
      if (existing.length > 0) {
        return Response.json({ error: "An invitation is already pending for this email." }, { status: 400 });
      }
      const inv = await base44.asServiceRole.entities.WorkspaceInvitation.create({
        workspace_id: wsId,
        email: normalizedEmail,
        role: inviteRole || "caregiver",
        status: "pending",
        invited_by_user_id: user.id,
        invited_by_email: user.email,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      try { await base44.users.inviteUser(normalizedEmail, "user"); } catch (e) { /* non-blocking */ }
      await auditLog(base44, wsId, user, "invitation_sent", "WorkspaceInvitation", inv.id, `Invited ${normalizedEmail} as ${inviteRole}`);
      return Response.json({ data: inv });
    }

    // --- CHANGE ROLE ---
    if (action === "changeRole") {
      if (!canManageMembers(role)) {
        return Response.json({ error: "Only workspace Owners and Admins can manage members." }, { status: 403 });
      }
      const { memberId, newRole } = body;
      const member = await base44.asServiceRole.entities.WorkspaceMember.get(memberId);
      if (!member || member.workspace_id !== wsId) {
        return Response.json({ error: "Member not found in this workspace." }, { status: 404 });
      }
      if (!canChangeRole(role, member.role, newRole)) {
        return Response.json({ error: "You cannot change this member's role." }, { status: 403 });
      }
      await base44.asServiceRole.entities.WorkspaceMember.update(memberId, { role: newRole });
      await auditLog(base44, wsId, user, "member_role_changed", "WorkspaceMember", memberId, `Changed ${member.email} to ${newRole}`);
      return Response.json({ data: { ok: true } });
    }

    // --- UPDATE CLIPBOARD NOTIFICATION PREFERENCES ---
    if (action === "updateClipboardNotifications") {
      if (!canManageMembers(role)) {
        return Response.json({ error: "Only workspace Owners and Admins can manage notification preferences." }, { status: 403 });
      }
      const { memberId, inApp, email } = body;
      const member = await base44.asServiceRole.entities.WorkspaceMember.get(memberId);
      if (!member || member.workspace_id !== wsId || member.status !== "active") {
        return Response.json({ error: "Active member not found in this workspace." }, { status: 404 });
      }
      const preferences = {
        clipboard_in_app_alerts: Boolean(inApp),
        clipboard_email_alerts: Boolean(email),
      };
      await base44.asServiceRole.entities.WorkspaceMember.update(memberId, preferences);
      await auditLog(
        base44,
        wsId,
        user,
        "clipboard_notification_preferences_updated",
        "WorkspaceMember",
        memberId,
        `Updated urgent Clipboard alerts for ${member.email}: in-app ${preferences.clipboard_in_app_alerts ? "on" : "off"}, generic email ${preferences.clipboard_email_alerts ? "on" : "off"}`,
      );
      return Response.json({ data: { ok: true, ...preferences } });
    }

    // --- REMOVE MEMBER ---
    if (action === "removeMember") {
      if (!canManageMembers(role)) {
        return Response.json({ error: "Only workspace Owners and Admins can manage members." }, { status: 403 });
      }
      const { memberId } = body;
      const member = await base44.asServiceRole.entities.WorkspaceMember.get(memberId);
      if (!member || member.workspace_id !== wsId) {
        return Response.json({ error: "Member not found in this workspace." }, { status: 404 });
      }
      // Count owners
      const owners = await base44.asServiceRole.entities.WorkspaceMember.filter({
        workspace_id: wsId, role: "owner", status: "active",
      });
      if (!canRemoveMember(role, member.role, owners.length)) {
        if (member.role === "owner" && owners.length <= 1) {
          return Response.json({ error: "Ownership must be transferred before the final Owner can be removed." }, { status: 403 });
        }
        return Response.json({ error: "You cannot remove this member." }, { status: 403 });
      }
      await base44.asServiceRole.entities.WorkspaceMember.delete(memberId);
      // Update workspace member lists
      const ws = await base44.asServiceRole.entities.Workspace.get(wsId);
      await base44.asServiceRole.entities.Workspace.update(wsId, {
        member_user_ids: (ws.member_user_ids || []).filter((uid) => uid !== member.user_id),
        member_emails: (ws.member_emails || []).filter((e) => e !== member.email),
      });
      await auditLog(base44, wsId, user, "member_removed", "WorkspaceMember", memberId, `Removed ${member.email}`);
      return Response.json({ data: { ok: true } });
    }

    // --- TRANSFER OWNERSHIP ---
    if (action === "transferOwnership") {
      if (!canTransferOwnership(role)) {
        return Response.json({ error: "Only the workspace Owner can transfer ownership." }, { status: 403 });
      }
      const { newOwnerId } = body;
      const newOwner = await base44.asServiceRole.entities.WorkspaceMember.get(newOwnerId);
      if (!newOwner || newOwner.workspace_id !== wsId) {
        return Response.json({ error: "Member not found in this workspace." }, { status: 404 });
      }
      if (newOwner.role === "owner") {
        return Response.json({ error: "This member is already the owner." }, { status: 400 });
      }
      const ws = await base44.asServiceRole.entities.Workspace.get(wsId);
      await base44.asServiceRole.entities.Workspace.update(wsId, {
        owner_user_id: newOwner.user_id,
        owner_email: newOwner.email,
      });
      await base44.asServiceRole.entities.WorkspaceMember.update(membership.id, { role: "admin" });
      await base44.asServiceRole.entities.WorkspaceMember.update(newOwnerId, { role: "owner" });
      await auditLog(base44, wsId, user, "ownership_transferred", "Workspace", wsId, `Transferred to ${newOwner.email}`);
      return Response.json({ data: { ok: true } });
    }

    // --- ACCEPT INVITATION ---
    if (action === "acceptInvitation") {
      const { invitationId } = body;
      const inv = await base44.asServiceRole.entities.WorkspaceInvitation.get(invitationId);
      if (!inv || inv.status !== "pending") {
        return Response.json({ error: "Invitation not found or already processed." }, { status: 404 });
      }
      if (inv.email !== user.email) {
        return Response.json({ error: "This invitation is not for your account." }, { status: 403 });
      }
      // Create membership
      await base44.asServiceRole.entities.WorkspaceMember.create({
        workspace_id: inv.workspace_id,
        user_id: user.id,
        email: user.email,
        display_name: user.full_name || user.email,
        role: inv.role,
        status: "active",
        clipboard_in_app_alerts: true,
        clipboard_email_alerts: false,
      });
      // Update invitation
      await base44.asServiceRole.entities.WorkspaceInvitation.update(invitationId, {
        status: "accepted",
        accepted_by_user_id: user.id,
      });
      // Update workspace member lists
      const ws = await base44.asServiceRole.entities.Workspace.get(inv.workspace_id);
      await base44.asServiceRole.entities.Workspace.update(inv.workspace_id, {
        member_user_ids: [...(ws.member_user_ids || []), user.id],
        member_emails: [...(ws.member_emails || []), user.email],
      });
      // Update user workspace_ids
      await base44.asServiceRole.entities.User.update(user.id, {
        workspace_ids: [...(user.workspace_ids || []), inv.workspace_id],
      });
      await auditLog(base44, inv.workspace_id, user, "invitation_accepted", "WorkspaceInvitation", invitationId, "Accepted invitation");
      return Response.json({ data: { workspaceId: inv.workspace_id } });
    }

    // --- REVOKE INVITATION ---
    if (action === "revokeInvitation") {
      if (!canManageMembers(role)) {
        return Response.json({ error: "Only workspace Owners and Admins can manage members." }, { status: 403 });
      }
      const { invitationId } = body;
      const inv = await base44.asServiceRole.entities.WorkspaceInvitation.get(invitationId);
      if (!inv || inv.workspace_id !== wsId) {
        return Response.json({ error: "Invitation not found in this workspace." }, { status: 404 });
      }
      await base44.asServiceRole.entities.WorkspaceInvitation.update(invitationId, { status: "revoked" });
      await auditLog(base44, wsId, user, "invitation_revoked", "WorkspaceInvitation", invitationId, `Revoked invitation to ${inv.email}`);
      return Response.json({ data: { ok: true } });
    }

    // --- UPDATE WORKSPACE ---
    if (action === "updateWorkspace") {
      if (!canManageMembers(role)) {
        return Response.json({ error: "Only workspace Owners and Admins can edit workspace settings." }, { status: 403 });
      }
      const { data } = body;
      const result = await base44.asServiceRole.entities.Workspace.update(wsId, data);
      await auditLog(base44, wsId, user, "workspace_updated", "Workspace", wsId, "Updated workspace settings");
      return Response.json({ data: result });
    }

    // --- DELETE WORKSPACE ---
    if (action === "deleteWorkspace") {
      if (!canDeleteWorkspace(role)) {
        return Response.json({ error: "Only the workspace Owner can delete the workspace." }, { status: 403 });
      }
      await base44.asServiceRole.entities.Workspace.delete(wsId);
      await auditLog(base44, wsId, user, "workspace_deleted", "Workspace", wsId, "Deleted workspace");
      return Response.json({ data: { ok: true } });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}