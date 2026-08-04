import { AlertTriangle } from "lucide-react";

export default function MedOffWarningCard({ med }) {
  return (
    <div className="rounded-2xl p-4 mb-3"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.3)",
        backdropFilter: "blur(20px)",
      }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{ background: "rgba(239,68,68,0.15)" }}>
          🚫
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">OFF-WEEK — Do Not Give</span>
          </div>
          <p className="text-white font-semibold text-sm">{med.medication_name}</p>
          {med.off_week_warning && (
            <p className="text-red-300 text-xs mt-1 leading-relaxed">{med.off_week_warning}</p>
          )}
          {med.dosage_instructions && (
            <p className="text-white/40 text-xs mt-1">Normal dose: {med.dosage_instructions}</p>
          )}
          <div className="mt-2 px-2.5 py-2 rounded-xl"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-red-300 text-xs font-bold">⛔ DO NOT GIVE {med.medication_name.toUpperCase()} TODAY</p>
            <p className="text-red-400/60 text-[10px] mt-0.5">This is an off-week in the treatment cycle. Resume next scheduled week.</p>
          </div>
        </div>
      </div>
    </div>
  );
}