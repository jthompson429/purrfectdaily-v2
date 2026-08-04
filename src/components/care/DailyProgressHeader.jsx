import { motion } from "framer-motion";
import { AlertTriangle, Trophy, CheckCircle2 } from "lucide-react";

export default function DailyProgressHeader({ total, done, criticalTotal, criticalDone }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const criticalRemaining = criticalTotal - criticalDone;
  const allDone = done === total && total > 0;

  return (
    <div className="sticky top-0 z-30 pt-safe">
      <div className="glass-strong rounded-2xl p-4 mb-4"
        style={{ background: "rgba(15,17,23,0.92)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Mission Control</p>
            <p className="text-white font-bold text-xl leading-none">
              {allDone ? "Daily Care Complete ✓" : (
                <span>Today's Care <span className="text-white/40 font-normal text-base">— {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span></span>
              )}
            </p>
          </div>
          {allDone ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)" }}
            >
              <Trophy className="h-3.5 w-3.5" /> Done!
            </motion.div>
          ) : criticalRemaining > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)" }}>
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-red-300">{criticalRemaining} Critical</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-purple-300">{done}/{total}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ background: allDone
              ? "linear-gradient(90deg, #10b981, #06b6d4)"
              : "linear-gradient(90deg, #7c3aed, #3b82f6)" }}
          />
        </div>

        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-white/30">{done} done</span>
          <span className="text-[10px] font-semibold" style={{ color: allDone ? "#10b981" : "#a78bfa" }}>{pct}% complete</span>
          <span className="text-[10px] text-white/30">{total - done} left</span>
        </div>
      </div>
    </div>
  );
}