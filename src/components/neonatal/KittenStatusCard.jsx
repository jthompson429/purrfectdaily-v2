import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { kittenStatus, kittenStatusLine } from "@/utils/neonatal";

const TONE = {
  green: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
  yellow: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  red: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  gray: { bg: "hsl(var(--muted))", border: "hsl(var(--border))" },
};

const DOT = {
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  gray: "#94a3b8",
};

export default function KittenStatusCard({ lastFeeding, trend, now, feedingInterval, onOpen }) {
  const status = kittenStatus({ lastFeeding, trend, now, feedingInterval });
  const line = kittenStatusLine(status, { lastFeeding });
  const tone = TONE[status.color];

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="w-full rounded-2xl p-4 flex items-center gap-3 text-left"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        transition: "background 300ms ease, border-color 300ms ease",
      }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: DOT[status.color], transition: "background 300ms ease" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">🐾 Kitten Status</p>
        <p className="text-sm font-semibold text-foreground/80 mt-0.5">{line}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </motion.button>
  );
}