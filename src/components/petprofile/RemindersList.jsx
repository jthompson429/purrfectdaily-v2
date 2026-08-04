import { Bell } from "lucide-react";
import { buildReminders } from "@/utils/petCare";

export default function RemindersList({ pet, preventatives, vaccinations, medications, weightLogs }) {
  const reminders = buildReminders(pet, preventatives, vaccinations, medications, weightLogs);
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reminders</h3>
      </div>
      {reminders.length === 0 ? (
        <p className="text-xs text-white/40 text-center py-3">All caught up 🎉</p>
      ) : (
        <div className="space-y-1.5">
          {reminders.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.urgency <= 1 ? "bg-red-400" : r.urgency <= 2 ? "bg-yellow-400" : "bg-white/30"}`} />
              <span className="text-white/80">{r.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}