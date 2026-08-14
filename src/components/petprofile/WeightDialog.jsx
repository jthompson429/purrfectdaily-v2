import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { todayStr } from "@/utils/petCare";

const empty = () => ({ weight: "", date: todayStr(), notes: "" });

export default function WeightDialog({ open, onOpenChange, item, onSave, profileType }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(item ? { ...empty(), ...item, weight: item.weight ?? "" } : empty()); setError(""); }, [item, open]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };
  const inputClass = "bg-muted border-border text-foreground rounded-xl placeholder:text-foreground/20";
  const unit = profileType === "neonatal" ? "g" : "kg";
  const submit = async (e) => {
    e.preventDefault();
    const weight = Number(form.weight);
    if (form.weight === "" || !Number.isFinite(weight) || weight <= 0) { setError("Please enter a weight greater than zero."); return; }
    if (!form.date) { setError("Please enter the date."); return; }
    setError("");
    setSaving(true);
    try { await onSave({ ...form, weight }, item?.id); }
    catch (err) { setError(err?.message || "Could not save the weight entry. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-border bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground font-bold text-xl">{item?.id ? "Edit Weight" : "Log Weight"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground/60 text-xs uppercase tracking-wider">Weight ({unit})</Label>
              <Input type="number" step="any" min="0" placeholder="e.g. 4.2" value={form.weight} onChange={(e) => set("weight", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/60 text-xs uppercase tracking-wider">Date</Label>
              <Input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground/60 text-xs uppercase tracking-wider">Notes</Label>
            <Textarea placeholder="Optional…" value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>
          {error && <p className="text-xs text-red-400 font-medium -mt-1">{error}</p>}
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-foreground/50 hover:text-foreground rounded-xl flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="text-foreground rounded-xl flex-1 font-bold border-0" style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>{saving ? "Saving…" : item?.id ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}