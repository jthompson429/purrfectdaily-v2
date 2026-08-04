import { preventativeStatus, vaccinationStatus, isMedicationActive } from "./petCare";

// Determines the status badges shown on a pet card. Order matters (severity first).
export const computePetBadges = (pet, preventatives = [], vaccinations = [], medications = []) => {
  const badges = [];

  if (pet.profile_type === "neonatal") badges.push({ key: "neonatal", label: "Neonatal Kitten", dot: "bg-purple-400", text: "text-purple-300" });
  if (pet.profile_type === "nursing_mother") badges.push({ key: "nursing", label: "Nursing Mother", dot: "bg-blue-400", text: "text-blue-300" });
  if (pet.profile_type === "senior") badges.push({ key: "senior", label: "Senior Pet", dot: "bg-indigo-400", text: "text-indigo-300" });

  const activeMeds = medications.some(isMedicationActive) || (pet.current_medications && pet.current_medications.trim().length > 0);
  if (activeMeds) badges.push({ key: "med", label: "Medication Active", dot: "bg-yellow-400", text: "text-yellow-300" });

  const vacOverdue = vaccinations.some((v) => vaccinationStatus(v).color === "red");
  const vacDueSoon = vaccinations.some((v) => vaccinationStatus(v).color === "yellow");
  if (vacOverdue) badges.push({ key: "vac_overdue", label: "Vaccines Overdue", dot: "bg-red-400", text: "text-red-300" });
  else if (vacDueSoon) badges.push({ key: "vac_soon", label: "Vaccines Due Soon", dot: "bg-orange-400", text: "text-orange-300" });

  const prevOverdue = preventatives.some((p) => preventativeStatus(p).color === "red");
  if (prevOverdue) badges.push({ key: "prev_overdue", label: "Preventive Overdue", dot: "bg-red-400", text: "text-red-300" });

  if (badges.length === 0 && pet.health_status !== "has_issues") {
    badges.push({ key: "healthy", label: "Healthy", dot: "bg-green-400", text: "text-green-300" });
  }
  return badges;
};