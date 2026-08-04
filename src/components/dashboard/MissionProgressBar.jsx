import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

export default function MissionProgressBar({ total, done, xpEarned }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    if (pct === 100 && total > 0) {
      setShowReward(true);
      const t = setTimeout(() => setShowReward(false), 3000);
      return () => clearTimeout(t);
    }
  }, [pct, total]);

  return (
    <div className="glass rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-0.5">Mission Progress</p>
          <p className="text-white font-bold text-lg leading-none">
            {done}<span className="text-white/30 font-normal text-sm"> / {total} missions</span>
          </p>
        </div>
        <AnimatePresence>
          {showReward ? (
            <motion.div
              key="reward"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-gold text-white text-xs font-bold"
            >
              <Trophy className="h-3.5 w-3.5" />
              ALL DONE!
            </motion.div>
          ) : (
            <div className="flex items-center gap-1 text-purple-400 text-sm font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              +{xpEarned} XP
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bar */}
      <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full gradient-purple"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {/* Shimmer */}
        {pct > 0 && pct < 100 && (
          <motion.div
            className="absolute inset-y-0 w-12 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)", left: `${pct}%` }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-white/30">0%</span>
        <span className="text-[10px] text-purple-400 font-semibold">{pct}% complete</span>
        <span className="text-[10px] text-white/30">100%</span>
      </div>
    </div>
  );
}