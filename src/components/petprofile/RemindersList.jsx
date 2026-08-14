import { Bell } from "lucide-react";
import { buildReminders } from "@/utils/petCare";

export default function RemindersList({ pet, preventatives, vaccinations, medications, weightLogs, vetVisits }) {
  const reminders = buildReminders(pet, preventatives, vaccinations, medications, weightLogs, vetVisits);
  return (
    <div className="rounded-2xl p-4 bg-card border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Reminders</h3>
      </div>
      {reminders.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">All caught up 🎉</p>
      ) : (
        <div className="space-y-1.5">
          {reminders.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.urgency <= 1 ? "bg-red-400" : r.urgency <= 2 ? "bg-yellow-400" : "bg-muted-foreground/40"}`} />
              <span className="text-foreground/80">{r.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}