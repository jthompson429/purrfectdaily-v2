import { motion } from "framer-motion";
import { Flame, Star, Zap, Shield, ChevronRight } from "lucide-react";

const LEVEL_TITLES = ["Rookie", "Cadet", "Scout", "Guardian", "Champion", "Legend"];
const SPECIES_EMOJI = { cat: "🐱", dog: "🐶", rabbit: "🐰", bird: "🐦", other: "🐾" };

function CircularProgress({ value, size = 80, strokeWidth = 6, color = "url(#purpleGrad)" }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const id = `grad-${Math.random().toString(36).slice(2)}`;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={`url(#${id})`} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
    </svg>
  );
}

export default function PetProfileCard({ pet, missionCount, doneCount }) {
  if (!pet) return null;

  const levelTitle = LEVEL_TITLES[Math.min(pet.level - 1, LEVEL_TITLES.length - 1)] || "Rookie";
  const xpToNext = pet.level * 500;
  const xpProgress = Math.min(((pet.total_xp % xpToNext) / xpToNext) * 100, 100);
  const completionRate = missionCount > 0 ? Math.round((doneCount / missionCount) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-strong rounded-2xl p-5 mb-6 relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 gradient-purple blur-3xl pointer-events-none" />

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-purple-500/40">
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full gradient-purple-soft flex items-center justify-center text-3xl">
                {SPECIES_EMOJI[pet.species] || "🐾"}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full gradient-purple flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background">
            {pet.level}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-white leading-none">{pet.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full gradient-purple-soft text-purple-300 font-medium">{levelTitle}</span>
          </div>
          {pet.breed && <p className="text-xs text-white/40 mt-0.5">{pet.breed}</p>}
          {/* XP Bar */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">XP Progress</span>
              <span className="text-[10px] text-purple-400 font-semibold">{pet.total_xp} / {xpToNext}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-purple"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Stats pill */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className="relative flex items-center justify-center">
            <CircularProgress value={completionRate} size={64} strokeWidth={5} />
            <span className="absolute text-sm font-bold text-white">{completionRate}%</span>
          </div>
          <span className="text-[10px] text-white/40">Today</span>
        </div>
      </div>

      {/* Bottom stat row */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-orange-400" />
          <div>
            <p className="text-xs font-bold text-white">{pet.streak_days}d</p>
            <p className="text-[10px] text-white/40">Streak</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-yellow-400" />
          <div>
            <p className="text-xs font-bold text-white">{pet.approval_rating}%</p>
            <p className="text-[10px] text-white/40">Approval</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-blue-400" />
          <div>
            <p className="text-xs font-bold text-white">{pet.total_xp}</p>
            <p className="text-[10px] text-white/40">Total XP</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}