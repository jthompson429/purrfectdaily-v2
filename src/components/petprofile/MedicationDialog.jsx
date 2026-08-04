import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const empty = { medication_name: "", frequency: "twice_daily", start_date: "", end_date: "", notes: "" };

export default function MedicationDialog({ open, onOpenChange, item, onSave }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(item ? { ...empty, ...item } : empty); setError(""); }, [item, open]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };
  const inputClass = "bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20";
  const submit = async (e) => {
    e.preventDefault();
    if (!form.medication_name.trim()) { setError("Please enter the medication name."); return; }
    if (!form.start_date) { setError("Please enter the start date."); return; }
    setError("");
    setSaving(true);
    try { await onSave(form, item?.id); }
    catch (err) { setError(err?.message || "Could not save the medication. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-[#0f1117] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-white font-bold text-xl">{item?.id ? "Edit Medication" : "Add Medication"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Medication Name</Label>
            <Input placeholder="e.g. Animax Cream" value={form.medication_name} onChange={(e) => set("medication_name", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Frequency</Label>
            <Select value={form.frequency} onValueChange={(v) => set("frequency", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0f1117] border-white/10">
                <SelectItem value="once_daily" className="text-white hover:bg-white/5">Once Daily</SelectItem>
                <SelectItem value="twice_daily" className="text-white hover:bg-white/5">Twice Daily</SelectItem>
                <SelectItem value="thrice_daily" className="text-white hover:bg-white/5">Three Times Daily</SelectItem>
                <SelectItem value="as_needed" className="text-white hover:bg-white/5">As Needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Start Date</Label>
              <Input type="date" value={form.start_date || ""} onChange={(e) => set("start_date", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">End Date</Label>
              <Input type="date" value={form.end_date || ""} onChange={(e) => set("end_date", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Notes</Label>
            <Textarea placeholder="Dosage instructions, e.g. apply to left ear…" value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>
          {error && <p className="text-xs text-red-400 font-medium -mt-1">{error}</p>}
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white/50 hover:text-white rounded-xl flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="text-white rounded-xl flex-1 font-bold border-0" style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>{saving ? "Saving…" : item?.id ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}