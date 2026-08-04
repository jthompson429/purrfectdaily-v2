export const BUILTIN_AREAS = [
  "Living Room", "Dining Room", "Kitchen", "Guest Bathroom",
  "Bedroom", "Laundry Room", "Garage", "Outside", "Other"
];

export const ASSIGNMENT_ICON = { pet: "🐾", area: "🏠", general: "✦" };

// Infer the assignment type for a task, backfilling legacy records that predate the model.
export function taskAssignmentType(task) {
  if (task?.assignment_type) return task.assignment_type;
  if (task?.pet_id) return "pet";
  if (task?.area) return "area";
  return "general";
}

export function assignmentLabel(task, pets) {
  const t = taskAssignmentType(task);
  if (t === "pet") {
    const p = pets?.find((x) => x.id === task.pet_id);
    return p ? `🐾 ${p.name}` : "🐾 Pet";
  }
  if (t === "area") return `🏠 ${task.area || "Area"}`;
  return "✦ General";
}

// Heuristic: a pet profile name that actually represents a group of pets
// (e.g. "Maya & the Gang"), which should be reclassified rather than treated as one pet.
export function isGroupName(name) {
  return /(\s&\s|\sand\s|gang|\bgroup\b|,\s)/i.test(name || "");
}