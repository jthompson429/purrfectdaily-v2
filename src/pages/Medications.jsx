import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pill, Plus, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getMedicationStatus } from "@/lib/dateUtils";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate, wsDelete } from "@/lib/workspaceApi";
import { format } from "date-fns";

const empty = {
  pet_id: "", medication_name: "", dosage_instructions: "", route: "oral",
  frequency: "once_daily", start_date: format(new Date(), "yyyy-MM-dd"), end_date: "",
  schedule_type: "daily", active_week_pattern: "1,3,5", schedule_days: [], custom_schedule_instructions: "",
  off_week_warning: "DO NOT GIVE this medication today — this is an off-week.", critical: true,
  requires_photo: false, notes: "",
};

const WEEKDAYS = [["S", 0], ["M", 1], ["T", 2], ["W", 3], ["T", 4], ["F", 5], ["S", 6]];

function MedFormDialog({ open, onOpenChange, med, pets, onSave }) {
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputClass = "bg-muted border-border text-foreground rounded-xl placeholder:text-muted-foreground/50";

  useEffect(() => { setForm(med ? { ...empty, ...med } : empty); }, [med, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-border bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground font-bold text-xl font-heading">{med?.id ? "Edit Medication" : "Add Medication"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Medication Name</Label>
            <Input value={form.medication_name} onChange={e => set("medication_name", e.target.value)} placeholder="e.g. Ringworm Antifungal" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Pet</Label>
            <Select value={form.pet_id} onValueChange={v => set("pet_id", v)}>
              <SelectTrigger className="bg-muted border-border text-foreground rounded-xl"><SelectValue placeholder="Select pet" /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {pets.map(p => <SelectItem key={p.id} value={p.id} className="text-foreground hover:bg-muted">{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Route</Label>
              <Select value={form.route} onValueChange={v => set("route", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {[["oral","💊 Oral"],["eye_drop","👁️ Eye Drop"],["food","🍖 In Food"],["topical","🧴 Topical"],["other","Other"]].map(([v,l]) => (
                    <SelectItem key={v} value={v} className="text-foreground hover:bg-muted">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Schedule</Label>
              <Select value={form.schedule_type} onValueChange={v => set("schedule_type", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="daily" className="text-foreground hover:bg-muted">Every Day</SelectItem>
                  <SelectItem value="alternate_weeks" className="text-foreground hover:bg-muted">Alternate Weeks</SelectItem>
                  <SelectItem value="specific_days" className="text-foreground hover:bg-muted">Specific Days</SelectItem>
                  <SelectItem value="custom" className="text-foreground hover:bg-muted">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.schedule_type === "alternate_weeks" && (
            <div className="rounded-xl p-3 space-y-2 bg-destructive/10 border border-destructive/20">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Active Week Numbers</Label>
              <Input value={form.active_week_pattern} onChange={e => set("active_week_pattern", e.target.value)} placeholder="e.g. 1,3,5" className={inputClass} />
              <p className="text-muted-foreground text-[10px]">Comma-separated week numbers from start date. e.g. "1,3,5" = give in weeks 1,3,5 — skip weeks 2,4</p>
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Off-Week Warning Message</Label>
              <Textarea value={form.off_week_warning} onChange={e => set("off_week_warning", e.target.value)} className={`${inputClass} h-16 resize-none`} />
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
              <Textarea value={form.custom_schedule_instructions || ""} onChange={e => set("custom_schedule_instructions", e.target.value)} placeholder={form.frequency === "as_needed" ? "When should this medication be given, and what is the maximum frequency?" : "Describe exactly when this medication should be given."} className={`${inputClass} h-20 resize-none`} />
              <p className="text-muted-foreground text-[10px]">Custom and as-needed medication will not create an automatic required task on Today.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Frequency</Label>
            <Select value={form.frequency} onValueChange={v => set("frequency", v)}>
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

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Dosage Instructions</Label>
            <Textarea value={form.dosage_instructions} onChange={e => set("dosage_instructions", e.target.value)} placeholder="e.g. 0.5ml orally, mix in small amount of wet food" className={`${inputClass} h-20 resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Notes</Label>
            <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Optional care notes" className={`${inputClass} h-16 resize-none`} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted">
              <div>
                <p className="text-foreground text-sm font-medium">Critical Medication</p>
                <p className="text-muted-foreground text-xs">Emphasize warnings and due doses</p>
              </div>
              <Switch checked={form.critical} onCheckedChange={v => set("critical", v)} />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted">
              <div>
                <p className="text-foreground text-sm font-medium">Require Proof Photo</p>
                <p className="text-muted-foreground text-xs">Photo needed to confirm given</p>
              </div>
              <Switch checked={form.requires_photo} onCheckedChange={v => set("requires_photo", v)} />
            </div>
            {med?.id && (
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted">
                <div>
                  <p className="text-foreground text-sm font-medium">Archive Medication</p>
                  <p className="text-muted-foreground text-xs">Keep history without showing active doses</p>
                </div>
                <Switch checked={form.archived || false} onCheckedChange={v => set("archived", v)} />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground rounded-xl flex-1">Cancel</Button>
            <Button onClick={() => onSave(form, med?.id)} disabled={!form.medication_name.trim() || !form.pet_id || (form.schedule_type === "specific_days" && !(form.schedule_days || []).length) || ((form.schedule_type === "custom" || form.frequency === "custom" || form.frequency === "as_needed") && !form.custom_schedule_instructions.trim())} className="text-primary-foreground rounded-xl flex-1 font-bold border-0 bg-primary">
              {med?.id ? "Save" : "Add Medication"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ROUTE_EMOJI = { oral: "💊", eye_drop: "👁️", food: "🍖", topical: "🧴", other: "💉" };
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Medications() {
  const { activeWorkspaceId, canWrite } = useWorkspace();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: meds = [] } = useQuery({ queryKey: ["medications", activeWorkspaceId], queryFn: () => base44.entities.MedicationSchedule.filter({ workspace_id: activeWorkspaceId }) });
  const { data: pets = [] } = useQuery({ queryKey: ["pets", activeWorkspaceId], queryFn: () => base44.entities.PetProfile.filter({ workspace_id: activeWorkspaceId }) });

  const create = useMutation({ mutationFn: d => wsCreate("MedicationSchedule", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }) });
  const update = useMutation({ mutationFn: ({ id, data }) => wsUpdate("MedicationSchedule", id, data, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }) });
  const remove = useMutation({ mutationFn: id => wsDelete("MedicationSchedule", id, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }) });

  const handleSave = async (formData, id) => {
    if (id) await update.mutateAsync({ id, data: formData });
    else await create.mutateAsync(formData);
    setDialog(false);
    setEditing(null);
  };

  const getPetName = (id) => pets.find(p => p.id === id)?.name || "Unknown Pet";

  return (
    <div className="min-h-full bg-background">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, rgba(114,9,183,0.15), transparent)" }} />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/15 border border-primary/30">
            <Pill className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground font-heading">Medication Schedule</h1>
            <p className="text-muted-foreground text-xs">Active/off-week treatment cycles</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <AnimatePresence>
            {meds.map(med => {
              const status = getMedicationStatus(med);
              const manuallyRecorded = med.schedule_type === "custom" || med.frequency === "custom" || med.frequency === "as_needed";
              const isActive = status.active && !manuallyRecorded;
              const isOffWeek = status.reason === "off_week";

              return (
                <motion.div key={med.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl overflow-hidden bg-card border border-border">

                  {/* Status bar */}
                  <div className="px-4 py-2.5 flex items-center justify-between"
                    style={{
                      background: isOffWeek ? "rgba(239,68,68,0.1)" : isActive ? "rgba(16,185,129,0.1)" : "hsl(var(--muted))",
                      borderBottom: "1px solid hsl(var(--border))"
                    }}>
                    <div className="flex items-center gap-2">
                      {isOffWeek ? (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-xs font-bold text-destructive uppercase tracking-wider">OFF WEEK — DO NOT GIVE</span>
                        </>
                      ) : isActive ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-bold text-green-500 uppercase tracking-wider">
                            GIVE TODAY {status.weekNum ? `(Week ${status.weekNum})` : ""}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {(status.reason === "manual_schedule" || (manuallyRecorded && status.active))
                              ? "Record As Needed"
                              : status.reason === "not_started"
                                ? "Not Started"
                              : status.reason === "not_scheduled"
                                ? "Not Scheduled Today"
                                : status.reason === "manual_schedule"
                                  ? "Record As Needed"
                                  : med.archived
                                    ? "Archived"
                                    : "Course Complete"}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(med); setDialog(true); }} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => remove.mutate(med.id)} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: isOffWeek ? "rgba(239,68,68,0.15)" : "rgba(114,9,183,0.15)" }}>
                        {ROUTE_EMOJI[med.route] || "💊"}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground text-sm">{med.medication_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{getPetName(med.pet_id)}</p>
                        {med.dosage_instructions && (
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{med.dosage_instructions}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {med.start_date && (
                            <span className="text-[10px] text-muted-foreground">Start: {med.start_date}</span>
                          )}
                          {med.end_date && (
                            <span className="text-[10px] text-muted-foreground">End: {med.end_date}</span>
                          )}
                          {med.schedule_type === "alternate_weeks" && (
                            <span className="text-[10px] text-primary">Active weeks: {med.active_week_pattern}</span>
                          )}
                          {med.schedule_type === "specific_days" && (
                            <span className="text-[10px] text-primary">Due: {(med.schedule_days || []).map((day) => DAY_NAMES[day]).join(", ")}</span>
                          )}
                          {(med.schedule_type === "custom" || med.frequency === "custom" || med.frequency === "as_needed") && (
                            <span className="text-[10px] text-primary">Manual schedule</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isOffWeek && (
                      <div className="mt-3 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/25">
                        <p className="text-destructive text-xs font-bold">⛔ {status.offWarning}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {meds.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">💊</div>
              <p className="text-muted-foreground text-sm">No medications added yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Add medication schedules to track on/off cycles</p>
            </div>
          )}
        </div>

        {canWrite && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => { setEditing(null); setDialog(true); }}
          className="w-full py-4 rounded-2xl font-bold text-foreground flex items-center justify-center gap-2 bg-muted border border-dashed border-border"
        >
          <Plus className="h-4 w-4" /> Add Medication
        </motion.button>
        )}
      </div>

      <MedFormDialog open={dialog} onOpenChange={setDialog} med={editing} pets={pets} onSave={handleSave} />
    </div>
  );
}