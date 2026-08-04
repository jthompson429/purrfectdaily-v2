import { motion } from "framer-motion";
import { AlertTriangle, Trophy, CheckCircle2 } from "lucide-react";

export default function DailyProgressHeader({ total, done, criticalTotal, criticalDone }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const criticalRemaining = criticalTotal - criticalDone;
  const allDone = done === total && total > 0;

  return (
    <div className="sticky top-0 z-30 pt-safe">
      <div className="glass-strong rounded-2xl p-4 mb-4 border border-border">

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Mission Control</p>
            <p className="text-foreground font-bold text-xl leading-none font-heading">
              {allDone ? "Daily Care Complete ✓" : (
                <span>Today's Care <span className="text-muted-foreground font-normal text-base">— {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span></span>
              )}
            </p>
          </div>
          {allDone ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white gradient-green"
            >
              <Trophy className="h-3.5 w-3.5" /> Done!
            </motion.div>
          ) : criticalRemaining > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-destructive/20 border border-destructive/40">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-destructive">{criticalRemaining} Critical</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/15 border border-primary/30">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">{done}/{total}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 rounded-full overflow-hidden bg-muted">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">{done} done</span>
          <span className="text-[10px] font-semibold text-primary">{pct}% complete</span>
          <span className="text-[10px] text-muted-foreground">{total - done} left</span>
        </div>
      </div>
    </div>
  );
}