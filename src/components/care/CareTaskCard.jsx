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

export default function CareTaskCard({ task, log, onComplete, onReport }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(log?.photo_url || null);
  const [notes, setNotes] = useState(log?.notes || "");
  const [showNotes, setShowNotes] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [reportNotes, setReportNotes] = useState("");
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

  const handleSubmitReport = () => {
    if (!reportNotes.trim()) return;
    onReport(task, { notes: reportNotes, photo_url: reportPhoto || "", status: "skipped" });
    setReportMode(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="relative rounded-2xl overflow-hidden mb-3"
      style={{
        background: isDone
          ? "rgba(16,185,129,0.06)"
          : isSkipped
            ? "rgba(255,255,255,0.03)"
            : isCritical
              ? "rgba(239,68,68,0.07)"
              : "rgba(255,255,255,0.04)",
        border: isDone
          ? "1px solid rgba(16,185,129,0.2)"
          : isSkipped
            ? "1px solid rgba(255,255,255,0.06)"
            : isCritical
              ? "1px solid rgba(239,68,68,0.25)"
              : "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: isCritical ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)" }}>
            {CATEGORY_EMOJI[task.category] || "⭐"}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {isCritical && !isDone && !isSkipped && (
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">
                      {task.care_type === "critical_medical" ? "Critical Medical" : "Critical"}
                    </span>
                  </div>
                )}
                <p className={`font-semibold text-sm leading-snug ${isDone || isSkipped ? "text-white/40 line-through" : "text-white"}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-0.5 text-[10px] text-white/30">
                    {ASSIGNMENT_ICON[taskAssignmentType(task)]}
                  </span>
                  {task.scheduled_time && task.scheduled_time !== "anytime" && (
                    <span className="flex items-center gap-0.5 text-[10px] text-white/30">
                      <Clock className="h-2.5 w-2.5" />{TIME_LABELS[task.scheduled_time]}
                    </span>
                  )}
                  {task.requires_photo && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${photoUrl ? "text-green-400" : "text-yellow-400"}`}>
                      <Camera className="h-2.5 w-2.5" />
                      {photoUrl ? "Proof ✓" : "Proof Required"}
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle expand */}
              {(task.instructions || task.warning_text) && (
                <button onClick={() => setExpanded(!expanded)}
                  className="flex-shrink-0 h-6 w-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 transition-all">
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {/* Warning text */}
            {task.warning_text && !isDone && !isSkipped && (
              <div className="mt-2 px-2.5 py-2 rounded-xl text-xs text-orange-300"
                style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)" }}>
                ⚠️ {task.warning_text}
              </div>
            )}
          </div>
        </div>

        {/* Expanded instructions */}
        {expanded && task.instructions && (
          <div className="mt-3 px-3 py-2.5 rounded-xl text-xs text-white/60 leading-relaxed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            📋 {task.instructions}
          </div>
        )}
        {expanded && task.proof_instructions && (
          <div className="mt-2 px-3 py-2 rounded-xl text-xs text-blue-300"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            📸 {task.proof_instructions}
          </div>
        )}

        {/* Done state */}
        {isDone && log && (
          <div className="mt-3 flex items-center gap-3">
            {log.photo_url && (
              <img src={log.photo_url} alt="Proof" className="w-14 h-14 rounded-xl object-cover ring-1 ring-green-400/30" />
            )}
            <div>
              <p className="text-xs text-green-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </p>
              {log.completed_at && (
                <p className="text-[10px] text-white/30">{formatTime(log.completed_at)}</p>
              )}
              {log.notes && <p className="text-[10px] text-white/40 mt-0.5">"{log.notes}"</p>}
            </div>
          </div>
        )}

        {/* Reported/skipped state */}
        {isSkipped && (
          <div className="mt-2 px-2.5 py-2 rounded-xl"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-xs text-red-300 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Problem Reported
            </p>
            {log?.notes && <p className="text-[10px] text-white/40 mt-0.5">"{log.notes}"</p>}
            {log?.photo_url && (
              <img src={log.photo_url} alt="Evidence" className="w-12 h-12 rounded-xl object-cover mt-2 ring-1 ring-red-400/30" />
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
                    <img src={photoUrl} alt="Proof" className="w-12 h-12 rounded-xl object-cover ring-1 ring-purple-400/30" />
                    <div>
                      <p className="text-xs text-green-400 font-medium">📸 Photo uploaded</p>
                      <button onClick={() => setPhotoUrl(null)} className="text-[10px] text-white/30 hover:text-red-400">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: "rgba(234,179,8,0.1)", border: "1px dashed rgba(234,179,8,0.4)", color: "#fbbf24" }}
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
              >
                <AlertCircle className="h-3 w-3" /> Report Problem
              </button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleComplete}
                disabled={needsPhoto}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{
                  background: needsPhoto
                    ? "rgba(255,255,255,0.05)"
                    : isCritical
                      ? "linear-gradient(135deg, #dc2626, #9333ea)"
                      : "linear-gradient(135deg, #7c3aed, #3b82f6)",
                  opacity: needsPhoto ? 0.5 : 1,
                  cursor: needsPhoto ? "not-allowed" : "pointer",
                  boxShadow: needsPhoto ? "none" : "0 0 20px rgba(124,58,237,0.3)",
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {needsPhoto ? "Photo Required" : "Mark Complete"}
              </motion.button>
            </div>
          </div>
        )}

        {/* Report Problem mode (critical only) */}
        <AnimatePresence>
          {reportMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="px-3 py-3 rounded-xl space-y-3"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Report Problem — describe what happened
                </p>
                <textarea
                  value={reportNotes}
                  onChange={e => setReportNotes(e.target.value)}
                  placeholder="What happened? (required)"
                  className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder:text-white/30 resize-none h-20"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(239,68,68,0.3)" }}
                />

                {/* Optional photo for report */}
                {reportPhoto ? (
                  <div className="flex items-center gap-2">
                    <img src={reportPhoto} alt="Evidence" className="w-10 h-10 rounded-xl object-cover ring-1 ring-red-400/30" />
                    <div>
                      <p className="text-[10px] text-red-300 font-medium">Photo attached</p>
                      <button onClick={() => setReportPhoto(null)} className="text-[10px] text-white/30 hover:text-red-400">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => reportFileRef.current?.click()}
                    disabled={reportUploading}
                    className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/50 transition-all"
                  >
                    {reportUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    {reportUploading ? "Uploading..." : "+ Attach photo (optional)"}
                  </button>
                )}
                <input ref={reportFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReportPhotoUpload} />

                <div className="flex gap-2">
                  <button
                    onClick={() => { setReportMode(false); setReportNotes(""); setReportPhoto(null); }}
                    className="flex-1 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/60 transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={!reportNotes.trim()}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all"
                    style={{
                      background: reportNotes.trim() ? "linear-gradient(135deg, #dc2626, #7c3aed)" : "rgba(255,255,255,0.05)",
                      opacity: reportNotes.trim() ? 1 : 0.5,
                    }}
                  >
                    Submit Report
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