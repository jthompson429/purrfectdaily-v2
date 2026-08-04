// Role permission constants and helpers for server-side enforcement.
// Imported by backend functions (workspaceCrud, workspaceManage).

export function canCreate(role) {
  return role === "owner" || role === "admin" || role === "caregiver";
}

export function canUpdate(role) {
  return role === "owner" || role === "admin" || role === "caregiver";
}

export function canDelete(role) {
  return role === "owner" || role === "admin";
}

export function canManageMembers(role) {
  return role === "owner" || role === "admin";
}

export function canTransferOwnership(role) {
  return role === "owner";
}

export function canDeleteWorkspace(role) {
  return role === "owner";
}

// Admin can only change caregiver/viewer roles to caregiver/viewer.
// Owner can change anyone to any role.
export function canChangeRole(actorRole, targetCurrentRole, newRole) {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") {
    if (targetCurrentRole === "owner" || targetCurrentRole === "admin") return false;
    if (newRole === "owner" || newRole === "admin") return false;
    return true;
  }
  return false;
}

// Owner can remove anyone except the last owner.
// Admin can remove caregiver/viewer only.
export function canRemoveMember(actorRole, targetRole, ownerCount) {
  if (!canManageMembers(actorRole)) return false;
  if (targetRole === "owner") {
    if (actorRole !== "owner") return false;
    if (ownerCount <= 1) return false;
    return true;
  }
  if (actorRole === "admin" && targetRole === "admin") return false;
  return true;
}