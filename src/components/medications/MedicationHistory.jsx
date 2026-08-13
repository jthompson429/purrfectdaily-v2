import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { AlertCircle, Camera, CheckCircle2, FileClock, Filter, RotateCcw, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCorrectMedicationDose } from "@/lib/workspaceApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS = {
  done: { label: "Completed", icon: CheckCircle2, className: "text-green-600 bg-green-500/10 border-green-500/25" },
  skipped: { label: "Problem reported", icon: AlertCircle, className: "text-destructive bg-destructive/10 border-destructive/25" },
  not_applicable: { label: "Corrected", icon: XCircle, className: "text-muted-foreground bg-muted border-border" },
};

function dateLabel(value) {
  try { return format(parseISO(value), "MMM d, yyyy"); }
  catch { return value || "Unknown date"; }
}

function timeLabel(value) {
  try { return format(new Date(value), "h:mm a"); }
  catch { return ""; }
}

function relatedMedication(log, medications) {
  return medications.find((medication) => String(log.task_id || "").startsWith(`med_${medication.id}_`));
}

function dosePeriod(log, medication) {
  if (!medication) return "Dose";
  const suffix = String(log.task_id || "").slice(`med_${medication.id}_`.length);
  if (suffix.startsWith("as_needed")) return "As needed";
  if (suffix.startsWith("morning")) return "Morning";
  if (suffix.startsWith("afternoon")) return "Afternoon";
  if (suffix.startsWith("evening")) return "Evening";
  return "Dose";
}

