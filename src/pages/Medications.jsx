import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pill, Plus, CheckCircle2, XCircle, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getMedicationStatus } from "@/lib/dateUtils";
import { format } from "date-fns";

const empty = {
  pet_id: "", medication_name: "", dosage_instructions: "", route: "oral",
  frequency: "once daily", start_date: format(new Date(), "yyyy-MM-dd"), end_date: "",
  schedule_type: "daily", active_week_pattern: "1,3,5",
  off_week_warning: "DO NOT GIVE this medication today — this is an off-week.", critical: true,
  requires_photo: false, notes: "",
};

function MedFormDialog({ open, onOpenChange, med, pets, onSave }) {
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputClass = "bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20";

  // Populate form when dialog opens or med changes
  useEffect(() => { setForm(med ? { ...empty, ...med } : empty); }, [med, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-[#0f1117] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white font-bold text-xl">{med?.id ? "Edit Medication" : "Add Medication"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Medication Name</Label>
            <Input value={form.medication_name} onChange={e => set("medication_name", e.target.value)} placeholder="e.g. Ringworm Antifungal" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Pet</Label>
            <Select value={form.pet_id} onValueChange={v => set("pet_id", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue placeholder="Select pet" /></SelectTrigger>
              <SelectContent className="bg-[#0f1117] border-white/10">
                {pets.map(p => <SelectItem key={p.id} value={p.id} className="text-white hover:bg-white/5">{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Route</Label>
              <Select value={form.route} onValueChange={v => set("route", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/10">
                  {[["oral","💊 Oral"],["eye_drop","👁️ Eye Drop"],["food","🍖 In Food"],["topical","🧴 Topical"],["other","Other"]].map(([v,l]) => (
                    <SelectItem key={v} value={v} className="text-white hover:bg-white/5">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Schedule</Label>
              <Select value={form.schedule_type} onValueChange={v => set("schedule_type", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/10">
                  <SelectItem value="daily" className="text-white hover:bg-white/5">Every Day</SelectItem>
                  <SelectItem value="alternate_weeks" className="text-white hover:bg-white/5">Alternate Weeks</SelectItem>
                  <SelectItem value="specific_days" className="text-white hover:bg-white/5">Specific Days</SelectItem>
                  <SelectItem value="custom" className="text-white hover:bg-white/5">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.schedule_type === "alternate_weeks" && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Label className="text-white/60 text-xs uppercase tracking-wider">Active Week Numbers</Label>
              <Input value={form.active_week_pattern} onChange={e => set("active_week_pattern", e.target.value)} placeholder="e.g. 1,3,5" className={inputClass} />
              <p className="text-white/30 text-[10px]">Comma-separated week numbers from start date. e.g. "1,3,5" = give in weeks 1,3,5 — skip weeks 2,4</p>
              <Label className="text-white/60 text-xs uppercase tracking-wider">Off-Week Warning Message</Label>
              <Textarea value={form.off_week_warning} onChange={e => set("off_week_warning", e.target.value)} className={`${inputClass} h-16 resize-none`} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Dosage Instructions</Label>
            <Textarea value={form.dosage_instructions} onChange={e => set("dosage_instructions", e.target.value)} placeholder="e.g. 0.5ml orally, mix in small amount of wet food" className={`${inputClass} h-20 resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5">
            <div>
              <p className="text-white text-sm font-medium">Require Proof Photo</p>
              <p className="text-white/40 text-xs">Photo needed to confirm given</p>
            </div>
            <Switch checked={form.requires_photo} onCheckedChange={v => set("requires_photo", v)} />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white/50 rounded-xl flex-1">Cancel</Button>
            <Button onClick={() => onSave(form, med?.id)} disabled={!form.medication_name.trim()} className="text-white rounded-xl flex-1 font-bold border-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
              {med?.id ? "Save" : "Add Medication"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ROUTE_EMOJI = { oral: "💊", eye_drop: "👁️", food: "🍖", topical: "🧴", other: "💉" };

export default function Medications() {
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: meds = [] } = useQuery({ queryKey: ["medications"], queryFn: () => base44.entities.MedicationSchedule.list() });
  const { data: pets = [] } = useQuery({ queryKey: ["pets"], queryFn: () => base44.entities.PetProfile.list() });

  const create = useMutation({ mutationFn: d => base44.entities.MedicationSchedule.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }) });
  const update = useMutation({ mutationFn: ({ id, data }) => base44.entities.MedicationSchedule.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }) });
  const remove = useMutation({ mutationFn: id => base44.entities.MedicationSchedule.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }) });

  const handleSave = async (formData, id) => {
    if (id) await update.mutateAsync({ id, data: formData });
    else await create.mutateAsync(formData);
    setDialog(false);
    setEditing(null);
  };

  const getPetName = (id) => pets.find(p => p.id === id)?.name || "Unknown Pet";

  return (
    <div className="min-h-full" style={{ background: "#0f1117" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-8"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.3), transparent)" }} />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <Pill className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Medication Schedule</h1>
            <p className="text-white/40 text-xs">Active/off-week treatment cycles</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <AnimatePresence>
            {meds.map(med => {
              const status = getMedicationStatus(med);
              const isActive = status.active;
              const isOffWeek = status.reason === "off_week";

              return (
                <motion.div key={med.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl overflow-hidden" style={{
                    background: isOffWeek ? "rgba(239,68,68,0.07)" : isActive ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                    border: isOffWeek ? "1px solid rgba(239,68,68,0.25)" : isActive ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.04)",
                    backdropFilter: "blur(20px)",
                  }}>

                  {/* Status bar */}
                  <div className="px-4 py-2.5 flex items-center justify-between"
                    style={{
                      background: isOffWeek ? "rgba(239,68,68,0.1)" : isActive ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                      borderBottom: "1px solid rgba(255,255,255,0.05)"
                    }}>
                    <div className="flex items-center gap-2">
                      {isOffWeek ? (
                        <>
                          <XCircle className="h-4 w-4 text-red-400" />
                          <span className="text-xs font-bold text-red-400 uppercase tracking-wider">OFF WEEK — DO NOT GIVE</span>
                        </>
                      ) : isActive ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                            GIVE TODAY {status.weekNum ? `(Week ${status.weekNum})` : ""}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-white/30" />
                          <span className="text-xs font-bold text-white/30 uppercase tracking-wider">
                            {status.reason === "not_started" ? "Not Started" : "Course Complete"}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(med); setDialog(true); }} className="h-6 w-6 rounded flex items-center justify-center text-white/30 hover:text-white/60">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => remove.mutate(med.id)} className="h-6 w-6 rounded flex items-center justify-center text-white/30 hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: isOffWeek ? "rgba(239,68,68,0.15)" : "rgba(124,58,237,0.15)" }}>
                        {ROUTE_EMOJI[med.route] || "💊"}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">{med.medication_name}</p>
                        <p className="text-xs text-white/40 mt-0.5">{getPetName(med.pet_id)}</p>
                        {med.dosage_instructions && (
                          <p className="text-xs text-white/50 mt-1.5 leading-relaxed">{med.dosage_instructions}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {med.start_date && (
                            <span className="text-[10px] text-white/30">Start: {med.start_date}</span>
                          )}
                          {med.end_date && (
                            <span className="text-[10px] text-white/30">End: {med.end_date}</span>
                          )}
                          {med.schedule_type === "alternate_weeks" && (
                            <span className="text-[10px] text-purple-400">Active weeks: {med.active_week_pattern}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isOffWeek && (
                      <div className="mt-3 px-3 py-2.5 rounded-xl"
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                        <p className="text-red-300 text-xs font-bold">⛔ {status.offWarning}</p>
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
              <p className="text-white/40 text-sm">No medications added yet</p>
              <p className="text-white/25 text-xs mt-1">Add medication schedules to track on/off cycles</p>
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => { setEditing(null); setDialog(true); }}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.15)" }}
        >
          <Plus className="h-4 w-4" /> Add Medication
        </motion.button>
      </div>

      <MedFormDialog open={dialog} onOpenChange={setDialog} med={editing} pets={pets} onSave={handleSave} />
    </div>
  );
}