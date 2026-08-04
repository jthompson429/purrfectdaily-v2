import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Plus, FileText } from "lucide-react";
import {
  formatTime,
  weightTrend,
  feedingSummary,
  isToday,
  kittenStatus,
  kittenStatusLine,
  formatDurationShort,
} from "@/utils/neonatal";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const DOT = {
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  gray: "#94a3b8",
};

function Row({ label, value, sub }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <div className="text-right">
        <p className="text-sm font-semibold text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl p-3 mt-3 bg-card border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{title}</p>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export default function KittenCareSummarySheet({
  open,
  onOpenChange,
  kitten,
  feedings,
  weights,
  eliminations,
  motherLogs,
  onLogCare,
  onGenerateReport,
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  const sortDesc = (a, b) => new Date(b.date_time) - new Date(a.date_time);
  const f = [...feedings].sort(sortDesc);
  const w = [...weights].sort(sortDesc);
  const e = [...eliminations].sort(sortDesc);
  const m = [...motherLogs].sort(sortDesc);

  const trend = weightTrend(weights);
  const summary = feedingSummary(feedings);
  const currentWeight = trend.hasData ? trend.latest : kitten?.current_weight_g ?? null;
  const previousWeight =
    trend.hasData && !trend.isFirst
      ? w[1].weight_g
      : trend.hasData
      ? trend.latest
      : kitten?.current_weight_g ?? null;
  const todayChange = trend.hasData && !trend.isFirst ? trend.change : 0;
  const lastFeeding = f[0] || null;
  const lastPee = e.find((x) => x.urinated) || null;
  const lastPoop = e.find((x) => x.defecated) || null;
  const motherToday = m.find((x) => isToday(x.date_time)) || null;
  const nextDue = lastFeeding ? new Date(lastFeeding.date_time).getTime() + 2 * 60 * 60 * 1000 : null;
  const remaining = nextDue ? nextDue - now : null;

  const status = kittenStatus({ lastFeeding, trend, now });
  const line = kittenStatusLine(status, { lastFeeding });

  const events = [
    ...feedings.map((x) => ({ time: x.date_time, type: "Feeding", detail: `${x.amount_ml || 0} mL via ${x.method}` })),
    ...weights.map((x) => ({ time: x.date_time, type: "Weight", detail: `${x.weight_g} g` })),
    ...eliminations.map((x) => ({
      time: x.date_time,
      type: x.urinated && x.defecated ? "Pee & Poop" : x.urinated ? "Urinated" : x.defecated ? "Defecated" : "Elimination",
      detail: "",
    })),
    ...motherLogs.map((x) => ({ time: x.date_time, type: "Mother", detail: x.behavior_notes || x.food_notes || "" })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);

  const handleLogCare = () => {
    onOpenChange(false);
    setTimeout(() => onLogCare?.(), 250);
  };
  const handleReport = () => {
    onOpenChange(false);
    onGenerateReport?.();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg mx-auto rounded-t-3xl bg-background">
        <DrawerHeader className="text-center">
          <DrawerTitle className="text-foreground font-black text-lg font-heading">🐾 Kitten Care Summary</DrawerTitle>
          <DrawerDescription className="text-muted-foreground text-xs">
            Current status and recent care activity
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: "72vh" }}>
          <div className="rounded-2xl p-3 mt-1 flex items-center gap-2 bg-card border border-border">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DOT[status.color] }} />
            <p className="text-xs font-semibold text-foreground/80">{line}</p>
          </div>

          <Section title="Current Status">
            <Row label="Current Weight" value={currentWeight != null ? `${currentWeight} g` : "—"} />
            <Row
              label="Previous Weight"
              value={previousWeight != null ? `${previousWeight} g` : "—"}
              sub={trend.isFirst ? "First recorded weight" : undefined}
            />
            <Row label="Today's Weight Change" value={`${todayChange >= 0 ? "+" : ""}${todayChange.toFixed(0)} g`} />
            <Row label="Expected Daily Gain" value="10–15 g/day" sub="reference only" />
          </Section>

          <Section title="Feeding">
            <Row
              label="Last Feeding"
              value={lastFeeding ? `${lastFeeding.amount_ml || 0} mL` : "—"}
              sub={lastFeeding ? `${cap(lastFeeding.method)} · ${formatTime(lastFeeding.date_time)}` : undefined}
            />
            <Row label="Next Feeding" value={nextDue ? formatTime(new Date(nextDue).toISOString()) : "—"} />
            <Row
              label="Time Remaining"
              value={remaining == null ? "—" : remaining > 0 ? formatDurationShort(remaining) : "Overdue"}
            />
            <Row label="Feedings Today" value={summary.count} />
            <Row label="Total KMR Today" value={`${summary.totalKmr} mL`} />
            <Row label="Average Feeding" value={`${summary.avgMl.toFixed(2)} mL`} />
          </Section>

          <Section title="Elimination">
            <Row label="Last Pee" value={lastPee ? formatTime(lastPee.date_time) : "None recorded"} />
            <Row label="Last Poop" value={lastPoop ? formatTime(lastPoop.date_time) : "None recorded"} />
          </Section>

          <Section title="Mother">
            <Row label="Mother Ate" value={motherToday ? (motherToday.ate ? "Yes" : "No") : "—"} />
            <Row label="Mother Drank" value={motherToday ? (motherToday.drank_water ? "Yes" : "No") : "—"} />
            <Row label="Nursing Observed" value={motherToday ? cap(motherToday.nursing_observed) : "—"} />
            <Row
              label="Latest Mother Note"
              value={motherToday ? (motherToday.behavior_notes || motherToday.food_notes || "—") : "—"}
            />
          </Section>

          <Section title="Recent Activity">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No events logged yet</p>
            ) : (
              <div className="pt-1">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5">
                    <span className="text-[10px] text-muted-foreground w-16 pt-0.5 flex-shrink-0">{formatTime(ev.time)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{ev.type}</p>
                      {ev.detail && <p className="text-[11px] text-muted-foreground truncate">{ev.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div className="space-y-2 mt-4">
            <button
              onClick={handleLogCare}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-primary-foreground bg-primary"
            >
              <Plus className="h-4 w-4" /> Log Care
            </button>
            <button
              onClick={handleReport}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-foreground/80 bg-card border border-border"
            >
              <FileText className="h-4 w-4" /> Generate Foster Report
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}