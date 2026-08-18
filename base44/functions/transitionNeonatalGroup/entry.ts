import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { canUpdate } from "../../shared/rolePermissions.ts";

async function membershipFor(base44, workspaceId, userId) {
  const memberships = await base44.asServiceRole.entities.WorkspaceMember.filter({
    workspace_id: workspaceId,
    user_id: userId,
    status: "active",
  });
  return memberships[0] || null;
}

async function audit(base44, workspaceId, user, action, groupId) {
  try {
    await base44.asServiceRole.entities.WorkspaceAuditLog.create({
      workspace_id: workspaceId,
      actor_user_id: user.id,
      actor_email: user.email,
      action,
      entity_type: "NeonatalGroup",
      entity_id: groupId,
      details: action,
      event_time: new Date().toISOString(),
    });
  } catch (_) {
    // Group lifecycle changes must not fail because audit logging failed.
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { workspace_id: workspaceId, group_id: groupId, action } = await req.json();
    if (!workspaceId || !groupId) {
      return Response.json({ error: "Workspace ID and group ID are required." }, { status: 400 });
    }

    const membership = await membershipFor(base44, workspaceId, user.id);
    if (!membership) {
      return Response.json({ error: "You do not have access to this workspace." }, { status: 403 });
    }
    if (!canUpdate(membership.role)) {
      return Response.json({ error: "You have read-only access to this workspace." }, { status: 403 });
    }

    const group = await base44.asServiceRole.entities.NeonatalGroup.get(groupId);
    if (!group || group.workspace_id !== workspaceId) {
      return Response.json({ error: "Group not found in this workspace." }, { status: 404 });
    }

    if (action === "archive") {
      if (group.status !== "active") {
        return Response.json({ error: "This group is already inactive." }, { status: 409 });
      }
      const kittens = await base44.asServiceRole.entities.NeonatalKitten.filter({
        workspace_id: workspaceId,
        group_id: groupId,
      });
      const activeKittens = kittens.filter((kitten) => kitten.active !== false);
      if (activeKittens.length > 0) {
        return Response.json({
          error: `Archive or move the ${activeKittens.length} active kitten${activeKittens.length === 1 ? "" : "s"} before archiving this group.`,
          active_kitten_count: activeKittens.length,
        }, { status: 409 });
      }

      const updated = await base44.asServiceRole.entities.NeonatalGroup.update(groupId, {
        status: "archived",
        archived_at: new Date().toISOString(),
      });
      await audit(base44, workspaceId, user, "archive_NeonatalGroup", groupId);
      return Response.json({ data: { group: updated } });
    }

    if (action === "restore") {
      const updated = await base44.asServiceRole.entities.NeonatalGroup.update(groupId, {
        status: "active",
      });
      await audit(base44, workspaceId, user, "restore_NeonatalGroup", groupId);
      return Response.json({ data: { group: updated } });
    }

    return Response.json({ error: "Unsupported group lifecycle action." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || "Could not update the group lifecycle." }, { status: 500 });
  }
}
