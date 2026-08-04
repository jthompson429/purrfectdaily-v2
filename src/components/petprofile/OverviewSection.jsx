import { Pencil } from "lucide-react";
import { formatBirthDate, formatAge } from "@/utils/pet";

const SPECIES_LABEL = { cat: "Cat", dog: "Dog", rabbit: "Rabbit", bird: "Bird", other: "Other" };
const SEX_LABEL = { male: "Male", female: "Female", unknown: "Unknown" };
const SITUATION = { indoor: "Indoor", outdoor: "Outdoor", foster: "Foster" };

function Row({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-sm text-foreground/80">{value || "—"}</p>
    </div>
  );
}

export default function OverviewSection({ pet, onEdit }) {
  const spayed = pet.spayed_neutered === "yes" ? "Yes" : pet.spayed_neutered === "no" ? "No" : "Unknown";
  const weight = pet.latest_weight != null && pet.latest_weight !== ""
    ? `${pet.latest_weight} ${pet.profile_type === "neonatal" ? "g" : "kg"}`
    : "—";

  return (
    <div className="rounded-2xl p-4 bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Overview</h3>
        <button onClick={onEdit} className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 px-2 py-1 rounded-lg bg-primary/10">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Row label="Species" value={SPECIES_LABEL[pet.species]} />
        <Row label="Breed" value={pet.breed} />
        <Row label="Sex" value={SEX_LABEL[pet.sex]} />
        <Row label="Birthday" value={pet.birth_date ? `${formatBirthDate(pet.birth_date)} (${formatAge(pet.birth_date)})` : "—"} />
        <Row label="Color / Markings" value={pet.color_markings} />
        <Row label="Microchip" value={pet.microchip_number} />
        <Row label="Spayed / Neutered" value={spayed} />
        <Row label="Living Situation" value={SITUATION[pet.living_situation]} />
        <Row label="Current Weight" value={weight} />
      </div>
      {(pet.body_condition_notes || pet.owner_foster_notes || pet.description) && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {pet.body_condition_notes && <Row label="Body Condition Notes" value={pet.body_condition_notes} />}
          {pet.owner_foster_notes && <Row label="Owner / Foster Notes" value={pet.owner_foster_notes} />}
          {pet.description && <Row label="Description" value={pet.description} />}
        </div>
      )}
    </div>
  );
}