import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { canCreate } from "../../shared/rolePermissions.ts";

const SLOTS_BY_FREQUENCY: Record<string, string[]> = {
  once_daily: ["morning"],
  twice_daily: ["morning", "evening"],
  thrice_daily: ["morning", "afternoon", "evening"],
  as_needed: ["as_needed"],
  custom: ["as_needed"],
};

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { workspace_id: wsId, medication_id: medicationId, slot, completion_date: completionDate, photo_url: photoUrl = "", notes = "" } = await req.json();
    if (!wsId || !medicationId || !slot || !completionDate) {
      return Response.json({ error: "Workspace, medication, dose period, and date are required." }, { status: 400 });
    }

    const memberships = await base44.asServiceRole.entities.WorkspaceMember.filter({
      workspace_id: wsId,
      user_id: user.id,
      status: "active",
    });
    const membership = memberships[0];
    if (!membership) return Response.json({ error: "You do not have access to this workspace." }, { status: 403 });
    if (!canCreate(membership.role)) {
      return Response.json({ error: "You have read-only access to this workspace." }, { status: 403 });
    }

    const medication = await base44.asServiceRole.entities.MedicationSchedule.get(medicationId);
    if (!medication || medication.workspace_id !== wsId) {
      return Response.json({ error: "Medication was not found in this workspace." }, { status: 404 });
    }

    if (medication.archived) {
      return Response.json({ error: "Archived medication cannot receive new dose records." }, { status: 400 });
    }
    if (medication.start_date && completionDate < medication.start_date) {
      return Response.json({ error: "This medication course has not started." }, { status: 400 });
    }
    if (medication.end_date && completionDate > medication.end_date) {
      return Response.json({ error: "This medication course is complete." }, { status: 400 });
    }

    const validSlots = medication.schedule_type === "custom"
      ? ["as_needed"]
      : SLOTS_BY_FREQUENCY[medication.frequency] || ["morning"];
    if (!validSlots.includes(slot)) {
      return Response.json({ error: "This dose period is not part of the medication schedule." }, { status: 400 });
    }
    if (medication.schedule_type === "specific_days") {
      const scheduleDays = Array.isArray(medication.schedule_days) ? medication.schedule_days : [];
      const localWeekday = new Date(`${completionDate}T12:00:00Z`).getUTCDay();
      if (!scheduleDays.includes(localWeekday)) {
        return Response.json({ error: "This medication is not scheduled for the selected day." }, { status: 400 });
      }
    }
    if (medication.schedule_type === "alternate_weeks" && medication.start_date && medication.active_week_pattern) {
      const start = new Date(`${medication.start_date}T12:00:00Z`).getTime();
      const check = new Date(`${completionDate}T12:00:00Z`).getTime();
      const weekNumber = Math.floor((check - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
      const activeWeeks = medication.active_week_pattern.split(",").map((value: string) => Number.parseInt(value.trim(), 10));
      if (!activeWeeks.includes(weekNumber)) {
        return Response.json({ error: "This medication is currently in an off-week." }, { status: 400 });
      }
    }
    if (medication.requires_photo && !photoUrl) {
      return Response.json({ error: "A proof photo is required for this medication." }, { status: 400 });
    }

    const completedAt = new Date().toISOString();
    const isManualDose = slot === "as_needed";
    const taskId = isManualDose
      ? `med_${medicationId}_as_needed_${Date.now()}`
      : `med_${medicationId}_${slot}`;

    // Scheduled periods are single, idempotent records. PRN/custom doses are
    // separate administration events and may be recorded more than once a day.
    if (!isManualDose) {
      const existing = await base44.asServiceRole.entities.CompletionLog.filter({
        workspace_id: wsId,
        task_id: taskId,
        completion_date: completionDate,
      });
      const activeExisting = existing.find((record) => record.status !== "not_applicable");
      if (activeExisting) {
        return Response.json({ data: activeExisting, already_recorded: true });
      }
    }

    const result = await base44.asServiceRole.entities.CompletionLog.create({
      workspace_id: wsId,
      task_id: taskId,
      pet_id: medication.pet_id || "",
      completion_date: completionDate,
      completed_at: completedAt,
      status: "done",
      photo_url: photoUrl,
      notes,
      completed_by: user.full_name || user.email || "",
    });

    try {
      await base44.asServiceRole.entities.WorkspaceAuditLog.create({
        workspace_id: wsId,
        actor_user_id: user.id,
        actor_email: user.email,
        action: "record_medication_dose",
        entity_type: "CompletionLog",
        entity_id: result.id,
        details: `${medicationId}:${slot}`,
        event_time: completedAt,
      });
    } catch { /* audit logging is non-blocking */ }

    return Response.json({ data: result, already_recorded: false });
  } catch (error) {
    return Response.json({ error: error.message || "Could not record medication dose." }, { status: 500 });
  }
}
