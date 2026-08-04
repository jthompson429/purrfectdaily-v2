import { useState } from "react";
import { ChevronDown, Pencil, Trash2, Plus, FileText, Image as ImageIcon, Syringe, ShieldPlus, Pill } from "lucide-react";
import { fmtDate } from "@/utils/petCare";

const VISIT_LABEL = { wellness: "Wellness", sick_visit: "Sick Visit", vaccination: "Vaccination", surgery: "Surgery", dental: "Dental", emergency: "Emergency", follow_up: "Follow-up", other: "Other" };
const VAC_LABEL = (v) => v.name === "custom" ? (v.custom_name || "Custom Vaccine") : v.name.toUpperCase();

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default function VisitCard({ visit, onEdit, onDelete, onAddMeds, onOpenAttachment }) {
  const [expanded, setExpanded] = useState(false);
  const upcoming = visit.date && new Date(visit.date) > new Date(new Date().toDateString());
  const status = upcoming ? "Upcoming" : "Completed";
  const statusColor = upcoming ? "text-blue-500" : "text-green-500";

  const vaccs = visit.vaccinations_given || [];
  const prevs = visit.preventives_administered || [];
  const meds = visit.medications_prescribed || [];
  const atts = visit.attachments || [];
  const showAddMeds = meds.length > 0 && !visit.meds_added;

  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border">
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <button onClick={() => setExpanded((e) => !e)} className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">{visit.reason || "Vet visit"}</p>
              <span className={`text-[10px] font-bold ${statusColor} bg-muted px-1.5 rounded`}>· {status}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(visit.date)}{visit.clinic ? ` · ${visit.clinic}` : ""}{visit.veterinarian ? ` · ${visit.veterinarian}` : ""}</p>
            {visit.visit_type && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{VISIT_LABEL[visit.visit_type]}</p>}
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setExpanded((e) => !e)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted border border-border">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            <button onClick={onEdit} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted border border-border"><Pencil className="h-3 w-3" /></button>
            <button onClick={onDelete} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive bg-muted border border-border"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-border">
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            <Field label="Reason" value={visit.reason} />
            <Field label="Diagnosis" value={visit.diagnosis} />
            <Field label="Treatments Performed" value={visit.treatment} />
            <Field label="Follow-up Instructions" value={visit.follow_up_instructions} />
            <Field label="Notes" value={visit.notes} />
          </div>

          {(vaccs.length > 0 || prevs.length > 0 || meds.length > 0) && (
            <div className="grid grid-cols-1 gap-2 pt-1">
              {vaccs.length > 0 && (
                <div className="flex items-start gap-2">
                  <Syringe className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/70"><span className="text-muted-foreground">Vaccines: </span>{vaccs.map(VAC_LABEL).join(", ")}</p>
                </div>
              )}
              {prevs.length > 0 && (
                <div className="flex items-start gap-2">
                  <ShieldPlus className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/70"><span className="text-muted-foreground">Preventives: </span>{prevs.map((p) => p.name).join(", ")}</p>
                </div>
              )}
              {meds.length > 0 && (
                <div className="flex items-start gap-2">
                  <Pill className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/70"><span className="text-muted-foreground">Prescribed: </span>{meds.map((m) => `${m.name} (${(m.frequency || "").replace("_", " ")})`).join(", ")}</p>
                </div>
              )}
            </div>
          )}

          {showAddMeds && (
            <button onClick={onAddMeds} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-yellow-600 bg-yellow-500/10 border border-dashed border-yellow-500/40">
              <Plus className="h-3.5 w-3.5" /> Add {meds.length} prescribed medication{meds.length > 1 ? "s" : ""} to active meds
            </button>
          )}

          {atts.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Attachments</p>
              <div className="grid grid-cols-2 gap-2">
                {atts.map((a, i) => (
                  <button key={i} onClick={() => onOpenAttachment(a)} className="flex items-center gap-2 rounded-lg p-2 text-left hover:bg-muted/50 transition-colors bg-muted border border-border">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
                      {a.type === "image" ? <ImageIcon className="h-3.5 w-3.5 text-primary" /> : <FileText className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-xs text-foreground/70 truncate">{a.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}