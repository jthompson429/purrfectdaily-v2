import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const empty = { date: "", veterinarian: "", clinic: "", reason: "", diagnosis: "", treatment: "", notes: "" };

export default function VetVisitDialog({ open, onOpenChange, item, onSave }) {
  const [form, setForm] = useState(empty);
  useEffect(() => { setForm(item ? { ...empty, ...item } : empty); }, [item, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputClass = "bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20";
  const submit = (e) => { e.preventDefault(); if (!form.date) return; onSave(form, item?.id); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-[#0f1117] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-white font-bold text-xl">{item?.id ? "Edit Vet Visit" : "Add Vet Visit"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Date</Label>
              <Input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Clinic</Label>
              <Input placeholder="e.g. CityVet" value={form.clinic || ""} onChange={(e) => set("clinic", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Veterinarian</Label>
            <Input placeholder="Dr.…" value={form.veterinarian || ""} onChange={(e) => set("veterinarian", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Reason</Label>
            <Input placeholder="e.g. Flea allergy dermatitis" value={form.reason || ""} onChange={(e) => set("reason", e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Diagnosis</Label>
              <Input placeholder="Optional" value={form.diagnosis || ""} onChange={(e) => set("diagnosis", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Treatment</Label>
              <Input placeholder="Optional" value={form.treatment || ""} onChange={(e) => set("treatment", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Notes</Label>
            <Textarea placeholder="Optional notes…" value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white/50 hover:text-white rounded-xl flex-1">Cancel</Button>
            <Button type="submit" className="text-white rounded-xl flex-1 font-bold border-0" style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>{item?.id ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}