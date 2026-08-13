import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pill, Plus, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getMedicationStatus } from "@/lib/dateUtils";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate, wsDelete } from "@/lib/workspaceApi";
import MedicationHistory from "@/components/medications/MedicationHistory";
import MedicationFormDialog from "@/components/medications/MedicationFormDialog";

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

        <MedicationHistory medications={meds} pets={pets} />
      </div>

      <MedicationFormDialog open={dialog} onOpenChange={setDialog} item={editing} pets={pets} onSave={handleSave} />
    </div>
  );
}