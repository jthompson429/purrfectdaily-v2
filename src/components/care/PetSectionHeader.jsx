const CARE_LEVEL_CONFIG = {
  critical: { label: "CRITICAL CARE", color: "text-red-500", bg: "bg-red-500/15", border: "border-red-500/30" },
  special: { label: "SPECIAL CARE", color: "text-orange-500", bg: "bg-orange-500/15", border: "border-orange-500/30" },
  routine: { label: "ROUTINE", color: "text-blue-500", bg: "bg-blue-500/15", border: "border-blue-500/20" },
};

const SPECIES_EMOJI = { cat: "🐱", dog: "🐶", rabbit: "🐰", bird: "🐦", other: "🐾" };

export default function PetSectionHeader({ pet, taskCount, doneCount }) {
  const cl = CARE_LEVEL_CONFIG[pet.care_level] || CARE_LEVEL_CONFIG.routine;
  const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  return (
    <div className="flex items-center gap-3 mb-3 px-1">
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-xl overflow-hidden ring-1 ring-border">
          {pet.photo_url ? (
            <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl bg-primary/20">
              {SPECIES_EMOJI[pet.species] || "🐾"}
            </div>
          )}
        </div>
        {pet.quarantine_status && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-400 flex items-center justify-center text-[8px]">⚠️</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground text-base font-heading">{pet.name}</h3>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${cl.color} ${cl.bg} ${cl.border}`}>
            {cl.label}
          </span>
          {pet.quarantine_status && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border text-orange-500 bg-orange-500/10 border-orange-500/30">
              QUARANTINE
            </span>
          )}
        </div>
        {pet.description && <p className="text-xs text-muted-foreground truncate">{pet.description}</p>}
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold text-foreground">{doneCount}/{taskCount}</p>
        <p className="text-[10px] text-muted-foreground">{pct}%</p>
      </div>
    </div>
  );
}