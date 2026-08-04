import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUILTIN_AREAS } from "@/utils/assignment";

const TYPES = [["pet", "🐾 Pet"], ["area", "🏠 Area"], ["general", "✦ General"]];

export default function AssignmentMigrationDialog({ open, pending, pets, onApply, onClose }) {
  const [choices, setChoices] = useState({});

  useEffect(() => {
    const init = {};
    pending.forEach((t) => { init[t.id] = { type: "general", pet_id: "", area: "" }; });
    setChoices(init);
  }, [pending, open]);

  const set = (id, k, v) => setChoices((c) => ({ ...c, [id]: { ...c[id], [k]: v } }));

  const apply = () => {
    const results = pending.map((t) => {
      const c = choices[t.id] || { type: "general", pet_id: "", area: "" };
      return {
        id: t.id,
        assignment_type: c.type,
        pet_id: c.type === "pet" ? c.pet_id : "",
        area: c.type === "area" ? c.area : "",
      };
    });
    onApply(results);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-[#0f1117] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white font-bold text-xl">Classify a few tasks</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-white/40 -mt-2">
          Some tasks were assigned to a group (e.g. "Maya &amp; the Gang"). Choose how each should be organized now — this only happens once.
        </p>
        <div className="space-y-3 mt-2">
          {pending.map((t) => {
            const groupName = pets.find((p) => p.id === t.pet_id)?.name || "Group";
            const c = choices[t.id] || { type: "general", pet_id: "", area: "" };
            return (
              <div key={t.id} className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div>
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="text-[10px] text-white/30">Was assigned to: {groupName}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set(t.id, "type", v)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${c.type === v ? "text-white" : "text-white/40"}`}
                      style={c.type === v ? { background: "linear-gradient(135deg,#7c3aed,#3b82f6)", borderColor: "transparent" } : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                      {l}
                    </button>
                  ))}
                </div>
                {c.type === "pet" && (
                  <Select value={c.pet_id} onValueChange={(v) => set(t.id, "pet_id", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl h-9"><SelectValue placeholder="Select a specific pet" /></SelectTrigger>
                    <SelectContent className="bg-[#0f1117] border-white/10">
                      {pets.map((p) => <SelectItem key={p.id} value={p.id} className="text-white hover:bg-white/5">{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {c.type === "area" && (
                  <Input list="migrate-areas" placeholder="Select or type an area" value={c.area} onChange={(e) => set(t.id, "area", e.target.value)} className="bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20 h-9" />
                )}
              </div>
            );
          })}
        </div>
        <datalist id="migrate-areas">{BUILTIN_AREAS.map((a) => <option key={a} value={a} />)}</datalist>
        <DialogFooter className="pt-2 gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="text-white/50 hover:text-white rounded-xl flex-1">Later</Button>
          <Button type="button" onClick={apply} className="text-white rounded-xl flex-1 font-bold border-0" style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}