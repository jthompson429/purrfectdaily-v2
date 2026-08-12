import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { canCreate, canUpdate, canDelete } from "../../shared/rolePermissions.ts";

const CRUD_ENTITIES = [
  "PetProfile", "CareTask", "CompletionLog", "EmergencyInfo", "PayConfig",
  "DailyNotification", "MedicationSchedule", "PetMedication", "Preventative",
  "Vaccination", "VetVisit", "WeightLog", "NeonatalKitten", "NeonatalGroup",
  "NeonatalFeeding", "NeonatalWeight", "NeonatalElimination", "NeonatalMotherLog",
  "CatTask", "ClipboardEntry", "ClipboardNotification",
];

async function auditLog(base44, wsId, user, action, entityType, entityId) {
  try {
    await base44.asServiceRole.entities.WorkspaceAuditLog.create({
      workspace_id: wsId,
      actor_user_id: user.id,
      actor_email: user.email,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: action,
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

async function notifyUrgentClipboardEntry(base44, wsId, entry, excludeNotifiedUserIds = new Set()) {
  const members = await base44.asServiceRole.entities.WorkspaceMember.filter({
    workspace_id: wsId,
    status: "active",
  });
  const createdAt = new Date().toISOString();
  const notifications = members
    .filter(
      (member) =>
        Boolean(member.user_id) &&
        member.clipboard_in_app_alerts !== false &&
        !excludeNotifiedUserIds.has(member.user_id),
    )
    .map((member) => ({
      workspace_id: wsId,
      recipient_user_id: member.user_id,
      entry_id: entry.id,
      title: entry.title || "Urgent clipboard entry",
      message: entry.details || "An urgent item was added to the Digital Clipboard.",
      priority: "urgent",
      created_at: createdAt,
      read: false,
    }));
  if (notifications.length > 0) {
    await base44.asServiceRole.entities.ClipboardNotification.bulkCreate(notifications);
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { entity, action, data, id, workspace_id: wsId } = body;

    if (!wsId) return Response.json({ error: "Workspace ID required" }, { status: 400 });
    if (!CRUD_ENTITIES.includes(entity)) {
      return Response.json({ error: `Entity ${entity} not supported` }, { status: 400 });
    }

    // Verify workspace membership and get role
    const membership = await getMembership(base44, wsId, user.id);
    if (!membership) {
      return Response.json({ error: "You do not have access to this workspace." }, { status: 403 });
    }
    const role = membership.role;
    const entityApi = base44.asServiceRole.entities[entity];

    // --- CREATE ---
    if (action === "create") {
      if (!canCreate(role)) {
        return Response.json({ error: "You have read-only access to this workspace." }, { status: 403 });
      }
      const result = await entityApi.create({ ...data, workspace_id: wsId });

      // Important and normal entries stay quiet. Urgent delivery follows
      // each active member's workspace-managed in-app preference.
      if (entity === "ClipboardEntry" && data?.priority === "urgent") {
        await notifyUrgentClipboardEntry(base44, wsId, result);
      }

      await auditLog(base44, wsId, user, `create_${entity}`, entity, result.id);
      return Response.json({ data: result });
    }

    // --- BULK CREATE ---
    if (action === "bulkCreate") {
      if (!canCreate(role)) {
        return Response.json({ error: "You have read-only access to this workspace." }, { status: 403 });
      }
      const records = (data || []).map((r) => ({ ...r, workspace_id: wsId }));
      const result = await entityApi.bulkCreate(records);
      await auditLog(base44, wsId, user, `bulkCreate_${entity}`, entity, null);
      return Response.json({ data: result });
    }

    // --- BULK UPDATE ---
    if (action === "bulkUpdate") {
      if (!canUpdate(role)) {
        return Response.json({ error: "You have read-only access to this workspace." }, { status: 403 });
      }
      const records = (data || []).map((r) => {
        if (r.id) return r; // bulkUpdate uses {id, ...fields}
        return r;
      });
      const result = await entityApi.bulkUpdate(records);
      await auditLog(base44, wsId, user, `bulkUpdate_${entity}`, entity, null);
      return Response.json({ data: result });
    }

    // --- UPDATE ---
    if (action === "update") {
      if (!canUpdate(role)) {
        return Response.json({ error: "You have read-only access to this workspace." }, { status: 403 });
      }
      const record = await entityApi.get(id);
      if (!record || record.workspace_id !== wsId) {
        return Response.json({ error: "Record not found in this workspace." }, { status: 404 });
      }
      const result = await entityApi.update(id, data);

      // Escalating an existing Clipboard entry to urgent creates the same
      // member notifications as creating it urgent.
      if (
        entity === "ClipboardEntry" &&
        data?.priority === "urgent" &&
        record.priority !== "urgent"
      ) {
        const existingNotifications =
          await base44.asServiceRole.entities.ClipboardNotification.filter({
            workspace_id: wsId,
            entry_id: id,
          });
        const notifiedUserIds = new Set(
          existingNotifications.map((notification) => notification.recipient_user_id),
        );
        await notifyUrgentClipboardEntry(base44, wsId, result, notifiedUserIds);
      }

      await auditLog(base44, wsId, user, `update_${entity}`, entity, id);
      return Response.json({ data: result });
    }

    // --- UPDATE MANY ---
    if (action === "updateMany") {
      if (!canUpdate(role)) {
        return Response.json({ error: "You have read-only access to this workspace." }, { status: 403 });
      }
      const { query, update } = body;
      const result = await entityApi.updateMany({ ...query, workspace_id: wsId }, update);
      await auditLog(base44, wsId, user, `updateMany_${entity}`, entity, null);
      return Response.json({ data: result });
    }

    // --- DELETE ---
    if (action === "delete") {
      if (!canDelete(role)) {
        const msg = role === "caregiver"
          ? "Caregivers cannot delete records."
          : "You have read-only access to this workspace.";
        return Response.json({ error: msg }, { status: 403 });
      }
      const record = await entityApi.get(id);
      if (!record || record.workspace_id !== wsId) {
        return Response.json({ error: "Record not found in this workspace." }, { status: 404 });
      }
      const result = await entityApi.delete(id);
      await auditLog(base44, wsId, user, `delete_${entity}`, entity, id);
      return Response.json({ data: result });
    }

    // --- DELETE MANY ---
    if (action === "deleteMany") {
      if (!canDelete(role)) {
        const msg = role === "caregiver"
          ? "Caregivers cannot delete records."
          : "You have read-only access to this workspace.";
        return Response.json({ error: msg }, { status: 403 });
      }
      const { query } = body;
      const result = await entityApi.deleteMany({ ...query, workspace_id: wsId });
      await auditLog(base44, wsId, user, `deleteMany_${entity}`, entity, null);
      return Response.json({ data: result });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}