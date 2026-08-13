import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { canUpdate } from "../../shared/rolePermissions.ts";

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { workspace_id: wsId, completion_log_id: logId, reason } = await req.json();
    const correctionReason = typeof reason === "string" ? reason.trim() : "";
    if (!wsId || !logId) {
      return Response.json({ error: "Workspace and administration record are required." }, { status: 400 });
    }
    if (correctionReason.length < 3) {
      return Response.json({ error: "Enter a brief reason for the correction." }, { status: 400 });
    }

    const memberships = await base44.asServiceRole.entities.WorkspaceMember.filter({
      workspace_id: wsId,
      user_id: user.id,
      status: "active",
    });
    const membership = memberships[0];
    if (!membership) return Response.json({ error: "You do not have access to this workspace." }, { status: 403 });
    if (!canUpdate(membership.role)) {
      return Response.json({ error: "You have read-only access to this workspace." }, { status: 403 });
    }

    const log = await base44.asServiceRole.entities.CompletionLog.get(logId);
    if (!log || log.workspace_id !== wsId || !String(log.task_id || "").startsWith("med_")) {
      return Response.json({ error: "Medication administration record was not found." }, { status: 404 });
    }
    if (log.status === "not_applicable" && log.corrected_at) {
      return Response.json({ error: "This record has already been corrected." }, { status: 409 });
    }

    const medicationId = String(log.task_id).slice(4).split("_")[0];
    const medication = await base44.asServiceRole.entities.MedicationSchedule.get(medicationId);
    if (!medication || medication.workspace_id !== wsId) {
      return Response.json({ error: "The related medication was not found in this workspace." }, { status: 404 });
    }

    const correctedAt = new Date().toISOString();
    const result = await base44.asServiceRole.entities.CompletionLog.update(logId, {
      status: "not_applicable",
      original_status: log.original_status || log.status,
      corrected_at: correctedAt,
      corrected_by: user.full_name || user.email || "",
      correction_reason: correctionReason,
    });

    try {
      await base44.asServiceRole.entities.WorkspaceAuditLog.create({
        workspace_id: wsId,
        actor_user_id: user.id,
        actor_email: user.email,
        action: "correct_medication_dose",
        entity_type: "CompletionLog",
        entity_id: logId,
        details: correctionReason,
        event_time: correctedAt,
      });
    } catch { /* audit logging is non-blocking */ }

    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: error.message || "Could not correct medication administration." }, { status: 500 });
  }
}
