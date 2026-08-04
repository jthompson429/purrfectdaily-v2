import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function RewardToast({ reward, onDismiss }) {
  useEffect(() => {
    if (reward) {
      const t = setTimeout(onDismiss, 3500);
      return () => clearTimeout(t);
    }
  }, [reward]);

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          key="reward"
          initial={{ opacity: 0, y: 60, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="glass-strong rounded-2xl px-5 py-3 flex items-center gap-3 glow-purple">
            <div className="h-8 w-8 rounded-xl gradient-purple flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/50 font-medium">Mission Complete!</p>
              <p className="text-white font-bold text-sm">+{reward.xp} XP Earned</p>
            </div>
            <span className="text-2xl">{reward.emoji}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}