import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Syringe, Pencil, Trash2 } from "lucide-react";
import SectionCard from "./SectionCard";
import VaccinationDialog from "./VaccinationDialog";
import { vaccinationStatus, fmtShort, COLOR_MAP } from "@/utils/petCare";

const VAC_LABEL = (v) => v.name === "custom" ? (v.custom_name || "Custom Vaccine") : v.name.toUpperCase();

export default function VaccinationSection({ petId }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data: items = [] } = useQuery({ queryKey: ["vaccinations", petId], queryFn: () => base44.entities.Vaccination.filter({ pet_id: petId }, "-date_given") });
  const upsert = useMutation({ mutationFn: ({ id, data }) => id ? base44.entities.Vaccination.update(id, data) : base44.entities.Vaccination.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: ["vaccinations", petId] }) });
  const remove = useMutation({ mutationFn: (id) => base44.entities.Vaccination.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["vaccinations", petId] }) });
  const handleSave = async (data, id) => {
    try {
      await upsert.mutateAsync({ id, data: { ...data, pet_id: petId } });
      // Keep the Pet Profile's rabies due date in sync.
      if (data.name === "rabies" && data.due_date) {
        try { await base44.entities.PetProfile.update(petId, { rabies_vaccine_due: data.due_date }); } catch {}
        qc.invalidateQueries({ queryKey: ["pet", petId] });
      }
      setDialog(false); setEditing(null);
    } catch (err) {
      throw new Error(err?.message || "Could not save the vaccination. Please try again.");
    }
  };

  return (
    <SectionCard title="Vaccinations" icon={Syringe} onAdd={() => { setEditing(null); setDialog(true); }} addLabel="Add">
      {items.length === 0 ? (
        <p className="text-xs text-white/30 py-3 text-center">No vaccinations recorded</p>
      ) : (
        <div className="space-y-2">
          {items.map((v) => {
            const st = vaccinationStatus(v);
            const c = COLOR_MAP[st.color];
            return (
              <div key={v.id} className="rounded-xl p-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{VAC_LABEL(v)}</p>
                    <p className="text-[11px] text-white/40">Given {fmtShort(v.date_given)}{v.veterinarian ? ` · ${v.veterinarian}` : ""}</p>
                    {v.due_date && <p className="text-[11px] mt-0.5 text-white/40">Due {fmtShort(v.due_date)}</p>}
                    {v.lot_number && <p className="text-[11px] text-white/30">Lot {v.lot_number}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.text}`} style={{ background: "rgba(255,255,255,0.05)" }}>{st.label}</span>
                    <button onClick={() => { setEditing(v); setDialog(true); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60" style={{ background: "rgba(255,255,255,0.05)" }}><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => { if (window.confirm("Delete this vaccination?")) remove.mutate(v.id); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400" style={{ background: "rgba(255,255,255,0.05)" }}><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <VaccinationDialog open={dialog} onOpenChange={setDialog} item={editing} onSave={handleSave} />
    </SectionCard>
  );
}