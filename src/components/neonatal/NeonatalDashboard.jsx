import { useState, useEffect } from "react";
import { feedingStatus, formatTime, timeAgo, isToday, weightTrend, feedingSummary, formatCountdown } from "@/utils/neonatal";
import KittenStatusCard from "@/components/neonatal/KittenStatusCard";
import KittenCareSummarySheet from "@/components/neonatal/KittenCareSummarySheet";
import RecommendedFeedingCard from "@/components/neonatal/RecommendedFeedingCard";

const TONE = {
  green: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "text-green-500" },
  yellow: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "text-yellow-500" },
  orange: { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", text: "text-orange-500" },
  red: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "text-destructive" },
  muted: { bg: "hsl(var(--muted))", border: "hsl(var(--border))", text: "text-muted-foreground" },
};

function StatCard({ label, value, sub, subColor }) {
  return (
    <div className="rounded-2xl p-3 bg-card border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-lg font-black text-foreground mt-0.5">{value}</p>
      {sub && <p className={`text-[11px] font-semibold ${subColor || "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

export default function NeonatalDashboard({ kitten, feedings, weights, eliminations, motherLogs, onLogCare, onGenerateReport }) {
  const [now, setNow] = useState(Date.now());
  const [summaryOpen, setSummaryOpen] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sortDesc = (a, b) => new Date(b.date_time) - new Date(a.date_time);
  const f = [...feedings].sort(sortDesc);
  const w = [...weights].sort(sortDesc);
  const e = [...eliminations].sort(sortDesc);
  const m = [...motherLogs].sort(sortDesc);

  const trend = weightTrend(weights);
  const summary = feedingSummary(feedings);
  const currentWeight = trend.hasData ? trend.latest : (kitten?.current_weight_g ?? null);
  const lastFeeding = f[0] || null;
  const status = feedingStatus(lastFeeding?.date_time, kitten?.feeding_interval_hours);
  const tone = TONE[status.tone];
  const countdown = status.due ? status.due.getTime() - now : null;
  const lastPee = e.find((x) => x.urinated) || null;
  const lastPoop = e.find((x) => x.defecated) || null;
  const motherToday = m.find((x) => isToday(x.date_time)) || null;

  return (
    <div className="space-y-3">
      <KittenStatusCard lastFeeding={lastFeeding} trend={trend} now={now} feedingInterval={kitten?.feeding_interval_hours} onOpen={() => setSummaryOpen(true)} />

      <RecommendedFeedingCard
        weight={currentWeight}
        fedTodayMl={summary.totalKmr}
        lastFeeding={lastFeeding}
        nursingObserved={motherToday?.nursing_observed === "yes"}
        intervalHours={kitten?.feeding_interval_hours}
        now={now}
      />

      {/* Feeding status with countdown */}
      <div className="rounded-2xl p-4" style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Feeding Status</p>
            <p className={`text-2xl font-black ${tone.text}`}>{status.label}</p>
            {countdown !== null && <p className={`text-sm font-bold ${tone.text}`}>{formatCountdown(countdown)}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Last Feeding</p>
            <p className="text-sm font-bold text-foreground">{lastFeeding ? timeAgo(lastFeeding.date_time) : "—"}</p>
            {status.due && <p className="text-[11px] text-muted-foreground">Due {formatTime(status.due.toISOString())}</p>}
          </div>
        </div>
      </div>

      {/* Weight trend */}
      <div className="rounded-2xl p-4 bg-card border border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Weight Trend</p>
        <div className="flex items-end gap-2 mt-1">
          <p className="text-3xl font-black text-foreground">{currentWeight != null ? `${currentWeight} g` : "—"}</p>
          {trend.hasData && !trend.isFirst && (
            <p className={`text-sm font-bold mb-1 ${trend.change >= 0 ? "text-green-500" : "text-red-500"}`}>
              {trend.change >= 0 ? "↑" : "↓"} {trend.change >= 0 ? "+" : ""}{trend.change.toFixed(1)} g since last
            </p>
          )}
        </div>
        {trend.hasData && trend.isFirst && <p className="text-xs text-muted-foreground mt-0.5">First recorded weight</p>}
        {trend.hasData && trend.avgDaily != null && (
          <p className={`text-xs font-semibold mt-1 ${trend.avgDaily >= 0 ? "text-green-500" : "text-red-500"}`}>
            Avg: {trend.avgDaily >= 0 ? "+" : ""}{trend.avgDaily.toFixed(1)} g/day
          </p>
        )}
      </div>

      {/* Today's progress */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Feedings Today" value={summary.count} />
        <StatCard label="KMR Today" value={`${summary.totalKmr} mL`} />
        <StatCard label="Last Pee" value={lastPee ? timeAgo(lastPee.date_time) : "—"} sub={lastPee ? (lastPee.mom_assisted ? "mom assisted" : "stimulated") : ""} />
        <StatCard label="Last Poop" value={lastPoop ? timeAgo(lastPoop.date_time) : "—"} sub={lastPoop ? (lastPoop.mom_assisted ? "mom assisted" : "stimulated") : ""} />
      </div>

      {/* Feeding summary */}
      <div className="rounded-2xl p-3 bg-card border border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Today's Feeding Summary</p>
        <div className="grid grid-cols-2 gap-y-1.5 text-xs">
          <span className="text-muted-foreground">Total KMR: <b className="text-foreground">{summary.totalKmr} mL</b></span>
          <span className="text-muted-foreground">Feedings: <b className="text-foreground">{summary.count}</b></span>
          <span className="text-muted-foreground">Avg/feeding: <b className="text-foreground">{summary.avgMl.toFixed(1)} mL</b></span>
          <span className="text-muted-foreground">Longest: <b className="text-foreground">{summary.longest != null ? `${summary.longest.toFixed(1)}h` : "—"}</b></span>
          <span className="text-muted-foreground">Shortest: <b className="text-foreground">{summary.shortest != null ? `${summary.shortest.toFixed(1)}h` : "—"}</b></span>
        </div>
      </div>

      {/* Mother cat */}
      <div className="rounded-2xl p-3 bg-card border border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Mother Cat — Today</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className={motherToday?.ate ? "text-green-500 font-semibold" : "text-muted-foreground"}>🍽️ Ate: {motherToday ? (motherToday.ate ? "Yes" : "No") : "—"}</span>
          <span className={motherToday?.drank_water ? "text-green-500 font-semibold" : "text-muted-foreground"}>💧 Drank: {motherToday ? (motherToday.drank_water ? "Yes" : "No") : "—"}</span>
          <span className="text-muted-foreground">🐱 Nursing: {motherToday ? motherToday.nursing_observed : "—"}</span>
        </div>
      </div>

      <KittenCareSummarySheet
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        kitten={kitten}
        feedings={feedings}
        weights={weights}
        eliminations={eliminations}
        motherLogs={motherLogs}
        onLogCare={onLogCare}
        onGenerateReport={onGenerateReport}
      />
    </div>
  );
}