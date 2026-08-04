import { computePetBadges } from "@/utils/petStatus";
import StatusBadge from "./StatusBadge";
import { isMedicationActive, vaccinationStatus, preventativeStatus, fmtShort } from "@/utils/petCare";

function Info({ label, value, color }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className={`text-xs font-semibold ${color || "text-foreground/80"}`}>{value || "—"}</p>
    </div>
  );
}

export default function CareStatusCard({ pet, preventatives, vaccinations, medications, vetVisits }) {
  const badges = computePetBadges(pet, preventatives, vaccinations, medications);
  const activeMeds = medications.filter(isMedicationActive);
  const rabies = vaccinations.find((v) => v.name === "rabies");
  const rabiesSt = rabies ? vaccinationStatus(rabies) : null;
  const rabiesText = rabiesSt ? rabiesSt.label : "Not recorded";
  const rabiesColor = rabiesSt ? (rabiesSt.color === "green" ? "text-green-500" : rabiesSt.color === "yellow" ? "text-yellow-500" : rabiesSt.color === "red" ? "text-red-500" : "text-muted-foreground") : "text-muted-foreground";

  const lastPrev = preventatives[0];
  const lastPrevSt = lastPrev ? preventativeStatus(lastPrev) : null;
  const nextDue = lastPrevSt?.next ? fmtShort(lastPrevSt.next) : "—";

  const today = new Date(new Date().toDateString());
  const upcoming = [...vetVisits]
    .filter((v) => v.date && new Date(v.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const apptText = upcoming ? `${fmtShort(upcoming.date)}${upcoming.clinic ? ` · ${upcoming.clinic}` : ""}` : "No appointments scheduled";

  return (
    <div className="rounded-2xl p-4 bg-primary/10 border border-primary/25">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🐾</span>
        <p className="text-lg font-black text-foreground">{pet.name}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {badges.map((b) => <StatusBadge key={b.key} badge={b} />)}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Info label="Last Preventative" value={lastPrev ? `${lastPrev.name} · ${fmtShort(lastPrev.date_given)}` : "—"} />
        <Info label="Next Due" value={nextDue} color={lastPrevSt && lastPrevSt.color === "red" ? "text-red-500" : lastPrevSt && lastPrevSt.color === "yellow" ? "text-yellow-500" : "text-foreground/80"} />
        <Info label="Rabies" value={rabiesText} color={rabiesColor} />
        <Info label="Active Meds" value={activeMeds.length ? activeMeds.map((m) => m.medication_name).join(", ") : "None"} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2.5 pt-2.5 border-t border-border">📅 {apptText}</p>
    </div>
  );
}