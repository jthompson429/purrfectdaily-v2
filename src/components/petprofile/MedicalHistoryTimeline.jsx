import { Activity } from "lucide-react";
import { buildMedicalHistory, fmtDate } from "@/utils/petCare";

const KIND_STYLE = {
  preventative: { dot: "bg-blue-400", label: "Preventative", text: "text-blue-500" },
  vaccination: { dot: "bg-primary", label: "Vaccination", text: "text-primary" },
  visit: { dot: "bg-orange-400", label: "Vet Visit", text: "text-orange-500" },
  medication: { dot: "bg-yellow-400", label: "Medication", text: "text-yellow-600" }
};

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
          {events.slice(0, 30).map((event) => {
            const style = KIND_STYLE[event.kind] || { dot: "bg-muted-foreground/40", label: "Record", text: "text-muted-foreground" };
            return (
              <div key={event.id} className="relative">
                <span className={`absolute -left-[13px] top-1.5 w-2 h-2 rounded-full ${style.dot}`} />
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-foreground">{event.title}</p>
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${style.text}`}>{style.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{fmtDate(event.date)}{event.detail ? ` · ${event.detail}` : ""}</p>
                {event.summary && <p className="text-[11px] text-foreground/60 mt-0.5 leading-relaxed">{event.summary}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}