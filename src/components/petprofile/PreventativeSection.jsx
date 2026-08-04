import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShieldPlus, Pencil, Trash2 } from "lucide-react";
import SectionCard from "./SectionCard";
import PreventativeDialog from "./PreventativeDialog";
import { preventativeStatus, fmtShort, frequencyLabel, COLOR_MAP } from "@/utils/petCare";

export default function PreventativeSection({ petId }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data: items = [] } = useQuery({ queryKey: ["preventatives", petId], queryFn: () => base44.entities.Preventative.filter({ pet_id: petId }, "-date_given") });
  const upsert = useMutation({ mutationFn: ({ id, data }) => id ? base44.entities.Preventative.update(id, data) : base44.entities.Preventative.create({ ...data, pet_id: petId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["preventatives", petId] }) });
  const remove = useMutation({ mutationFn: (id) => base44.entities.Preventative.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["preventatives", petId] }) });
  const handleSave = async (data, id) => { await upsert.mutateAsync({ id, data }); setDialog(false); setEditing(null); };

  return (
    <SectionCard title="Preventive Care" icon={ShieldPlus} onAdd={() => { setEditing(null); setDialog(true); }} addLabel="Add">
      {items.length === 0 ? (
        <p className="text-xs text-white/30 py-3 text-center">No preventatives tracked yet</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((p) => {
            const st = preventativeStatus(p);
            const c = COLOR_MAP[st.color];
            const remaining = st.daysRemaining == null ? "" : st.daysRemaining < 0 ? `${Math.abs(st.daysRemaining)} days overdue` : st.daysRemaining === 0 ? "Due today" : `${st.daysRemaining} days remaining`;
            return (
              <div key={p.id} className="rounded-xl p-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{p.name}</p>
                    <p className="text-[11px] text-white/40">{frequencyLabel(p.frequency, p.custom_interval_days)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(p); setDialog(true); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60" style={{ background: "rgba(255,255,255,0.05)" }}><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => { if (window.confirm("Delete this preventative?")) remove.mutate(p.id); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400" style={{ background: "rgba(255,255,255,0.05)" }}><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] mt-2">
                  <span className="text-white/40">Last: <b className="text-white/70">{fmtShort(p.date_given)}</b></span>
                  <span className="text-white/40">Next: <b className={c.text}>{fmtShort(st.next)}</b></span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${st.pct}%` }} />
                </div>
                <p className={`text-[11px] font-semibold mt-1 ${c.text}`}>{remaining}</p>
              </div>
            );
          })}
        </div>
      )}
      <PreventativeDialog open={dialog} onOpenChange={setDialog} item={editing} onSave={handleSave} />
    </SectionCard>
  );
}