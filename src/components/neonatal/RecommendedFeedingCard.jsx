import { useState } from "react";
import { Info } from "lucide-react";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { formatTime, formatDurationShort, FEEDING_INTERVAL_HOURS, FEEDINGS_PER_DAY } from "@/utils/neonatal";

// Feeding interval is shared with the status calculations in utils/neonatal.
const ACTIVE_INTERVAL = {
  label: "3 times a day",
  feedingsPerDay: FEEDINGS_PER_DAY,
  hours: FEEDING_INTERVAL_HOURS,
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function RecommendedFeedingCard({ weight, fedTodayMl, lastFeeding, nursingObserved, now = Date.now() }) {
  const [infoOpen, setInfoOpen] = useState(false);

  const hasWeight = weight != null && weight > 0;
  // Full precision kept internally; only display values are rounded.
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
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-bold text-white">🍼 Recommended Feeding</p>
        <Drawer open={infoOpen} onOpenChange={setInfoOpen}>
          <DrawerTrigger asChild>
            <button type="button" className="text-white/40 hover:text-white/70 transition-colors" aria-label="How recommended feeding works">
              <Info className="h-4 w-4" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-w-lg mx-auto rounded-t-3xl" style={{ background: "#0f1117" }}>
            <DrawerHeader className="text-center">
              <DrawerTitle className="text-white font-black text-lg">How Recommended Feeding Works</DrawerTitle>
              <DrawerDescription className="text-white/40 text-xs">Informational guidance, not medical advice</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto space-y-3 text-sm text-white/70" style={{ maxHeight: "70vh" }}>
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
              <p className="text-white/40">This feature does not diagnose illness or replace veterinary care.</p>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Large primary value */}
      <p className="text-4xl font-black text-white leading-none">
        {perFeeding != null ? perFeeding.toFixed(1) : "—"}{" "}
        <span className="text-lg text-white/40 font-semibold">mL / feeding</span>
      </p>
      <p className="text-xs text-white/40 mt-1.5">
        Based on latest weight: <b className="text-white/70">{hasWeight ? `${weight} g` : "—"}</b>
      </p>

      {/* Schedule + Daily target */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Schedule</p>
          <p className="text-sm font-bold text-white">{ACTIVE_INTERVAL.label}</p>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Daily Target</p>
          <p className="text-sm font-bold text-white">{dailyTarget != null ? `${dailyTarget.toFixed(1)} mL` : "—"}</p>
        </div>
      </div>

      {/* Today's progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
            {nursingObserved ? "Bottle/Syringe Formula Today" : "Today's Formula"}
          </p>
          <p className="text-xs font-bold text-white">
            {dailyTarget != null ? `${fedToday.toFixed(1)} / ${dailyTarget.toFixed(1)} mL` : `${fedToday.toFixed(1)} mL`}
          </p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 gap-2">
          <p className="text-[10px] text-white/30 font-semibold">{Math.round(pct)}%</p>
          {nursingObserved && (
            <p className="text-[10px] text-yellow-400/80 font-semibold text-right">
              Supplement estimate only. Mother nursing observed.
            </p>
          )}
        </div>
      </div>

      {/* Last feeding + next due */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Last Feeding</p>
            <p className="text-sm font-bold text-white">{lastFeeding ? `${(lastFeeding.amount_ml || 0).toFixed(1)} mL` : "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white/70">{lastFeeding ? cap(lastFeeding.method) : "—"}</p>
            <p className="text-[11px] text-white/40">{lastFeeding ? formatTime(lastFeeding.date_time) : "—"}</p>
          </div>
        </div>
        {nextText && (
          <p className={`text-[11px] font-semibold mt-2 ${nextOverdue ? "text-red-400" : "text-green-400"}`}>{nextText}</p>
        )}
      </div>

      <p className="text-[10px] text-white/30 mt-3">Guidance only.</p>
    </div>
  );
}