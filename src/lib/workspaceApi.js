// Frontend service layer — all workspace write operations go through
// secure backend functions (workspaceCrud / workspaceManage) that enforce
// role permissions server-side. Direct base44.entities.X.create/update/delete
// calls are blocked by RLS (data.__rls_block) and will fail.

import { base44 } from "@/api/base44Client";

async function callFn(name, payload) {
  try {
    const res = await base44.functions.invoke(name, payload);
    if (res.status >= 400) {
      throw new Error(res.data?.error || "Operation failed");
    }
    return res.data?.data;
  } catch (err) {
    const msg = err?.response?.data?.error || err?.data?.error || err?.message || "Operation failed";
    throw new Error(typeof msg === "string" ? msg : "Operation failed");
  }
}

// ---- CRUD ----
export function wsCreate(entity, data, wsId) {
  return callFn("workspaceCrud", { entity, action: "create", data, workspace_id: wsId });
}

export function wsUpdate(entity, id, data, wsId) {
  return callFn("workspaceCrud", { entity, action: "update", id, data, workspace_id: wsId });
}

export function wsDelete(entity, id, wsId) {
  return callFn("workspaceCrud", { entity, action: "delete", id, workspace_id: wsId });
}

export function wsBulkCreate(entity, records, wsId) {
  return callFn("workspaceCrud", { entity, action: "bulkCreate", data: records, workspace_id: wsId });
}

export function wsBulkUpdate(entity, records, wsId) {
  return callFn("workspaceCrud", { entity, action: "bulkUpdate", data: records, workspace_id: wsId });
}

export function wsUpdateMany(entity, query, update, wsId) {
  return callFn("workspaceCrud", { entity, action: "updateMany", query, update, workspace_id: wsId });
}

export function wsDeleteMany(entity, query, wsId) {
  return callFn("workspaceCrud", { entity, action: "deleteMany", query, workspace_id: wsId });
}

export function wsTransitionNeonatalGroup(groupId, action, wsId) {
  return callFn("transitionNeonatalGroup", {
    group_id: groupId,
    action,
    workspace_id: wsId,
  });
}

export function wsTransitionNeonatalKitten(kittenId, action, archiveReason, wsId) {
  return callFn("transitionNeonatalKitten", {
    kitten_id: kittenId,
    action,
    archive_reason: archiveReason,
    workspace_id: wsId,
  });
}

export function wsRecordMedicationDose(data, wsId) {
  return callFn("recordMedicationDose", { ...data, workspace_id: wsId });
}

export function wsCorrectMedicationDose(completionLogId, reason, wsId) {
  return callFn("correctMedicationDose", {
    completion_log_id: completionLogId,
    reason,
    workspace_id: wsId,
  });
}

// ---- Workspace Management ----
export function wsManage(action, params = {}) {
  return callFn("workspaceManage", { action, ...params });
}