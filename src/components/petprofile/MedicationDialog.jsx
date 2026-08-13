import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const empty = {
  medication_name: "",
  dosage_instructions: "",
  route: "oral",
  frequency: "once_daily",
  start_date: format(new Date(), "yyyy-MM-dd"),
  end_date: "",
  schedule_type: "daily",
  active_week_pattern: "1,3,5",
  off_week_warning: "DO NOT GIVE this medication today — this is an off-week.",
  schedule_days: [],
  custom_schedule_instructions: "",
  critical: true,
  requires_photo: false,
  notes: "",
  archived: false,
};

const WEEKDAYS = [["S", 0], ["M", 1], ["T", 2], ["W", 3], ["T", 4], ["F", 5], ["S", 6]];

export default function MedicationDialog({ open, onOpenChange, item, onSave }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(item ? { ...empty, ...item } : empty); setError(""); }, [item, open]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };
  const inputClass = "bg-muted border-border text-foreground rounded-xl placeholder:text-muted-foreground/50";
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
      <DialogContent className="sm:max-w-md rounded-3xl border-border bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-foreground font-bold text-xl font-heading">{item?.id ? "Edit Medication" : "Add Medication"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Medication Name</Label>
            <Input placeholder="e.g. Animax Cream" value={form.medication_name} onChange={(e) => set("medication_name", e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Route</Label>
              <Select value={form.route} onValueChange={(v) => set("route", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {[["oral","💊 Oral"],["eye_drop","👁️ Eye Drop"],["food","🍖 In Food"],["topical","🧴 Topical"],["other","Other"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => set("frequency", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="once_daily">Once Daily</SelectItem>
                  <SelectItem value="twice_daily">Twice Daily</SelectItem>
                  <SelectItem value="thrice_daily">Three Times Daily</SelectItem>
                  <SelectItem value="as_needed">As Needed</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Schedule</Label>
            <Select value={form.schedule_type} onValueChange={(v) => set("schedule_type", v)}>
              <SelectTrigger className="bg-muted border-border text-foreground rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="daily">Every Day</SelectItem>
                <SelectItem value="alternate_weeks">Alternate Weeks</SelectItem>
                <SelectItem value="specific_days">Specific Days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.schedule_type === "alternate_weeks" && (
            <div className="rounded-xl p-3 space-y-2 bg-destructive/10 border border-destructive/20">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Active Week Numbers</Label>
              <Input value={form.active_week_pattern} onChange={(e) => set("active_week_pattern", e.target.value)} placeholder="e.g. 1,3,5" className={inputClass} />
              <p className="text-muted-foreground text-[10px]">Comma-separated weeks from the start date. Weeks not listed are off-weeks.</p>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Off-Week Warning Message</Label>
              <Textarea value={form.off_week_warning} onChange={(e) => set("off_week_warning", e.target.value)} className={`${inputClass} h-16 resize-none`} />
            </div>
          )}
          {form.schedule_type === "specific_days" && (
            <div className="rounded-xl p-3 space-y-2 bg-muted border border-border">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Days Medication Is Due</Label>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map(([label, day]) => {
                  const selected = (form.schedule_days || []).includes(day);
                  return <button key={day} type="button" onClick={() => set("schedule_days", selected ? form.schedule_days.filter((d) => d !== day) : [...(form.schedule_days || []), day])} className={`h-9 rounded-lg text-xs font-bold border ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}>{label}</button>;
                })}
              </div>
            </div>
          )}
          {(form.schedule_type === "custom" || form.frequency === "custom" || form.frequency === "as_needed") && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">{form.frequency === "as_needed" ? "As-Needed Instructions" : "Custom Schedule Instructions"}</Label>
              <Textarea value={form.custom_schedule_instructions || ""} onChange={(e) => set("custom_schedule_instructions", e.target.value)} placeholder={form.frequency === "as_needed" ? "When should this medication be given, and what is the maximum frequency?" : "Describe exactly when this medication should be given."} className={`${inputClass} h-20 resize-none`} />
              <p className="text-muted-foreground text-[10px]">Custom and as-needed medication will not create an automatic required task on Today.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Dosage Instructions</Label>
            <Textarea value={form.dosage_instructions} onChange={(e) => set("dosage_instructions", e.target.value)} placeholder="e.g. 0.5 ml orally with food" className={`${inputClass} h-20 resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Start Date</Label>
              <Input type="date" value={form.start_date || ""} onChange={(e) => set("start_date", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">End Date</Label>
              <Input type="date" value={form.end_date || ""} onChange={(e) => set("end_date", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Optional care notes" className={`${inputClass} h-16 resize-none`} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted">
              <div><p className="text-foreground text-sm font-medium">Critical Medication</p><p className="text-muted-foreground text-xs">Emphasize warnings and due doses</p></div>
              <Switch checked={form.critical} onCheckedChange={(v) => set("critical", v)} />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted">
              <div><p className="text-foreground text-sm font-medium">Require Proof Photo</p><p className="text-muted-foreground text-xs">Photo needed to confirm given</p></div>
              <Switch checked={form.requires_photo} onCheckedChange={(v) => set("requires_photo", v)} />
            </div>
            {item?.id && (
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted">
                <div><p className="text-foreground text-sm font-medium">Archive Medication</p><p className="text-muted-foreground text-xs">Keep history without showing active doses</p></div>
                <Switch checked={form.archived} onCheckedChange={(v) => set("archived", v)} />
              </div>
            )}
          </div>
          {error && <p className="text-xs text-destructive font-medium -mt-1">{error}</p>}
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground rounded-xl flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="text-primary-foreground rounded-xl flex-1 font-bold border-0 bg-primary">{saving ? "Saving…" : item?.id ? "Save" : "Add Medication"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
