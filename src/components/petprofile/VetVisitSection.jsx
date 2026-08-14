import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Stethoscope, Plus } from "lucide-react";
import SectionCard from "./SectionCard";
import VisitRecordDialog from "./VisitRecordDialog";
import VisitCard from "./VisitCard";
import AttachmentViewer from "./AttachmentViewer";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate, wsDelete } from "@/lib/workspaceApi";

const vaccinationKey = (item) =>
  `${item.name || ""}::${item.name === "custom" ? item.custom_name || "" : ""}`;

const preventativeKey = (item) => (item.name || "").trim().toLowerCase();
const prescriptionKey = (item, fallbackDate = "") =>
  `${(item.medication_name || item.name || "").trim().toLowerCase()}::${item.start_date || fallbackDate}`;

export default function VetVisitSection({ petId }) {
  const { activeWorkspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewer, setViewer] = useState(null);
  const { data } = useQuery({ queryKey: ["vetVisits", petId], queryFn: () => base44.entities.VetVisit.filter({ pet_id: petId }, "-date") });
  const { data: medicationSchedules = [] } = useQuery({
    queryKey: ["medications", activeWorkspaceId, petId],
    queryFn: () => base44.entities.MedicationSchedule.filter({ workspace_id: activeWorkspaceId, pet_id: petId }, "-start_date")
  });
  const items = Array.isArray(data) ? data : [];

  const invalidateVisitCare = () => {
    qc.invalidateQueries({ queryKey: ["vetVisits", petId] });
    qc.invalidateQueries({ queryKey: ["vaccinations", petId] });
    qc.invalidateQueries({ queryKey: ["preventatives", petId] });
    qc.invalidateQueries({ queryKey: ["allVaccinations", activeWorkspaceId] });
    qc.invalidateQueries({ queryKey: ["allPreventatives", activeWorkspaceId] });
  };

  const remove = useMutation({
    mutationFn: async (id) => {
      const [vaccinations, preventatives] = await Promise.all([
        base44.entities.Vaccination.filter({ source_visit_id: id, workspace_id: activeWorkspaceId }),
        base44.entities.Preventative.filter({ source_visit_id: id, workspace_id: activeWorkspaceId })
      ]);
      await Promise.all([
        ...vaccinations.map((record) => wsDelete("Vaccination", record.id, activeWorkspaceId)),
        ...preventatives.map((record) => wsDelete("Preventative", record.id, activeWorkspaceId))
      ]);
      await wsDelete("VetVisit", id, activeWorkspaceId);
    },
    onSuccess: invalidateVisitCare
  });

  const reconcileVaccinations = async (visit, vaccinationsGiven) => {
    const linked = await base44.entities.Vaccination.filter({
      source_visit_id: visit.id,
      workspace_id: activeWorkspaceId
    });
    const unmatched = [...linked];
    const valid = (vaccinationsGiven || []).filter(
      (item) => item.name && (item.name !== "custom" || item.custom_name?.trim())
    );

    for (const item of valid) {
      const index = unmatched.findIndex((record) => vaccinationKey(record) === vaccinationKey(item));
      const existing = index >= 0 ? unmatched.splice(index, 1)[0] : null;
      const payload = {
        pet_id: petId,
        source_visit_id: visit.id,
        name: item.name,
        custom_name: item.custom_name || "",
        date_given: visit.date,
        due_date: item.due_date || "",
        veterinarian: visit.veterinarian || ""
      };
      if (existing) await wsUpdate("Vaccination", existing.id, payload, activeWorkspaceId);
      else await wsCreate("Vaccination", payload, activeWorkspaceId);
    }

    await Promise.all(unmatched.map((record) => wsDelete("Vaccination", record.id, activeWorkspaceId)));
  };

  const reconcilePreventatives = async (visit, preventativesGiven) => {
    const linked = await base44.entities.Preventative.filter({
      source_visit_id: visit.id,
      workspace_id: activeWorkspaceId
    });
    const unmatched = [...linked];
    const valid = (preventativesGiven || []).filter((item) => item.name?.trim());

    for (const item of valid) {
      const index = unmatched.findIndex((record) => preventativeKey(record) === preventativeKey(item));
      const existing = index >= 0 ? unmatched.splice(index, 1)[0] : null;
      const payload = {
        pet_id: petId,
        source_visit_id: visit.id,
        name: item.name.trim(),
        date_given: item.date_given || visit.date,
        frequency: item.frequency || "monthly",
        custom_interval_days: item.custom_interval_days || 30
      };
      if (existing) await wsUpdate("Preventative", existing.id, payload, activeWorkspaceId);
      else await wsCreate("Preventative", payload, activeWorkspaceId);
    }

    await Promise.all(unmatched.map((record) => wsDelete("Preventative", record.id, activeWorkspaceId)));
  };

  const handleSave = async (data, id) => {
    try {
      const previous = id ? items.find((visit) => visit.id === id) : null;
      const previousKeys = (previous?.medications_prescribed || []).map((item) => prescriptionKey(item, previous?.date)).sort().join("|");
      const nextKeys = (data.medications_prescribed || []).map((item) => prescriptionKey(item, data.date)).sort().join("|");
      const visitData = previous && previousKeys !== nextKeys ? { ...data, meds_added: false } : data;
      const saved = id
        ? await wsUpdate("VetVisit", id, visitData, activeWorkspaceId)
        : await wsCreate("VetVisit", { ...visitData, pet_id: petId }, activeWorkspaceId);
      const visit = { ...visitData, ...saved, id: saved?.id || id, pet_id: petId };

      await Promise.all([
        reconcileVaccinations(visit, data.vaccinations_given),
        reconcilePreventatives(visit, data.preventives_administered)
      ]);

      invalidateVisitCare();
      setDialog(false);
      setEditing(null);
    } catch (err) {
      throw new Error(err?.message || "Could not save the veterinary visit. Please try again.");
    }
  };

  const handleAddMeds = async (visit) => {
    const prescriptions = (visit.medications_prescribed || []).filter((item) => item.name?.trim());
    const linked = medicationSchedules.filter((item) => item.source_visit_id === visit.id);
    const available = [...linked];

    for (const prescription of prescriptions) {
      const key = prescriptionKey(prescription, visit.date);
      const linkedIndex = available.findIndex((item) => prescriptionKey(item) === key);
      if (linkedIndex >= 0) {
        available.splice(linkedIndex, 1);
        continue;
      }

      const legacyMatch = medicationSchedules.find(
        (item) => !item.source_visit_id && prescriptionKey(item) === key
      );
      if (legacyMatch) {
        await wsUpdate("MedicationSchedule", legacyMatch.id, { source_visit_id: visit.id }, activeWorkspaceId);
        continue;
      }

      await wsCreate("MedicationSchedule", {
        pet_id: petId,
        source_visit_id: visit.id,
        medication_name: prescription.name.trim(),
        frequency: prescription.frequency || "twice_daily",
        schedule_type: "daily",
        start_date: prescription.start_date || visit.date,
        end_date: prescription.end_date || "",
        critical: true,
        archived: false
      }, activeWorkspaceId);
    }

    await wsUpdate("VetVisit", visit.id, { meds_added: true }, activeWorkspaceId);
    qc.invalidateQueries({ queryKey: ["medications", activeWorkspaceId, petId] });
    qc.invalidateQueries({ queryKey: ["medications", activeWorkspaceId] });
    qc.invalidateQueries({ queryKey: ["vetVisits", petId] });
  };

  return (
    <SectionCard title="Veterinary Visits" icon={Stethoscope} onAdd={() => { setEditing(null); setDialog(true); }} addLabel="Add">
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-5 text-center">
          <p className="text-xs text-muted-foreground mb-3">No veterinary visits have been recorded yet.</p>
          <button onClick={() => { setEditing(null); setDialog(true); }} className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 px-3 py-1.5 rounded-lg bg-primary/10">
            <Plus className="h-3.5 w-3.5" /> Add Veterinary Visit
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((v) => {
            const linked = medicationSchedules.filter((item) => item.source_visit_id === v.id);
            const pendingMedicationCount = v.meds_added && linked.length === 0
              ? 0
              : (v.medications_prescribed || []).filter((prescription) =>
                  prescription.name?.trim() &&
                  !linked.some((item) => prescriptionKey(item) === prescriptionKey(prescription, v.date))
                ).length;
            return (
            <VisitCard
              key={v.id}
              visit={v}
              pendingMedicationCount={pendingMedicationCount}
              onEdit={() => { setEditing(v); setDialog(true); }}
              onDelete={() => { if (window.confirm("Delete this visit and its linked care records?")) remove.mutate(v.id); }}
              onAddMeds={() => handleAddMeds(v)}
              onOpenAttachment={setViewer}
            />
            );
          })}
        </div>
      )}
      <VisitRecordDialog open={dialog} onOpenChange={setDialog} item={editing} onSave={handleSave} />
      {viewer && <AttachmentViewer attachment={viewer} onOpenChange={(o) => { if (!o) setViewer(null); }} />}
    </SectionCard>
  );
}
