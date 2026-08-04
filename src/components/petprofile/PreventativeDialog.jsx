import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const empty = { name: "", date_given: "", frequency: "monthly", custom_interval_days: 30, notes: "" };
const PRESETS = ["Revolution Plus", "Credelio", "Heartworm", "Bravecto", "Frontline", "Profender"];

export default function PreventativeDialog({ open, onOpenChange, item, onSave }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(item ? { ...empty, ...item } : empty); setError(""); }, [item, open]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };
  const inputClass = "bg-muted border-border text-foreground rounded-xl placeholder:text-muted-foreground/50";
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Please enter the preventative name."); return; }
    if (!form.date_given) { setError("Please enter the date given."); return; }
    setError("");
    setSaving(true);
    try { await onSave(form, item?.id); }
    catch (err) { setError(err?.message || "Could not save the preventative. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-border bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground font-bold text-xl font-heading">{item?.id ? "Edit Preventative" : "Add Preventative"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Name</Label>
            <Input list="prev-presets" placeholder="e.g. Revolution Plus" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
            <datalist id="prev-presets">{PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Date Given</Label>
            <Input type="date" value={form.date_given || ""} onChange={(e) => set("date_given", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Frequency</Label>
            <Select value={form.frequency} onValueChange={(v) => set("frequency", v)}>
              <SelectTrigger className="bg-muted border-border text-foreground rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="monthly" className="text-foreground hover:bg-muted">Monthly</SelectItem>
                <SelectItem value="every_3_months" className="text-foreground hover:bg-muted">Every 3 Months</SelectItem>
                <SelectItem value="annual" className="text-foreground hover:bg-muted">Annual</SelectItem>
                <SelectItem value="custom" className="text-foreground hover:bg-muted">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.frequency === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Custom Interval (days)</Label>
              <Input type="number" min="1" value={form.custom_interval_days ?? 30} onChange={(e) => set("custom_interval_days", Number(e.target.value))} className={inputClass} />
            </div>
          )}
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