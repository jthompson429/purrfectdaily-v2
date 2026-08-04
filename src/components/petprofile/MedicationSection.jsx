import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Pill, Pencil, Trash2, Check } from "lucide-react";
import SectionCard from "./SectionCard";
import MedicationDialog from "./MedicationDialog";
import { isMedicationActive, doseSlots, getDose, todayStr, fmtShort } from "@/utils/petCare";
import { useWorkspace } from "@/lib/workspaceContext";

export default function MedicationSection({ petId }) {
  const { activeWorkspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const { data: items = [] } = useQuery({ queryKey: ["petMedications", petId], queryFn: () => base44.entities.PetMedication.filter({ pet_id: petId }, "-start_date") });
  const upsert = useMutation({ mutationFn: ({ id, data }) => id ? base44.entities.PetMedication.update(id, data) : base44.entities.PetMedication.create({ ...data, pet_id: petId, workspace_id: activeWorkspaceId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["petMedications", petId] }) });
  const remove = useMutation({ mutationFn: (id) => base44.entities.PetMedication.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["petMedications", petId] }) });
  const handleSave = async (data, id) => { await upsert.mutateAsync({ id, data }); setDialog(false); setEditing(null); };

  const today = todayStr();
  const toggleDose = async (med, slot) => {
    const doses = [...(med.doses || [])];
    const idx = doses.findIndex((d) => d.date === today);
    if (idx === -1) {
      doses.push({ date: today, morning: false, afternoon: false, evening: false, [slot]: true });
    } else {
      doses[idx] = { ...doses[idx], [slot]: !doses[idx][slot] };
    }
    await upsert.mutateAsync({ id: med.id, data: { doses } });
  };

  const active = items.filter(isMedicationActive);
  const archived = items.filter((m) => !isMedicationActive(m));

  return (
    <SectionCard title="Medications" icon={Pill} onAdd={() => { setEditing(null); setDialog(true); }} addLabel="Add">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">No medications</p>
      ) : (
        <div className="space-y-2.5">
          {active.map((m) => {
            const d = getDose(m, today);
            const slots = doseSlots(m);
            return (
              <div key={m.id} className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/25">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{m.medication_name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{m.frequency.replace("_", " ")} · {fmtShort(m.start_date)}{m.end_date ? ` → ${fmtShort(m.end_date)}` : ""}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditing(m); setDialog(true); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted border border-border"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => { if (window.confirm("Delete this medication?")) remove.mutate(m.id); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive bg-muted border border-border"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {slots.map((slot) => {
                    const checked = d ? d[slot] : false;
                    return (
                      <button key={slot} onClick={() => toggleDose(m, slot)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize border ${checked ? "bg-green-500/20 border-green-500/40 text-green-600" : "bg-muted border-border text-muted-foreground"}`}>
                        {checked && <Check className="h-3 w-3" />} {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {archived.length > 0 && (
            <div>
              <button onClick={() => setShowHistory((s) => !s)} className="text-[11px] text-muted-foreground hover:text-foreground font-semibold">
                {showHistory ? "Hide" : "Show"} archived ({archived.length})
              </button>
              {showHistory && (
                <div className="space-y-1.5 mt-2">
                  {archived.map((m) => (
                    <div key={m.id} className="rounded-lg p-2.5 flex items-center justify-between bg-muted">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">{m.medication_name}</p>
                        <p className="text-[10px] text-muted-foreground/70">{fmtShort(m.start_date)}{m.end_date ? ` → ${fmtShort(m.end_date)}` : ""}</p>
                      </div>
                      <button onClick={() => { if (window.confirm("Delete this medication?")) remove.mutate(m.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <MedicationDialog open={dialog} onOpenChange={setDialog} item={editing} onSave={handleSave} />
    </SectionCard>
  );
}