function CorrectionDialog({ record, open, onOpenChange, onCorrect, saving }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const close = (nextOpen) => {
    if (!nextOpen) { setReason(""); setError(""); }
    onOpenChange(nextOpen);
  };
  const submit = async () => {
    if (reason.trim().length < 3) {
      setError("Enter a brief reason for the correction.");
      return;
    }
    setError("");
    try {
      await onCorrect(record, reason.trim());
      close(false);
    } catch (err) {
      setError(err?.message || "Could not correct this record.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md rounded-3xl border-border bg-background">
        <DialogHeader>
          <DialogTitle className="font-heading">Correct medication record</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This preserves the original administration details and marks the record as corrected. It does not delete history.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Correction reason</Label>
            <Textarea value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }} placeholder="e.g. Dose was marked complete for the wrong pet" className="h-24 resize-none rounded-xl bg-muted border-border" />
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => close(false)} className="rounded-xl">Cancel</Button>
          <Button type="button" onClick={submit} disabled={saving} className="rounded-xl">{saving ? "Correcting…" : "Mark as corrected"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MedicationHistory({ medications, pets }) {
  const { activeWorkspaceId, canWrite } = useWorkspace();
  const qc = useQueryClient();
  const [petFilter, setPetFilter] = useState("all");
  const [medFilter, setMedFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [correctionRecord, setCorrectionRecord] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["medicationHistory", activeWorkspaceId],
    queryFn: () => base44.entities.CompletionLog.filter({ workspace_id: activeWorkspaceId }, "-completion_date", 500),
  });

  const correction = useMutation({
    mutationFn: ({ id, reason }) => wsCorrectMedicationDose(id, reason, activeWorkspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medicationHistory", activeWorkspaceId] });
      qc.invalidateQueries({ queryKey: ["completionLogs"] });
    },
  });

  const records = useMemo(() => logs
    .map((log) => ({ log, medication: relatedMedication(log, medications) }))
    .filter(({ medication }) => Boolean(medication))
    .filter(({ log, medication }) => petFilter === "all" || log.pet_id === petFilter || medication.pet_id === petFilter)
    .filter(({ medication }) => medFilter === "all" || medication.id === medFilter)
    .filter(({ log }) => {
      if (statusFilter === "completed") return log.status === "done";
      if (statusFilter === "problem") return log.status === "skipped";
      if (statusFilter === "corrected") return log.status === "not_applicable";
      return true;
    })
    .filter(({ log }) => !fromDate || log.completion_date >= fromDate)
    .filter(({ log }) => !toDate || log.completion_date <= toDate)
    .sort((a, b) => {
      const dateOrder = String(b.log.completion_date).localeCompare(String(a.log.completion_date));
      if (dateOrder !== 0) return dateOrder;
      return new Date(b.log.completed_at) - new Date(a.log.completed_at);
    }), [logs, medications, petFilter, medFilter, statusFilter, fromDate, toDate]);

  const petName = (id) => pets.find((pet) => pet.id === id)?.name || "Unknown pet";
  const hasFilters = petFilter !== "all" || medFilter !== "all" || statusFilter !== "all" || fromDate || toDate;
  const resetFilters = () => {
    setPetFilter("all");
    setMedFilter("all");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <section className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <FileClock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black font-heading text-foreground">Administration History</h2>
          <p className="text-xs text-muted-foreground">Auditable dose, caregiver, proof, and correction records</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> Filters</p>
          {hasFilters && <button onClick={resetFilters} className="text-xs font-semibold text-primary">Clear</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={petFilter} onValueChange={setPetFilter}>
            <SelectTrigger className="rounded-xl bg-muted border-border"><SelectValue placeholder="All pets" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All pets</SelectItem>{pets.map((pet) => <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={medFilter} onValueChange={setMedFilter}>
            <SelectTrigger className="rounded-xl bg-muted border-border"><SelectValue placeholder="All medications" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All medications</SelectItem>{medications.map((medication) => <SelectItem key={medication.id} value={medication.id}>{medication.medication_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-xl bg-muted border-border"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="problem">Problem reported</SelectItem>
              <SelectItem value="corrected">Corrected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</Label><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-xl bg-muted border-border" /></div>
          <div><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</Label><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="rounded-xl bg-muted border-border" /></div>
        </div>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading administration history…</p>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted-foreground">{hasFilters ? "No records match these filters." : "No medication administrations have been recorded yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(({ log, medication }) => {
            const config = STATUS[log.status] || STATUS.done;
            const StatusIcon = config.icon;
            return (
              <article key={log.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  {log.photo_url ? (
                    <a href={log.photo_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                      <img src={log.photo_url} alt="Medication proof" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border" />
                    </a>
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0"><Camera className="h-4 w-4 text-muted-foreground/50" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-foreground">{medication.medication_name}</p>
                        <p className="text-xs text-muted-foreground">{petName(log.pet_id || medication.pet_id)} · {dosePeriod(log, medication)}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${config.className}`}><StatusIcon className="h-3 w-3" />{config.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{dateLabel(log.completion_date)}{log.completed_at ? ` at ${timeLabel(log.completed_at)}` : ""}{log.completed_by ? ` · ${log.completed_by}` : ""}</p>
                    {log.notes && <p className="text-xs text-foreground mt-2 rounded-lg bg-muted px-2.5 py-2">{log.notes}</p>}
                    {log.status === "not_applicable" && (
                      <div className="mt-2 rounded-lg bg-muted border border-border px-2.5 py-2">
                        <p className="text-xs font-semibold text-foreground">Correction: {log.correction_reason || "No reason recorded"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{log.corrected_at ? `${dateLabel(log.corrected_at.slice(0, 10))} at ${timeLabel(log.corrected_at)}` : ""}{log.corrected_by ? ` · ${log.corrected_by}` : ""}</p>
                      </div>
                    )}
                    {canWrite && log.status !== "not_applicable" && (
                      <button onClick={() => setCorrectionRecord(log)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                        <RotateCcw className="h-3 w-3" /> Correct this record
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CorrectionDialog
        record={correctionRecord}
        open={Boolean(correctionRecord)}
        onOpenChange={(open) => { if (!open) setCorrectionRecord(null); }}
        onCorrect={(record, reason) => correction.mutateAsync({ id: record.id, reason })}
        saving={correction.isPending}
      />
    </section>
  );
}
