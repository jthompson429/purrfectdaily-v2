import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, Camera, ChevronRight, CheckCircle2, Pencil, Trash2, Flame, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_CONFIG = {
  feeding:  { emoji: "🍖", color: "text-orange-400",  bg: "bg-orange-400/10" },
  grooming: { emoji: "✂️",  color: "text-pink-400",    bg: "bg-pink-400/10" },
  health:   { emoji: "💊", color: "text-red-400",     bg: "bg-red-400/10" },
  play:     { emoji: "🎾", color: "text-yellow-400",  bg: "bg-yellow-400/10" },
  hygiene:  { emoji: "🚿", color: "text-blue-400",    bg: "bg-blue-400/10" },
  other:    { emoji: "⭐", color: "text-purple-400",  bg: "bg-purple-400/10" },
};

const PRIORITY_CONFIG = {
  critical: { label: "CRITICAL", color: "text-red-400",    bg: "bg-red-400/15",    icon: AlertTriangle },
  high:     { label: "HIGH",     color: "text-orange-400", bg: "bg-orange-400/15", icon: Shield },
  normal:   { label: "NORMAL",   color: "text-blue-400",   bg: "bg-blue-400/15",   icon: null },
};

function CompletionBurst() {
  return (
    <motion.div
      className="absolute inset-0 rounded-2xl pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.6 }}
      style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.3) 0%, transparent 70%)" }}
    />
  );
}

export default function MissionCard({ task, onToggleStatus, onEdit, onDelete }) {
  const isDone = task.status === "done";
  const [burst, setBurst] = useState(false);

  const cat = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.other;
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
  const PriIcon = pri.icon;

  const handleToggle = async () => {
    if (!isDone) setBurst(true);
    await onToggleStatus(task);
    setTimeout(() => setBurst(false), 700);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative"
    >
      {burst && <CompletionBurst />}

      <div className={`relative rounded-2xl p-4 transition-all duration-300 overflow-hidden ${
        isDone
          ? "bg-white/2 border border-white/5"
          : "glass border border-white/8 hover:border-purple-500/30"
      }`}>
        {/* Done overlay stripe */}
        {isDone && (
          <div className="absolute inset-0 rounded-2xl opacity-10"
            style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(124,58,237,0.3) 10px, rgba(124,58,237,0.3) 11px)" }} />
        )}

        <div className="flex items-start gap-3 relative">
          {/* Category icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center text-lg`}>
            {cat.emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {task.priority !== "normal" && (
                    <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md ${pri.color} ${pri.bg} flex items-center gap-1`}>
                      {PriIcon && <PriIcon className="h-2.5 w-2.5" />}
                      {pri.label}
                    </span>
                  )}
                </div>
                <p className={`font-semibold text-sm leading-snug ${isDone ? "line-through text-white/30" : "text-white"}`}>
                  {task.title}
                </p>
                {task.notes && (
                  <p className={`text-xs mt-1 leading-relaxed ${isDone ? "text-white/20" : "text-white/40"}`}>
                    {task.notes}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {task.time_to_complete && (
                    <span className="flex items-center gap-1 text-[10px] text-white/40">
                      <Clock className="h-3 w-3" />{task.time_to_complete}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-[10px] font-semibold ${isDone ? "text-white/30" : "text-purple-400"}`}>
                    <Zap className="h-3 w-3" />+{task.xp_reward || 50} XP
                  </span>
                  {task.requires_photo && (
                    <span className={`flex items-center gap-1 text-[10px] ${task.completion_photo ? "text-green-400" : "text-yellow-400"}`}>
                      <Camera className="h-3 w-3" />
                      {task.completion_photo ? "Proof ✓" : "Proof req."}
                    </span>
                  )}
                  {task.streak_count > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-orange-400">
                      <Flame className="h-3 w-3" />{task.streak_count}d streak
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(task)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDelete(task)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {/* Complete button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={handleToggle}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isDone
                      ? "bg-white/5 text-white/30 hover:bg-white/10"
                      : "gradient-purple text-white glow-purple"
                  }`}
                >
                  {isDone ? (
                    <>↩ Undo</>
                  ) : (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Complete</>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}