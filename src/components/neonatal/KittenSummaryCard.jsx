import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { timeAgo, formatCountdown, formatWeightChange } from "@/utils/neonatal";

const STATUS_STYLES = {
  green: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", dot: "#22c55e", text: "text-green-600" },
  yellow: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", dot: "#f59e0b", text: "text-yellow-600" },
  red: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", dot: "#ef4444", text: "text-destructive" },
  gray: { bg: "hsl(var(--muted))", border: "hsl(var(--border))", dot: "#94a3b8", text: "text-muted-foreground" },
};

const METHOD_LABELS = {
  syringe: "Syringe",
  bottle: "Bottle",
  nursing: "Nursing",
  mixed: "Mixed",
};

export default function KittenSummaryCard({ summary, now }) {
  const style = STATUS_STYLES[summary.statusColor] || STATUS_STYLES.gray;
  const { kitten, currentWeight, weightChange, lastFeeding, feedingStatus, feedingMethod } = summary;
  const countdown = feedingStatus.due ? feedingStatus.due.getTime() - now : null;

  return (
    <Link to={`/neonatal/kitten/${kitten.id}`} className="block">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="rounded-2xl p-3 cursor-pointer text-left"
        style={{ background: style.bg, border: `1px solid ${style.border}` }}
      >
        {/* Header: photo + name + status */}
        <div className="flex items-center gap-2.5 mb-2">
          {kitten.photo_url ? (
            <img src={kitten.photo_url} alt={kitten.name} className="w-11 h-11 rounded-xl object-cover border border-border" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground font-bold text-sm">
              {kitten.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{kitten.name}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {summary.feedingsCount} feedings · {summary.weightsCount} weights
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
            <span className={style.text}>{summary.statusLabel}</span>
          </span>
        </div>

        {/* Weight + feeding info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-card/60 p-2 border border-border/50">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Weight</p>
            <p className="text-sm font-black text-foreground">{currentWeight != null ? `${currentWeight} g` : "—"}</p>
            {weightChange !== null && (
              <p className={`text-[11px] font-bold ${weightChange >= 0 ? "text-green-500" : "text-destructive"}`}>
                {formatWeightChange(weightChange)} since last
              </p>
            )}
          </div>
          <div className="rounded-xl bg-card/60 p-2 border border-border/50">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Last Feed</p>
            <p className="text-sm font-black text-foreground">{lastFeeding ? timeAgo(lastFeeding.date_time) : "—"}</p>
            {feedingMethod && <p className="text-[11px] font-semibold text-muted-foreground">{METHOD_LABELS[feedingMethod] || feedingMethod}</p>}
          </div>
        </div>

        {/* Next due */}
        {countdown !== null && (
          <div className="mt-2 flex items-center justify-between rounded-xl bg-card/40 px-2.5 py-1.5 border border-border/50">
            <span className="text-[11px] font-semibold text-muted-foreground">Next feeding</span>
            <span className={`text-xs font-black ${countdown < 0 ? "text-destructive" : style.text}`}>
              {formatCountdown(countdown)}
            </span>
          </div>
        )}
      </motion.div>
    </Link>
  );
}