import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Pill, Pencil, Trash2, Check, Camera, Loader2 } from "lucide-react";
import SectionCard from "./SectionCard";
import MedicationDialog from "./MedicationDialog";
import { isMedicationActive, doseSlots, medicationTaskId, todayStr, fmtShort } from "@/utils/petCare";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate, wsDelete, wsRecordMedicationDose } from "@/lib/workspaceApi";
import { formatTime } from "@/lib/dateUtils";

export default function MedicationSection({ petId }) {
  const { activeWorkspaceId, canWrite } = useWorkspace();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingDose, setPendingDose] = useState(null);
  const [savingDose, setSavingDose] = useState("");
  const proofInputRef = useRef(null);
  const today = todayStr();

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: items = [] } = useQuery({
    queryKey: ["medications", activeWorkspaceId, petId],
    queryFn: () => base44.entities.MedicationSchedule.filter({ workspace_id: activeWorkspaceId, pet_id: petId }, "-start_date"),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["completionLogs", today, activeWorkspaceId],
    queryFn: () => base44.entities.CompletionLog.filter({ workspace_id: activeWorkspaceId, completion_date: today, pet_id: petId }),
  });

  const upsert = useMutation({
    mutationFn: ({ id, data }) => id
      ? wsUpdate("MedicationSchedule", id, data, activeWorkspaceId)
      : wsCreate("MedicationSchedule", { ...data, pet_id: petId }, activeWorkspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }),
  });
  const remove = useMutation({
    mutationFn: (id) => wsDelete("MedicationSchedule", id, activeWorkspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }),
  });
  const createDose = useMutation({
    mutationFn: (data) => wsRecordMedicationDose(data, activeWorkspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["completionLogs", today, activeWorkspaceId] }),
  });

  const handleSave = async (data, id) => {
    await upsert.mutateAsync({ id, data });
    setDialog(false);
    setEditing(null);
  };

  const logFor = (med, slot) => logs.find((log) => log.task_id === medicationTaskId(med.id, slot));
  const recordDose = async (med, slot, photoUrl = "") => {
    const taskId = medicationTaskId(med.id, slot);
    if (logFor(med, slot)?.status === "done") return;
    setSavingDose(taskId);
    try {
      await createDose.mutateAsync({
        medication_id: med.id,
        slot,
        completion_date: today,
        photo_url: photoUrl,
        notes: "",
      });
    } finally {
      setSavingDose("");
      setPendingDose(null);
    }
  };

  const requestDose = (med, slot) => {
    if (!canWrite || logFor(med, slot)?.status === "done") return;
    if (med.requires_photo) {
      setPendingDose({ med, slot });
      proofInputRef.current?.click();
    } else {
      recordDose(med, slot);
    }
  };

  const handleProofUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !pendingDose) { setPendingDose(null); return; }
    const taskId = medicationTaskId(pendingDose.med.id, pendingDose.slot);
    setSavingDose(taskId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await recordDose(pendingDose.med, pendingDose.slot, file_url);
    } finally {
      setSavingDose("");
      setPendingDose(null);
    }
  };

  const active = items.filter(isMedicationActive);
  const archived = items.filter((m) => !isMedicationActive(m));

  return (
    <SectionCard title="Medications" icon={Pill} onAdd={canWrite ? () => { setEditing(null); setDialog(true); } : undefined} addLabel="Add">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">No medications</p>
      ) : (
        <div className="space-y-2.5">
          {active.map((m) => (
            <div key={m.id} className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/25">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{m.medication_name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{(m.frequency || "once_daily").replaceAll("_", " ")} · {fmtShort(m.start_date)}{m.end_date ? ` → ${fmtShort(m.end_date)}` : ""}</p>
                  {m.dosage_instructions && <p className="text-[11px] text-muted-foreground mt-1">{m.dosage_instructions}</p>}
                </div>
                {canWrite && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditing(m); setDialog(true); }} aria-label={`Edit ${m.medication_name}`} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted border border-border"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => { if (window.confirm("Delete this medication?")) remove.mutate(m.id); }} aria-label={`Delete ${m.medication_name}`} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive bg-muted border border-border"><Trash2 className="h-3 w-3" /></button>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                {doseSlots(m).map((slot) => {
                  const log = logFor(m, slot);
                  const checked = log?.status === "done";
                  const taskId = medicationTaskId(m.id, slot);
                  const saving = savingDose === taskId;
                  return (
                    <button key={slot} onClick={() => requestDose(m, slot)} disabled={!canWrite || checked || saving}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize border ${checked ? "bg-green-500/20 border-green-500/40 text-green-600" : "bg-muted border-border text-muted-foreground"} disabled:cursor-default`}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : checked ? <Check className="h-3 w-3" /> : m.requires_photo ? <Camera className="h-3 w-3" /> : null}
                      {slot}
                    </button>
                  );
                })}
              </div>
              {doseSlots(m).map((slot) => {
                const log = logFor(m, slot);
                if (log?.status !== "done") return null;
                return <p key={slot} className="text-[10px] text-muted-foreground mt-1 capitalize">{slot}: recorded {formatTime(log.completed_at)}{log.completed_by ? ` by ${log.completed_by}` : ""}{log.photo_url ? " · proof photo" : ""}</p>;
              })}
              {m.requires_photo && <p className="text-[10px] text-amber-600 mt-2">A proof photo is required before each dose can be recorded.</p>}
            </div>
          ))}
          {archived.length > 0 && (
            <div>
              <button onClick={() => setShowHistory((s) => !s)} className="text-[11px] text-muted-foreground hover:text-foreground font-semibold">
                {showHistory ? "Hide" : "Show"} archived ({archived.length})
              </button>
              {showHistory && (
                <div className="space-y-1.5 mt-2">
                  {archived.map((m) => (
                    <div key={m.id} className="rounded-lg p-2.5 flex items-center justify-between bg-muted">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">{m.medication_name}</p>
                        <p className="text-[10px] text-muted-foreground/70">{fmtShort(m.start_date)}{m.end_date ? ` → ${fmtShort(m.end_date)}` : ""}</p>
                      </div>
                      {canWrite && <button onClick={() => { if (window.confirm("Delete this medication?")) remove.mutate(m.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <input ref={proofInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleProofUpload} />
      <MedicationDialog open={dialog} onOpenChange={setDialog} item={editing} onSave={handleSave} />
    </SectionCard>
  );
}
