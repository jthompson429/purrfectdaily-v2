import { useState } from "react";
import { Info } from "lucide-react";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { formatTime, formatDurationShort, FEEDING_INTERVAL_HOURS, FEEDINGS_PER_DAY } from "@/utils/neonatal";

const ACTIVE_INTERVAL = {
  label: "3 times a day",
  feedingsPerDay: FEEDINGS_PER_DAY,
  hours: FEEDING_INTERVAL_HOURS,
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function RecommendedFeedingCard({ weight, fedTodayMl, lastFeeding, nursingObserved, now = Date.now() }) {
  const [infoOpen, setInfoOpen] = useState(false);

  const hasWeight = weight != null && weight > 0;
  const dailyTarget = hasWeight ? weight * 0.30 : null;
  const perFeeding = dailyTarget != null ? dailyTarget / ACTIVE_INTERVAL.feedingsPerDay : null;

  const fedToday = fedTodayMl || 0;
  const pct = dailyTarget && dailyTarget > 0 ? Math.min(100, (fedToday / dailyTarget) * 100) : 0;

  let nextText = null;
  let nextOverdue = false;
  if (lastFeeding?.date_time) {
    const due = new Date(lastFeeding.date_time).getTime() + ACTIVE_INTERVAL.hours * 60 * 60 * 1000;
    const delta = due - now;
    if (delta < 0) {
      nextOverdue = true;
      nextText = `Next feeding overdue by ${formatDurationShort(delta)}`;
    } else {
      nextText = `Next feeding in ${formatDurationShort(delta)}`;
    }
  }

  return (
    <div className="rounded-2xl p-4 bg-card border border-border">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-bold text-foreground">🍼 Recommended Feeding</p>
        <Drawer open={infoOpen} onOpenChange={setInfoOpen}>
          <DrawerTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="How recommended feeding works">
              <Info className="h-4 w-4" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-w-lg mx-auto rounded-t-3xl bg-background">
            <DrawerHeader className="text-center">
              <DrawerTitle className="text-foreground font-black text-lg font-heading">How Recommended Feeding Works</DrawerTitle>
              <DrawerDescription className="text-muted-foreground text-xs">Informational guidance, not medical advice</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto space-y-3 text-sm text-foreground/70" style={{ maxHeight: "70vh" }}>
              <p>
                The recommendation is calculated from the kitten's latest recorded weight using the general
                guideline of approximately 30 mL of kitten formula per 100 g of body weight per day.
              </p>
              <p>The app assumes feedings 3 times a day (every {FEEDING_INTERVAL_HOURS} hours).</p>
              <p>This recommendation is intended as a starting point only.</p>
              <p>
                If the kitten is nursing from its mother or your veterinarian recommends a different feeding plan,
                always follow veterinary guidance.
              </p>
              <p className="text-muted-foreground">This feature does not diagnose illness or replace veterinary care.</p>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Large primary value */}
      <p className="text-4xl font-black text-foreground leading-none font-heading">
        {perFeeding != null ? perFeeding.toFixed(1) : "—"}{" "}
        <span className="text-lg text-muted-foreground font-semibold">mL / feeding</span>
      </p>
      <p className="text-xs text-muted-foreground mt-1.5">
        Based on latest weight: <b className="text-foreground/70">{hasWeight ? `${weight} g` : "—"}</b>
      </p>

      {/* Schedule + Daily target */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-xl p-2.5 bg-muted">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Schedule</p>
          <p className="text-sm font-bold text-foreground">{ACTIVE_INTERVAL.label}</p>
        </div>
        <div className="rounded-xl p-2.5 bg-muted">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Daily Target</p>
          <p className="text-sm font-bold text-foreground">{dailyTarget != null ? `${dailyTarget.toFixed(1)} mL` : "—"}</p>
        </div>
      </div>

      {/* Today's progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            {nursingObserved ? "Bottle/Syringe Formula Today" : "Today's Formula"}
          </p>
          <p className="text-xs font-bold text-foreground">
            {dailyTarget != null ? `${fedToday.toFixed(1)} / ${dailyTarget.toFixed(1)} mL` : `${fedToday.toFixed(1)} mL`}
          </p>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500 bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 gap-2">
          <p className="text-[10px] text-muted-foreground font-semibold">{Math.round(pct)}%</p>
          {nursingObserved && (
            <p className="text-[10px] text-yellow-600 font-semibold text-right">
              Supplement estimate only. Mother nursing observed.
            </p>
          )}
        </div>
      </div>

      {/* Last feeding + next due */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Last Feeding</p>
            <p className="text-sm font-bold text-foreground">{lastFeeding ? `${(lastFeeding.amount_ml || 0).toFixed(1)} mL` : "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground/70">{lastFeeding ? cap(lastFeeding.method) : "—"}</p>
            <p className="text-[11px] text-muted-foreground">{lastFeeding ? formatTime(lastFeeding.date_time) : "—"}</p>
          </div>
        </div>
        {nextText && (
          <p className={`text-[11px] font-semibold mt-2 ${nextOverdue ? "text-destructive" : "text-green-500"}`}>{nextText}</p>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3">Guidance only.</p>
    </div>
  );
}