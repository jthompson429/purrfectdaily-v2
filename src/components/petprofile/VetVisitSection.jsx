import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Stethoscope, Plus } from "lucide-react";
import SectionCard from "./SectionCard";
import VisitRecordDialog from "./VisitRecordDialog";
import VisitCard from "./VisitCard";
import AttachmentViewer from "./AttachmentViewer";
import { useWorkspace } from "@/lib/workspaceContext";

export default function VetVisitSection({ petId }) {
  const { activeWorkspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewer, setViewer] = useState(null);
  const { data } = useQuery({ queryKey: ["vetVisits", petId], queryFn: () => base44.entities.VetVisit.filter({ pet_id: petId }, "-date") });
  const items = Array.isArray(data) ? data : [];
  const upsert = useMutation({
    mutationFn: ({ id, data }) => id ? base44.entities.VetVisit.update(id, data) : base44.entities.VetVisit.create({ ...data, workspace_id: activeWorkspaceId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vetVisits", petId] })
  });
  const remove = useMutation({ mutationFn: (id) => base44.entities.VetVisit.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["vetVisits", petId] }) });

  const handleSave = async (data, id) => {
    try {
    const saved = id ? await base44.entities.VetVisit.update(id, data) : await base44.entities.VetVisit.create({ ...data, pet_id: petId, workspace_id: activeWorkspaceId });
    const visitDate = saved?.date || data.date;

    const givenV = data.vaccinations_given || [];
    if (givenV.length) {
      const existing = await base44.entities.Vaccination.filter({ pet_id: petId });
      for (const gv of givenV) {
        const exists = existing.find((v) => v.name === gv.name && v.date_given === visitDate && (gv.name !== "custom" || v.custom_name === (gv.custom_name || "")));
        if (!exists) {
          await base44.entities.Vaccination.create({ pet_id: petId, name: gv.name, custom_name: gv.custom_name || "", date_given: visitDate, due_date: gv.due_date || "", veterinarian: saved?.veterinarian || "", workspace_id: activeWorkspaceId });
        }
      }
      qc.invalidateQueries({ queryKey: ["vaccinations", petId] });
    }

    const givenP = data.preventives_administered || [];
    if (givenP.length) {
      const existingP = await base44.entities.Preventative.filter({ pet_id: petId });
      for (const gp of givenP) {
        const dg = gp.date_given || visitDate;
        const exists = existingP.find((p) => p.name === gp.name && p.date_given === dg);
        if (!exists) {
          await base44.entities.Preventative.create({ pet_id: petId, name: gp.name, date_given: dg, frequency: gp.frequency || "monthly", custom_interval_days: gp.custom_interval_days || 30, workspace_id: activeWorkspaceId });
        }
      }
      qc.invalidateQueries({ queryKey: ["preventatives", petId] });
    }

    qc.invalidateQueries({ queryKey: ["vetVisits", petId] });
    setDialog(false); setEditing(null);
    } catch (err) {
      throw new Error(err?.message || "Could not save the veterinary visit. Please try again.");
    }
  };

  const handleAddMeds = async (visit) => {
    const meds = visit.medications_prescribed || [];
    for (const m of meds) {
      await base44.entities.PetMedication.create({
        pet_id: petId,
        workspace_id: activeWorkspaceId,
        medication_name: m.name,
        frequency: m.frequency || "twice_daily",
        start_date: m.start_date || visit.date,
        end_date: m.end_date || ""
      });
    }
    await base44.entities.VetVisit.update(visit.id, { meds_added: true });
    qc.invalidateQueries({ queryKey: ["petMedications", petId] });
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
          {items.map((v) => (
            <VisitCard
              key={v.id}
              visit={v}
              onEdit={() => { setEditing(v); setDialog(true); }}
              onDelete={() => { if (window.confirm("Delete this visit?")) remove.mutate(v.id); }}
              onAddMeds={() => handleAddMeds(v)}
              onOpenAttachment={setViewer}
            />
          ))}
        </div>
      )}
      <VisitRecordDialog open={dialog} onOpenChange={setDialog} item={editing} onSave={handleSave} />
      {viewer && <AttachmentViewer attachment={viewer} onOpenChange={(o) => { if (!o) setViewer(null); }} />}
    </SectionCard>
  );
}