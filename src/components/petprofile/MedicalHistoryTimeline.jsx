import { Activity } from "lucide-react";
import { buildMedicalHistory, fmtDate } from "@/utils/petCare";

const KIND_DOT = { preventative: "bg-blue-400", vaccination: "bg-purple-400", visit: "bg-orange-400", medication: "bg-yellow-400" };

export default function MedicalHistoryTimeline({ preventatives, vaccinations, vetVisits, medications }) {
  const events = buildMedicalHistory(preventatives, vaccinations, vetVisits, medications);
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Medical History</h3>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-white/40 text-center py-3">No medical history yet</p>
      ) : (
        <div className="relative pl-4 space-y-3">
          <div className="absolute left-1 top-1.5 bottom-1.5 w-px bg-white/10" />
          {events.slice(0, 30).map((e, i) => (
            <div key={i} className="relative">
              <span className={`absolute -left-[13px] top-1.5 w-2 h-2 rounded-full ${KIND_DOT[e.kind] || "bg-white/40"}`} />
              <p className="text-xs font-semibold text-white">{e.title}</p>
              <p className="text-[11px] text-white/40">{fmtDate(e.date)}{e.detail ? ` · ${e.detail}` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}