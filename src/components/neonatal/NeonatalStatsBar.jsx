import { AlertTriangle, Clock, Timer, TrendingUp, TrendingDown, Cat, Eye } from "lucide-react";

function StatTile({ icon: Icon, label, value, color = "text-foreground", bg = "bg-card", border = "border-border" }) {
  return (
    <div className={`rounded-2xl p-2.5 ${bg} ${border} border flex flex-col items-center text-center min-w-[68px]`}>
      <Icon className={`h-4 w-4 ${color} mb-1`} />
      <p className="text-lg font-black text-foreground leading-none">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mt-1 leading-tight">{label}</p>
    </div>
  );
}

export default function NeonatalStatsBar({ stats }) {
  if (!stats) return null;

  return (
    <div className="rounded-2xl p-3 bg-card border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2.5">Neonatal Overview</p>
      <div className="grid grid-cols-4 gap-2">
        <StatTile icon={Cat} label="Active" value={stats.totalActive} color="text-primary" />
        <StatTile icon={Timer} label="Due Now" value={stats.feedingsDueNow} color="text-orange-500" />
        <StatTile icon={Clock} label="Due Soon" value={stats.feedingsDueSoon} color="text-yellow-500" />
        <StatTile icon={AlertTriangle} label="Overdue" value={stats.overdue} color="text-destructive" />
        <StatTile icon={Eye} label="No Wt Today" value={stats.noWeightToday} color="text-yellow-500" />
        <StatTile icon={TrendingUp} label="Gained" value={stats.weightGains} color="text-green-500" />
        <StatTile icon={TrendingDown} label="Lost" value={stats.weightLosses} color="text-destructive" />
        <StatTile icon={AlertTriangle} label="Attn" value={stats.needsAttention} color="text-yellow-500" />
      </div>
    </div>
  );
}