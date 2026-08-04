import { Droplet, Scale, Droplets, Cat } from "lucide-react";
import { formatDateTime, timeAgo } from "@/utils/neonatal";

export default function ActivityList({ feedings, weights, eliminations, motherLogs }) {
  const items = [
    ...feedings.map((f) => ({
      time: f.date_time,
      type: "feeding",
      icon: Droplet,
      color: "#3b82f6",
      title: `Feeding · ${f.method} · ${f.amount_ml || 0} mL`,
      sub: `nursing ${f.nursing_observed} · suck ${f.suck_strength}${f.notes ? " · " + f.notes : ""}`,
    })),
    ...weights.map((w) => ({
      time: w.date_time,
      type: "weight",
      icon: Scale,
      color: "#a78bfa",
      title: `Weight · ${w.weight_g} g`,
      sub: w.notes || "",
    })),
    ...eliminations.map((e) => ({
      time: e.date_time,
      type: "elimination",
      icon: Droplets,
      color: "#10b981",
      title: `Elimination · ${[e.urinated && "pee", e.defecated && "poop"].filter(Boolean).join(" / ") || "none"}`,
      sub: `${e.stimulated_by_human ? "stimulated" : "not stim"} · ${e.mom_assisted ? "mom" : "no mom"}${e.notes ? " · " + e.notes : ""}`,
    })),
    ...motherLogs.map((m) => ({
      time: m.date_time,
      type: "mother",
      icon: Cat,
      color: "#f59e0b",
      title: `Mother · ate ${m.ate ? "yes" : "no"} · drank ${m.drank_water ? "yes" : "no"}`,
      sub: `nursing ${m.nursing_observed}${m.food_notes ? " · " + m.food_notes : ""}${m.behavior_notes ? " · " + m.behavior_notes : ""}`,
    })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 30);

  if (items.length === 0) {
    return <p className="text-center text-white/30 text-sm py-8">No events logged yet</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <div key={i} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Icon className="h-4 w-4" style={{ color: it.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{it.title}</p>
              {it.sub && <p className="text-xs text-white/40 truncate">{it.sub}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-white/50">{timeAgo(it.time)}</p>
              <p className="text-[10px] text-white/25">{formatDateTime(it.time)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}