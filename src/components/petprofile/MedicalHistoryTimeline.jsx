import { Activity } from "lucide-react";
import { buildMedicalHistory, fmtDate } from "@/utils/petCare";

const KIND_DOT = { preventative: "bg-blue-400", vaccination: "bg-primary", visit: "bg-orange-400", medication: "bg-yellow-400" };

export default function MedicalHistoryTimeline({ preventatives, vaccinations, vetVisits, medications }) {
  const events = buildMedicalHistory(preventatives, vaccinations, vetVisits, medications);
  return (
    <div className="rounded-2xl p-4 bg-card border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Medical History</h3>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No medical history yet</p>
      ) : (
        <div className="relative pl-4 space-y-3">
          <div className="absolute left-1 top-1.5 bottom-1.5 w-px bg-border" />
          {events.slice(0, 30).map((e, i) => (
            <div key={i} className="relative">
              <span className={`absolute -left-[13px] top-1.5 w-2 h-2 rounded-full ${KIND_DOT[e.kind] || "bg-muted-foreground/40"}`} />
              <p className="text-xs font-semibold text-foreground">{e.title}</p>
              <p className="text-[11px] text-muted-foreground">{fmtDate(e.date)}{e.detail ? ` · ${e.detail}` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}