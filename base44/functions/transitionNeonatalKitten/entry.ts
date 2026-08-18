import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { canUpdate } from "../../shared/rolePermissions.ts";

async function getMembership(base44, workspaceId, userId) {
  const memberships = await base44.asServiceRole.entities.WorkspaceMember.filter({
    workspace_id: workspaceId,
    user_id: userId,
    status: "active",
  });
  return memberships[0] || null;
}

async function audit(base44, workspaceId, user, action, kittenId, details = "") {
  try {
    await base44.asServiceRole.entities.WorkspaceAuditLog.create({
      workspace_id: workspaceId,
      actor_user_id: user.id,
      actor_email: user.email,
      action,
      entity_type: "NeonatalKitten",
      entity_id: kittenId,
      details: details || action,
      event_time: new Date().toISOString(),
    });
  } catch (_) {
    // Lifecycle changes must not fail because an audit entry could not be written.
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { workspace_id: workspaceId, kitten_id: kittenId, action, archive_reason: archiveReason } = await req.json();
    if (!workspaceId || !kittenId) {
      return Response.json({ error: "Workspace ID and kitten ID are required." }, { status: 400 });
    }

    const membership = await getMembership(base44, workspaceId, user.id);
    if (!membership) {
      return Response.json({ error: "You do not have access to this workspace." }, { status: 403 });
    }
    if (!canUpdate(membership.role)) {
      return Response.json({ error: "You have read-only access to this workspace." }, { status: 403 });
    }

    const kitten = await base44.asServiceRole.entities.NeonatalKitten.get(kittenId);
    if (!kitten || kitten.workspace_id !== workspaceId) {
      return Response.json({ error: "Kitten not found in this workspace." }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === "archive") {
      if (kitten.pet_profile_id || kitten.lifecycle_status === "graduated") {
        return Response.json({ error: "This kitten has already been moved to Pet Profiles." }, { status: 409 });
      }
      const allowedReasons = ["adopted", "transferred", "no_longer_in_care", "other"];
      const reason = allowedReasons.includes(archiveReason) ? archiveReason : "other";
      const updated = await base44.asServiceRole.entities.NeonatalKitten.update(kittenId, {
        active: false,
        lifecycle_status: "archived",
        archived_at: now,
        archive_reason: reason,
      });
      await audit(base44, workspaceId, user, "archive_NeonatalKitten", kittenId, `Archived: ${reason}`);
      return Response.json({ data: { kitten: updated } });
    }

    if (action === "restore") {
      if (kitten.pet_profile_id || kitten.lifecycle_status === "graduated") {
        return Response.json({ error: "A graduated kitten cannot be restored because its Pet Profile already exists." }, { status: 409 });
      }
      const updated = await base44.asServiceRole.entities.NeonatalKitten.update(kittenId, {
        active: true,
        lifecycle_status: "active",
      });
      await audit(base44, workspaceId, user, "restore_NeonatalKitten", kittenId);
      return Response.json({ data: { kitten: updated } });
    }

    if (action !== "graduate") {
      return Response.json({ error: "Unsupported lifecycle action." }, { status: 400 });
    }

    if (kitten.pet_profile_id || kitten.lifecycle_status === "graduated") {
      return Response.json({
        error: "This kitten has already been moved to Pet Profiles.",
        pet_profile_id: kitten.pet_profile_id || null,
      }, { status: 409 });
    }
    if (kitten.active === false) {
      return Response.json({ error: "Restore this kitten before moving it to Pet Profiles." }, { status: 409 });
    }

    const weights = await base44.asServiceRole.entities.NeonatalWeight.filter({
      workspace_id: workspaceId,
      kitten_id: kittenId,
    }, "-date_time", 1);
    const latestWeight = weights[0] || null;

    let pet = null;
    let petWeight = null;
    try {
      const petData: Record<string, unknown> = {
        workspace_id: workspaceId,
        name: kitten.name,
        species: "cat",
        sex: kitten.sex || "unknown",
        living_situation: "foster",
        profile_type: "foster",
        photo_url: kitten.photo_url || "",
        preferred_weight_unit: "kg",
        notes: [
          "Moved from Neonatal Care.",
          kitten.notes || "",
        ].filter(Boolean).join("\n\n"),
      };
      if (kitten.birth_date) petData.birth_date = String(kitten.birth_date).slice(0, 10);
      if (latestWeight?.weight_g != null) petData.latest_weight = latestWeight.weight_g / 1000;
      pet = await base44.asServiceRole.entities.PetProfile.create(petData);

      if (latestWeight?.weight_g != null) {
        petWeight = await base44.asServiceRole.entities.WeightLog.create({
          workspace_id: workspaceId,
          pet_id: pet.id,
          weight: latestWeight.weight_g,
          unit: "g",
          date: String(latestWeight.date_time || now).slice(0, 10),
          notes: "Latest weight carried over from Neonatal Care",
        });
      }

      const updated = await base44.asServiceRole.entities.NeonatalKitten.update(kittenId, {
        active: false,
        lifecycle_status: "graduated",
        archived_at: now,
        archive_reason: "moved_to_pet_profiles",
        pet_profile_id: pet.id,
      });
      await audit(base44, workspaceId, user, "graduate_NeonatalKitten", kittenId, `Created PetProfile ${pet.id}`);
      return Response.json({ data: { kitten: updated, pet } });
    } catch (error) {
      if (petWeight?.id) {
        try { await base44.asServiceRole.entities.WeightLog.delete(petWeight.id); } catch (_) {}
      }
      if (pet?.id) {
        try { await base44.asServiceRole.entities.PetProfile.delete(pet.id); } catch (_) {}
      }
      throw error;
    }
  } catch (error) {
    return Response.json({ error: error?.message || "Could not update the kitten lifecycle." }, { status: 500 });
  }
}
