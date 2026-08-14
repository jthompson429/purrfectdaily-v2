import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatTime } from "@/lib/dateUtils";
import { taskAssignmentType, ASSIGNMENT_ICON } from "@/utils/assignment";

const CATEGORY_EMOJI = {
  feeding: "🍖", medication: "💊", water: "💧", litter: "🗑️",
  hygiene: "🧼", quarantine: "⚠️", house_check: "🏠", other: "⭐",
};

const TIME_LABELS = {
  morning: "Morning", afternoon: "Afternoon", evening: "Evening", bedtime: "Bedtime", anytime: "Anytime",
};

const EXCEPTION_REASONS = [
  ["pet_unavailable", "Pet unavailable"],
  ["pet_refused", "Pet refused"],
  ["supplies_missing", "Supplies missing"],
  ["health_concern", "Health concern"],
  ["unsafe", "Could not do safely"],
  ["other", "Other"],
];
const EXCEPTION_LABELS = Object.fromEntries(EXCEPTION_REASONS);

export default function CareTaskCard({ task, log, onComplete, onReport }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(log?.photo_url || null);
  const [notes, setNotes] = useState(log?.notes || "");
  const [showNotes, setShowNotes] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportPhoto, setReportPhoto] = useState(null);
  const [reportUploading, setReportUploading] = useState(false);
  const fileRef = useRef();
  const reportFileRef = useRef();

  const isDone = log?.status === "done";
  const isSkipped = log?.status === "skipped";
  const isCritical = task.care_type === "critical_medical" || task.priority === "critical";
  const needsPhoto = task.requires_photo && !photoUrl;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const handleReportPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReportUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setReportPhoto(file_url);
    setReportUploading(false);
  };

  const handleComplete = () => {
    if (task.requires_photo && !photoUrl) return;
    onComplete(task, { photo_url: photoUrl, notes, status: "done" });
  };

  const handleSubmitReport = async () => {
    if (!reportReason || (reportReason === "other" && !reportNotes.trim())) return;
    setSubmittingReport(true);
    try {
      await onReport(task, { exception_reason: reportReason, notes: reportNotes.trim(), photo_url: reportPhoto || "", status: "skipped" });
      setReportMode(false);
      setReportReason("");
      setReportNotes("");
      setReportPhoto(null);
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="relative rounded-2xl overflow-hidden mb-3 border"
      style={{
        background: isDone
          ? "rgba(16,185,129,0.08)"
          : isSkipped
            ? "hsl(var(--muted))"
            : isCritical
              ? "rgba(239,68,68,0.08)"
              : "hsl(var(--card))",
        borderColor: isDone
          ? "rgba(16,185,129,0.3)"
          : isSkipped
            ? "hsl(var(--border))"
            : isCritical
              ? "rgba(239,68,68,0.3)"
              : "hsl(var(--border))",
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: isCritical ? "rgba(239,68,68,0.15)" : "hsl(var(--muted))" }}>
            {CATEGORY_EMOJI[task.category] || "⭐"}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {isCritical && !isDone && !isSkipped && (
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-destructive">
                      {task.care_type === "critical_medical" ? "Critical Medical" : "Critical"}
                    </span>
                  </div>
                )}
                <p className={`font-semibold text-sm leading-snug ${isDone || isSkipped ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    {ASSIGNMENT_ICON[taskAssignmentType(task)]}
                  </span>
                  {task.scheduled_time && task.scheduled_time !== "anytime" && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />{TIME_LABELS[task.scheduled_time]}
                    </span>
                  )}
                  {task.requires_photo && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${photoUrl ? "text-green-500" : "text-yellow-500"}`}>
                      <Camera className="h-2.5 w-2.5" />
                      {photoUrl ? "Proof ✓" : "Proof Required"}
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle expand */}
              {(task.instructions || task.warning_text) && (
                <button onClick={() => setExpanded(!expanded)}
                  className="flex-shrink-0 h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {/* Warning text */}
            {task.warning_text && !isDone && !isSkipped && (
              <div className="mt-2 px-2.5 py-2 rounded-xl text-xs text-orange-600 bg-orange-500/10 border border-orange-500/20">
                ⚠️ {task.warning_text}
              </div>
            )}
          </div>
        </div>

        {/* Expanded instructions */}
        {expanded && task.instructions && (
          <div className="mt-3 px-3 py-2.5 rounded-xl text-xs text-muted-foreground leading-relaxed bg-muted border border-border">
            📋 {task.instructions}
          </div>
        )}
        {expanded && task.proof_instructions && (
          <div className="mt-2 px-3 py-2 rounded-xl text-xs text-blue-600 bg-blue-500/10 border border-blue-500/20">
            📸 {task.proof_instructions}
          </div>
        )}

        {/* Done state */}
        {isDone && log && (
          <div className="mt-3 flex items-center gap-3">
            {log.photo_url && (
              <img src={log.photo_url} alt="Proof" className="w-14 h-14 rounded-xl object-cover ring-1 ring-green-500/30" />
            )}
            <div>
              <p className="text-xs text-green-500 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </p>
              {log.completed_at && (
                <p className="text-[10px] text-muted-foreground">{formatTime(log.completed_at)}</p>
              )}
              {log.notes && <p className="text-[10px] text-muted-foreground mt-0.5">"{log.notes}"</p>}
            </div>
          </div>
        )}

        {/* Reported/skipped state */}
        {isSkipped && (
          <div className="mt-2 px-2.5 py-2 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Couldn’t Complete
            </p>
            {log?.exception_reason && <p className="text-[10px] font-semibold text-foreground/80 mt-1">{EXCEPTION_LABELS[log.exception_reason] || log.exception_reason}</p>}
            {log?.notes && <p className="text-[10px] text-muted-foreground mt-0.5">"{log.notes}"</p>}
            {log?.photo_url && (
              <img src={log.photo_url} alt="Attached context" className="w-12 h-12 rounded-xl object-cover mt-2 ring-1 ring-destructive/30" />
            )}
          </div>
        )}

        {/* Actions for incomplete tasks */}
        {!isDone && !isSkipped && !reportMode && (
          <div className="mt-3 space-y-2">
            {/* Photo upload */}
            {task.requires_photo && (
              <div>
                {photoUrl ? (
                  <div className="flex items-center gap-2">
                    <img src={photoUrl} alt="Proof" className="w-12 h-12 rounded-xl object-cover ring-1 ring-primary/30" />
                    <div>
                      <p className="text-xs text-green-500 font-medium">📸 Photo uploaded</p>
                      <button onClick={() => setPhotoUrl(null)} className="text-[10px] text-muted-foreground hover:text-destructive">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all bg-yellow-500/10 border border-dashed border-yellow-500/40 text-yellow-600"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {uploading ? "Uploading..." : "Upload Proof Photo — Required"}
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
              </div>
            )}



            {/* Action buttons */}
            <div className="flex gap-2">
              {/* All tasks: Report Problem */}
              <button
                onClick={() => setReportMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0 bg-destructive/10 border border-destructive/20 text-destructive"
              >
                <AlertCircle className="h-3 w-3" /> Couldn’t Complete
              </button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleComplete}
                disabled={needsPhoto}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-primary-foreground transition-all"
                style={{
                  background: needsPhoto
                    ? "hsl(var(--muted))"
                    : isCritical
                      ? "linear-gradient(135deg, #dc2626, #7209B7)"
                      : "hsl(var(--primary))",
                  opacity: needsPhoto ? 0.5 : 1,
                  cursor: needsPhoto ? "not-allowed" : "pointer",
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {needsPhoto ? "Photo Required" : "Mark Complete"}
              </motion.button>
            </div>
          </div>
        )}

        {/* Couldn’t Complete workflow */}
        <AnimatePresence>
          {reportMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="px-3 py-3 rounded-xl space-y-3 bg-destructive/10 border border-destructive/20">
                <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Why couldn’t this task be completed?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {EXCEPTION_REASONS.map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setReportReason(value)} className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold text-left border transition-colors ${reportReason === value ? "bg-destructive/15 border-destructive/40 text-destructive" : "bg-background border-border text-muted-foreground"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportNotes}
                  onChange={e => setReportNotes(e.target.value)}
                  placeholder={reportReason === "other" ? "Add details (required)" : "Add helpful details (optional)" }
                  className="w-full px-3 py-2 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 resize-none h-20 bg-background border border-destructive/30"
                />

                {/* Optional photo for report */}
                {reportPhoto ? (
                  <div className="flex items-center gap-2">
                    <img src={reportPhoto} alt="Attached context" className="w-10 h-10 rounded-xl object-cover ring-1 ring-destructive/30" />
                    <div>
                      <p className="text-[10px] text-destructive font-medium">Photo attached</p>
                      <button onClick={() => setReportPhoto(null)} className="text-[10px] text-muted-foreground hover:text-destructive">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => reportFileRef.current?.click()}
                    disabled={reportUploading}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-all"
                  >
                    {reportUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    {reportUploading ? "Uploading..." : "+ Attach photo (optional)"}
                  </button>
                )}
                <input ref={reportFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReportPhotoUpload} />

                <div className="flex gap-2">
                  <button
                    onClick={() => { setReportMode(false); setReportReason(""); setReportNotes(""); setReportPhoto(null); }}
                    disabled={submittingReport}
                    className="flex-1 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-all bg-muted border border-border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={!reportReason || (reportReason === "other" && !reportNotes.trim()) || submittingReport}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-foreground transition-all"
                    style={{
                      background: reportReason && (reportReason !== "other" || reportNotes.trim()) ? "linear-gradient(135deg, #dc2626, #7209B7)" : "hsl(var(--muted))",
                      opacity: reportReason && (reportReason !== "other" || reportNotes.trim()) ? 1 : 0.5,
                    }}
                  >
                    {submittingReport ? "Saving…" : "Save Reason"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}