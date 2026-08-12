import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

async function getMembership(base44, workspaceId, userId) {
  const memberships = await base44.asServiceRole.entities.WorkspaceMember.filter({
    workspace_id: workspaceId,
    user_id: userId,
    status: "active",
  });
  return memberships[0] || null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { entry_id: entryId, workspace_id: workspaceId } = await req.json();
    if (!entryId || !workspaceId) {
      return Response.json(
        { error: "Clipboard entry and workspace are required." },
        { status: 400 },
      );
    }

    const membership = await getMembership(base44, workspaceId, user.id);
    if (!membership) {
      return Response.json(
        { error: "You do not have access to this workspace." },
        { status: 403 },
      );
    }

    const entry = await base44.asServiceRole.entities.ClipboardEntry.get(entryId);
    if (!entry || entry.workspace_id !== workspaceId) {
      return Response.json(
        { error: "Clipboard entry was not found in this workspace." },
        { status: 404 },
      );
    }

    const existing = await base44.asServiceRole.entities.ClipboardAcknowledgement.filter({
      workspace_id: workspaceId,
      entry_id: entryId,
      user_id: user.id,
    });

    if (existing.length > 0) {
      return Response.json({ data: existing[0], already_acknowledged: true });
    }

    const acknowledgement =
      await base44.asServiceRole.entities.ClipboardAcknowledgement.create({
        workspace_id: workspaceId,
        entry_id: entryId,
        user_id: user.id,
        user_name: user.full_name || user.email || "Workspace member",
        seen_at: new Date().toISOString(),
      });

    try {
      await base44.asServiceRole.entities.WorkspaceAuditLog.create({
        workspace_id: workspaceId,
        actor_user_id: user.id,
        actor_email: user.email,
        action: "acknowledge_ClipboardEntry",
        entity_type: "ClipboardEntry",
        entity_id: entryId,
        details: "Marked clipboard entry as seen",
        event_time: new Date().toISOString(),
      });
    } catch (_) {
      // Acknowledgement succeeds even if non-blocking audit logging fails.
    }

    return Response.json({ data: acknowledgement, already_acknowledged: false });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unable to acknowledge clipboard entry." },
      { status: 500 },
    );
  }
}
