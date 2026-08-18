import { preventativeStatus, vaccinationStatus, isMedicationActive } from "./petCare";

export const computePetBadges = (pet, preventatives = [], vaccinations = [], medications = []) => {
  const badges = [];

  if (pet.profile_type === "stray") badges.push({ key: "stray", label: "Stray", dot: "bg-amber-400", text: "text-amber-600" });
  if (pet.profile_type === "neonatal") badges.push({ key: "neonatal", label: "Neonatal Kitten", dot: "bg-primary", text: "text-primary" });
  if (pet.profile_type === "nursing_mother") badges.push({ key: "nursing", label: "Nursing Mother", dot: "bg-blue-400", text: "text-blue-500" });
  if (pet.profile_type === "senior") badges.push({ key: "senior", label: "Senior Pet", dot: "bg-indigo-400", text: "text-indigo-500" });

  const activeMeds = medications.some(isMedicationActive);
  if (activeMeds) badges.push({ key: "med", label: "Medication Active", dot: "bg-yellow-400", text: "text-yellow-500" });

  const vacOverdue = vaccinations.some((v) => vaccinationStatus(v).color === "red");
  const vacDueSoon = vaccinations.some((v) => vaccinationStatus(v).color === "yellow");
  if (vacOverdue) badges.push({ key: "vac_overdue", label: "Vaccines Overdue", dot: "bg-red-400", text: "text-red-500" });
  else if (vacDueSoon) badges.push({ key: "vac_soon", label: "Vaccines Due Soon", dot: "bg-orange-400", text: "text-orange-500" });

  const prevOverdue = preventatives.some((p) => preventativeStatus(p).color === "red");
  const prevDueSoon = preventatives.some((p) => preventativeStatus(p).color === "yellow");
  if (prevOverdue) badges.push({ key: "prev_overdue", label: "Preventive Overdue", dot: "bg-red-400", text: "text-red-500" });
  else if (prevDueSoon) badges.push({ key: "prev_soon", label: "Preventive Due Soon", dot: "bg-orange-400", text: "text-orange-500" });

  if (badges.length === 0 && pet.health_status !== "has_issues") {
    badges.push({ key: "healthy", label: "Healthy", dot: "bg-green-400", text: "text-green-500" });
  }
  return badges;
};