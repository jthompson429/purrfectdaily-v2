import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const empty = { name: "rabies", custom_name: "", date_given: "", due_date: "", veterinarian: "", lot_number: "", notes: "" };

export default function VaccinationDialog({ open, onOpenChange, item, onSave }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(item ? { ...empty, ...item } : empty); setError(""); }, [item, open]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };
  const inputClass = "bg-muted border-border text-foreground rounded-xl placeholder:text-muted-foreground/50";
  const submit = async (e) => {
    e.preventDefault();
    if (!form.date_given) { setError("Please enter the date the vaccine was given."); return; }
    if (form.name === "custom" && !form.custom_name.trim()) { setError("Please enter the vaccine name."); return; }
    setError("");
    setSaving(true);
    try {
      await onSave(form, item?.id);
    } catch (err) {
      setError(err?.message || "Could not save the vaccination. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-border bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground font-bold text-xl font-heading">{item?.id ? "Edit Vaccination" : "Add Vaccination"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Vaccine</Label>
            <Select value={form.name} onValueChange={(v) => set("name", v)}>
              <SelectTrigger className="bg-muted border-border text-foreground rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="rabies" className="text-foreground hover:bg-muted">Rabies</SelectItem>
                <SelectItem value="fvrcp" className="text-foreground hover:bg-muted">FVRCP</SelectItem>
                <SelectItem value="felv" className="text-foreground hover:bg-muted">FeLV</SelectItem>
                <SelectItem value="custom" className="text-foreground hover:bg-muted">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.name === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Vaccine Name</Label>
              <Input placeholder="e.g. Bordetella" value={form.custom_name || ""} onChange={(e) => set("custom_name", e.target.value)} className={inputClass} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Date Given</Label>
              <Input type="date" value={form.date_given || ""} onChange={(e) => set("date_given", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Due Date</Label>
              <Input type="date" value={form.due_date || ""} onChange={(e) => set("due_date", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Veterinarian</Label>
              <Input placeholder="Dr.…" value={form.veterinarian || ""} onChange={(e) => set("veterinarian", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Lot Number</Label>
              <Input placeholder="Optional" value={form.lot_number || ""} onChange={(e) => set("lot_number", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Notes</Label>
            <Textarea placeholder="Optional notes…" value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>
          {error && <p className="text-xs text-destructive font-medium -mt-1">{error}</p>}
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground rounded-xl flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="text-primary-foreground rounded-xl flex-1 font-bold border-0 bg-primary">{saving ? "Saving…" : item?.id ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}